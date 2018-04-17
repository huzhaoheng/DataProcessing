import json
from GraphGenerator import GraphGenerator
from py2neo import Graph, Path, authenticate
from DataLoader import DataLoader
import os

authenticate("localhost:7474", "neo4j", "123456")
neo4jUrl = os.environ.get('NEO4J_URL',"http://localhost:7474/db/data/")
graph = Graph(neo4jUrl)
# dic = None

# with open('sample_structure.json') as json_data:
# 	dic = json.load(json_data)

# def helper(sub_dic):
# 	name, output, children, selected = sub_dic['name'], sub_dic['output'], sub_dic['children'], sub_dic['selected']
# 	if selected:
# 		if not children:
# 			data_type = None
# 			# if output['isAList'] == 'true' or output['isAList'] == true:
# 			if output['type']['kind'] == 'LIST':
# 				data_type = [output['type']['ofType']['name']]
# 			else:
# 				data_type = output['type']['name']
# 			return True, name, data_type

# 		else:
# 			ret = {'type': None, 'schema': {}}
# 			# if output['isAList'] == 'true' or output['isAList'] == true:
# 			if output['type']['kind'] == 'LIST':
# 				ret['type'] = [output['type']['ofType']['name']]
# 			else:
# 				ret['type'] = output['type']['name']
# 			for child in children:
# 				flag, key, value = helper(child)
# 				if flag:
# 					ret['schema'][key] = value
# 			return True, name, ret

# 	return False, None, None

# flag, key, value = helper(dic)

# # result = {key : value}
# result = {"data" : value}
# # with open('parsed_structure.json', 'w') as outfile:
# #     json.dump(result, outfile)


username = 'huzhaoheng'
hashkey = '123456'
repository = 'myquery'

query = "MATCH (d:SystemUser) WHERE d.username = '" + username + "' RETURN d"
exists = graph.cypher.execute(query)

if not exists:
	query = "CREATE (u:SystemUser {username : '" + username + "', hashkey : '" + hashkey + "'})"
	graph.cypher.execute(query)
	repository_exist = graph.cypher.execute("MATCH (r:Repository {name : '" + repository + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "'}) RETURN r")
	if not repository_exist:
		query = "CREATE (r:Repository {name : '" + repository + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "'})"
		graph.cypher.execute(query)
		query = "MATCH (a:SystemUser {username:'" + username + "'}), (b:Repository {name:'" + repository + "', system_user_username : '" + username + "'}) CREATE (a)-[r:hasRepository]->(b);"
		graph.cypher.execute(query)


parsed_structure = None
data = None

with open('parsed_structure.json') as json_data:
	parsed_structure = json.load(json_data)

with open('./Twitter/json_file.json', encoding='utf-8') as json_data:
	data = json.load(json_data)

with open('sample_structure.json', encoding='utf-8') as json_data:
	structure = json.load(json_data)

gg = GraphGenerator(username, hashkey, data, structure)
nodes, edges = gg.generateGraph(parsed_structure)

with open('nodes.txt', 'w', encoding='utf-8') as outfile:
	json.dump(nodes, outfile)

with open('edges.txt', 'w', encoding='utf-8') as outfile:
	json.dump(edges, outfile)

loader = DataLoader(graph, nodes, edges, username, hashkey, repository)
loader.storeData()