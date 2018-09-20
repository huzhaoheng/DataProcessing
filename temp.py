from py2neo.packages.httpstream import http
from time import gmtime, strftime, localtime
import sys
import datetime
import hashlib

http.socket_timeout = 9999

authenticate("localhost:7474", "neo4j", "123456")
neo4jUrl = os.environ.get('NEO4J_URL',"http://localhost:7474/db/data/")
graph = Graph(neo4jUrl)


username = 'hu61'
query = "MATCH (d:SystemUser) WHERE d.username = '{username}' RETURN d".format(username = username)
exists = graph.cypher.execute(query)
if not exists:
	query = "CREATE (u:SystemUser {username : '{username}'})".format(username = username)
	graph.cypher.execute(query)

fp = open('sample_structure.json', 'r')
query_structure = json.load(fp)
query_name = query_structure['name']
parameter_id = hashlib.md5(json.dumps(query_structure).encode()).hexdigest()
query = "MATCH (q:Query) WHERE q.name = '{name}' AND username = '{username}' RETURN q".format(name = query_name, username = username)
query_exist = graph.cypher.execute(query)

if not query_exist:
	createQueryNode(graph, query_name, username)
	createParameterNode(graph, query_name, parameter_id, username)
else:
	query = "MATCH (p:QueryParameter) WHERE p.query_name = '{name}' AND p.parameter_id = '{parameter_id}' RETURN p".format(name = query_name, parameter_id = parameter_id)
	parameter_exist = graph.cypher.execute(query)
	if parameter_exist:
		pass
	else:
		createParameterNode(graph, query_name, parameter_id, username)



{
				'name' : username,
				'time' : datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
				'data' : json.load(fp)
		}

def createQueryNode(graph, query_name, username):
	query = "CREATE (q:Query {name : '{name}', username : '{username}'})".format(name = query_name, username = username)
	graph.cypher.execute(query)

def createParameterNode(graph, query_name, parameter_id, username):
	query = "CREATE (p:QueryParameter {query_name : '{name}', username : '{username}', parameter_id : '{parameter_id}'})".format(name = query_name, username = username, parameter_id = parameter_id)
	graph.cypher.execute(query)