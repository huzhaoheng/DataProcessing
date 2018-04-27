import os
from py2neo import Graph, authenticate
import json
import time

class DataLoader(object):
	def __init__(self, graph, nodes, edges, username, hashkey, repository, parameter_id):
		self.graph = graph
		self.nodes = nodes
		self.edges = edges
		self.username = username
		self.hashkey = hashkey
		self.repository = repository
		self.parameter_id = parameter_id


	def createLabel(self):
		self.graph.cypher.execute("CREATE CONSTRAINT ON (d:Data) ASSERT d.neo4j_id IS UNIQUE;")
		return

	def createNodes(self):
		tx = self.graph.cypher.begin()
		for instance in self.nodes['data']:
			keys = instance.keys()
			query = """
						WITH {instance} as i
						MERGE (d:Data {neo4j_id:i.internal_id}) ON CREATE
						SET 
					"""
			for key in keys:
				query += "d." + key + " = i." + key + ","
			query = query[:-1]
			tx.append(query, instance = instance)

		tx.commit()

		tx = self.graph.cypher.begin()
		query = "WITH {nodes} as nodes UNWIND nodes.data as i MATCH (a:Data {neo4j_id : i.internal_id, system_user_username : '" + self.username + "'}), (b:Repository {name : '" + self.repository + "', system_user_username :'" + self.username + "'}) CREATE UNIQUE (a)-[:InRepository]->(b);"
		tx.append(query, nodes = self.nodes)
		tx.commit()
		
		tx = self.graph.cypher.begin()
		query = "WITH {nodes} as nodes UNWIND nodes.data as i MATCH (a:Data {neo4j_id : i.internal_id, system_user_username : '" + self.username + "'}), (b:SubRepository {parent_repository_name : '" + self.repository + "', system_user_username : '" + self.username + "', parameter_id : '" + self.parameter_id + "'}) CREATE UNIQUE (a)-[:InSubRepository]->(b);"
		tx.append(query, nodes = self.nodes)
		tx.commit()

	def createEdges(self):
		query = "WITH {edges} as edges UNWIND edges.edges as e MATCH (s:Data{neo4j_id : e.source}), (t:Data{neo4j_id : e.target}) CREATE UNIQUE (s)-[:Relation {relation_name: e.relation, source_neo4j_id : e.source, target_neo4j_id : e.target, system_user_username: '" + self.username + "', system_user_hashkey: '" + self.hashkey + "'}]->(t)"
		self.graph.cypher.execute(query, edges = self.edges)

	def updateDataFlow(self):
		print ('storing data....')
		query = "MATCH (a:Repository {name : '" + self.repository + "', system_user_username :'" + self.username + "'}), (b:SubRepository {parent_repository_name : '" + self.repository + "', system_user_username : '" + self.username + "', parameter_id : '" + self.parameter_id + "'}) RETURN ID(a), ID(b);"
		result = self.graph.cypher.execute(query)
		sources = pandas.DataFrame(result.records, columns=result.columns).values.tolist()[0]
		ret = []
		while True:
			targets = []
			tx = self.graph.cypher.begin()
			for source in sources:
				query = "MATCH (n)-[:DataFlow]->(m) WHERE ID(n) = " + str(source) + " RETURN ID(m);"
				tx.append(query)
			result = tx.commit()
			for each in result:
				parsed = pandas.DataFrame(each.records, columns=each.columns).values.tolist()
				for every in parsed:
					targets.append(every[0])

			if not targets:
				break
			else:
				ret += targets
				sources = [x for x in targets]

		tx = self.graph.cypher.begin()
		query = "WITH {nodes} as nodes UNWIND nodes.data as i MATCH (a:Data {neo4j_id : i.internal_id, system_user_username : '" + self.username + "'}), (b:Repository) WHERE ID(b) IN [" + ','.join(ret) + "] CREATE UNIQUE (a)-[:InRepository]->(b);"
		tx.append(query, nodes = self.nodes)
		
		query = "WITH {nodes} as nodes UNWIND nodes.data as i MATCH (a:Data {neo4j_id : i.internal_id, system_user_username : '" + self.username + "'}), (b:SubRepository) WHERE ID(b) IN [" + ','.join(ret) + "] CREATE UNIQUE (a)-[:InSubRepository]->(b);"
		tx.append(query, nodes = self.nodes)

		query = "WITH {nodes} as nodes UNWIND nodes.data as i MATCH (a:Data {neo4j_id : i.internal_id, system_user_username : '" + self.username + "'}), (b:Dataset) WHERE ID(b) IN [" + ','.join(ret) + "] CREATE UNIQUE (a)-[:InDataset]->(b);"
		tx.append(query, nodes = self.nodes)

		tx.commit()

	def storeData(self):
		self.createLabel()
		self.createNodes()
		self.createEdges()
		self.updateDataFlow()