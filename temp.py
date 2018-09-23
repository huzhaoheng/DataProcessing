from py2neo.packages.httpstream import http
from py2neo import Graph, Path, authenticate
from time import gmtime, strftime, localtime
import sys
import datetime
import hashlib
import os
import json
from genson import SchemaBuilder

builder = SchemaBuilder()
http.socket_timeout = 9999
authenticate("localhost:7474", "neo4j", "123456")
neo4jUrl = os.environ.get('NEO4J_URL',"http://localhost:7474/db/data/")
graph = Graph(neo4jUrl)


def validateUserNode(username):
	query = """
				MATCH 
					(u:SystemUser) 
				WHERE 
					u.username = '{username}' 
				RETURN ID(u)
			""".format(username = username)
	user_exists = graph.cypher.execute(query)
	user_id = None
	if not user_exists:
		query = """
					CREATE 
						(u:SystemUser {{username : '{username}'}}) 
					RETURN 
						ID(u)
				""".format(username = username)
		result = graph.cypher.execute(query)
		user_id = result[0]["ID(u)"]
	else:
		user_id = user_exists[0]["ID(u)"]

	return user_id

def validateQueryNode(username, query_name):
	query = """
				MATCH 
					(q:Query) 
				WHERE 
					q.name = '{query_name}' AND q.username = '{username}' 
				RETURN ID(q)
			""".format(query_name = query_name, username = username)
	query_exist = graph.cypher.execute(query)
	query_id = None
	if not query_exist:
		query = """
					CREATE 
						(q:Query {{name : '{query_name}', username : '{username}'}})
					RETURN
						ID(q)
				""".format(query_name = query_name, username = username)
		result = graph.cypher.execute(query)
		query_id = result[0]["ID(q)"]
	else:
		query_id = query_exist[0]["ID(q)"]

	return query_id

def validateParameterNode(query_structure, username, query_name):
	parameter_hash = hashlib.md5(json.dumps(query_structure).encode()).hexdigest()
	query = """
				MATCH 
					(p:QueryParameter) 
				WHERE 
					p.query_name = '{query_name}' 
				AND 
					p.parameter_hash = '{parameter_hash}'
				AND
					p.username = '{username}'
				RETURN ID(p)
			""".format(query_name = query_name, parameter_hash = parameter_hash, username = username)
	parameter_exists = graph.cypher.execute(query)
	parameter_id = None
	if not parameter_exists:
		query = """
					CREATE 
						(p:QueryParameter {{query_name : '{query_name}', username : '{username}', parameter_hash : '{parameter_hash}'}})
					RETURN 
						ID(p)
				""".format(query_name = query_name, username = username, parameter_hash = parameter_hash)
		result = graph.cypher.execute(query)
		parameter_id = result[0]["ID(p)"]
	else:
		parameter_id = parameter_exists[0]["ID(p)"]

	return parameter_id

def connectNodes(source_id, target_id, rel_name):
	query = """
		MATCH 
			(s), (t)
		WHERE
			ID(s) = {source_id}
		AND
			ID(t) = {target_id}
		CREATE UNIQUE
			(s)-[r:{rel_name}]->(t)
	""".format(
		source_id = source_id,
		target_id = target_id,
		rel_name = rel_name
	)
	graph.cypher.execute(query)

def storeData(data, schema, parent_id, curr_time):
	if "anyOf" in schema:
		new_schema = None
		sub_schemas = schema["anyOf"]
		for sub_schema in sub_schemas:
			if sub_schema["type"] != "null":
				new_schema = sub_schema
				break

		if data:
			storeData(data, new_schema, parent_id, curr_time)
		else:
			pass

	else:
		data_type = schema["type"]
		if data_type == "object":
			if "properties" in schema:
				node_names = list(schema["properties"].keys())
				node_id_list = []
				tx = graph.cypher.begin()
				for node_name in node_names:
					query = """
								MATCH
									(x)
								WHERE
									ID(x) = {parent_id}
								WITH
									(x)
								CREATE 
									(x)-[r:hasChild]->(d:Data {{node_name : '{node_name}', collected_at : '{curr_time}'}})
								RETURN 
									ID(d)
							""".format(node_name = node_name, curr_time = curr_time, parent_id = parent_id)
					# result = graph.cypher.execute(query)
					tx.append(query)
				result = tx.commit()
				for each in result:
					node_id_list.append(each[0]["ID(d)"])

				for i, node_name in enumerate(node_names):
					node_id = node_id_list[i]
					storeData(data[node_name], schema["properties"][node_name], node_id, curr_time)
			else:
				pass

		elif data_type == "array":
			items = schema['items']
			new_schema = None
			if "anyOf" in items:
				sub_schemas = schema["anyOf"]
				for sub_schema in sub_schemas:
					if sub_schema["type"] != "null":
						new_schema = sub_schema
						break
			else:
				new_schema = schema["items"]

			for each in data:
				if each:
					storeData(each, new_schema, parent_id, curr_time)

		elif type(data_type) is list:
			nonnull_type = None
			for each in data_type:
				if each != "null":
					nonnull_type = each
			if data:
				storeData(data, {"type" : nonnull_type}, parent_id, curr_time)

		else:
			value = None
			if data_type == "string":
				value = '"{data}"'.format(data = data.replace('"', "'"))
			elif data_type == "integer":
				value = "toInteger({data})".format(data = data)
			elif data_type == "number":
				value = "toFloat({data})".format(data = data)
			elif data_type == "boolean":
				value = "toBoolean({data})".format(data = data)
			else:
				pass

			if value:
				tx = graph.cypher.begin()
				query = """
							MATCH
								(x)
							WHERE
								ID(x) = {parent_id}
							WITH
								(x)
							CREATE 
								(x)-[r:hasValue]->(d:Data {{node_name : 'value', collected_at : '{curr_time}', value : {value}}})
							RETURN 
								ID(d)
				""".format(curr_time = curr_time, parent_id = parent_id, value = value)
				tx.append(query)

				result = tx.commit()
				# print (query)
				# graph.cypher.execute(query)
	return;





if __name__ == '__main__':
	username = 'hu61'
	query_structure = json.load(open('sample_structure.json', 'r'))
	query_name = query_structure['name']

	data = json.load(open('data.json', 'rb'))
	builder.add_object(data)
	schema = builder.to_schema()
	json.dump(schema, open("schema.json", "w"))

	# exit()
	user_id = validateUserNode(username)
	query_id = validateQueryNode(username, query_name)
	parameter_id = validateParameterNode(schema, username, query_name)
	connectNodes(user_id, query_id, "hasQuery")
	connectNodes(query_id, parameter_id, "hasParameter")
	curr_time = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
	storeData(data, schema, parameter_id, curr_time)