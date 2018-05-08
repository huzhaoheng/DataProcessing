import os
from py2neo import Graph, authenticate
import json
import time
import pandas
from time import gmtime, strftime, localtime
import hashlib

class DataLoader(object):
	def __init__(self, graph, data, username, hashkey, structure, query_name, parameter_id):
		print (data)
		self.graph = graph
		self.data = data
		self.username = username
		self.hashkey = hashkey
		self.structure = structure
		self.query_name = query_name
		self.parameter_id = parameter_id
		self.curr_time = strftime("%a, %d %b %Y %H:%M:%S GMT", gmtime())
		self.edges = {'edges' : []}
		self.tx = self.graph.cypher.begin()

	def createLabel(self):
		self.graph.cypher.execute("CREATE CONSTRAINT ON (d:Data) ASSERT d.neo4j_id IS UNIQUE;")
		return

	def createEdges(self):
		query = "WITH {edges} as edges UNWIND edges.edges as e MATCH (s:Data{neo4j_id : e.source}), (t:Data{neo4j_id : e.target}) CREATE UNIQUE (s)-[:hasChild {name : e.name}]->(t)"
		self.graph.cypher.execute(query, edges = self.edges)

	def generateID(self, instance):
		sorted_keys = list(instance.keys())
		sorted_keys.sort()
		id_str = self.username
		for k in sorted_keys:
			v = instance[k]
			id_str += str(v)			
		neo4j_id = hashlib.md5(id_str.encode()).hexdigest()
		return neo4j_id

	def storeData(self):
		self.createLabel()
		nested_data = self.data['data']
		curr_path = "(a:QueryParameter {query_name : '" + self.query_name + "', system_user_username : '" + self.username + "', system_user_hashkey : '" + self.hashkey + "', parameter_id : '" + self.parameter_id + "'})"
		self.storeDataHelper(nested_data, curr_path)
		self.tx.commit()
		self.createEdges()

	def storeDataHelper(self, data, curr_path):
		instance = {}
		children_id = []
		for key, value in data.items():
			print (key)
			print (type(value))
			print (type(value) is dict)
			
			if type(value) is dict:
				instance = {}
				new_path = curr_path + "-[]->(:QueryObject {name : '" + key + "', query_name : '" + self.query_name + "', system_user_username : '" + self.username + "', system_user_hashkey : '" + self.hashkey + "', parameter_id : '" + self.parameter_id + "'})"
				child_id = self.storeDataHelper(value, new_path)
				print (child_id)
				if child_id:
					children_id.append((child_id, key))

			elif type(value) is list:
				if value:
					if type(value[0]) is dict:
						new_path = curr_path + "-[]->(:QueryObject {name : '" + key + "', query_name : '" + self.query_name + "', system_user_username : '" + self.username + "', system_user_hashkey : '" + self.hashkey + "', parameter_id : '" + self.parameter_id + "'})"
						for each in value:
							child_id = self.storeDataHelper(each, new_path)
							if child_id:
								children_id.append((child_id, key))

					elif type(value[0]) is list:
						pass

					else:
						instance[key] = value
						instance[key + "_type"] = type(value).__name__
	
				else:
					instance[key] = value
					instance[key + "_type"] = type(value).__name__

			else:
				instance[key] = value
				instance[key + "_type"] = type(value).__name__

		print ('------------------------------------------')
		if instance:
			neo4j_id = self.generateID(instance)
			query = "match p=" + curr_path + " with last(nodes(p)) as x merge (y:Data {"
			for k, v in instance.items():
				if type(v) == str:
					query += k + " : '" + v.replace("'", " ").replace('"', ' ') + "', "
				else:
					query += k + " : " + str(v) + ", "

			query += "system_user_username : '" + self.username + "', system_user_hashkey : '" + self.hashkey + "', neo4j_id : '" + neo4j_id + "'}) with x, y merge (x)-[:hasData]->(y);"
			# print (query)
			self.tx.append(query)
			for child_id, object_name in children_id:
				self.edges['edges'].append({'source' : neo4j_id, 'target' : child_id, 'name' : 'has' + object_name})
			return neo4j_id
		
		else:
			return None