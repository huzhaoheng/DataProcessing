import os
from py2neo import Graph, authenticate
import json
import time

class DataLoader(object):
	def __init__(self, graph, nodes, edges, username, hashkey, repository):
		self.graph = graph
		self.nodes = nodes
		self.edges = edges
		self.username = username
		self.hashkey = hashkey
		self.repository = repository


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

		query = "WITH {nodes} as nodes UNWIND nodes.data as i MATCH (a:Data {neo4j_id : i.internal_id, system_user_username : '" + self.username + "'}), (b:Repository {name : '" + self.repository + "', system_user_username :'" + self.username + "'}) CREATE UNIQUE (a)-[:InRepository]->(b);"
		tx.append(query, nodes = self.nodes)
		tx.commit()

	def createEdges(self):
		query = "WITH {edges} as edges UNWIND edges.edges as e MATCH (s:Data{neo4j_id : e.source}), (t:Data{neo4j_id : e.target}) CREATE UNIQUE (s)-[:Relation {relation_name: e.relation, source_neo4j_id : e.source, target_neo4j_id : e.target, system_user_username: '" + self.username + "', system_user_hashkey: '" + self.hashkey + "'}]->(t)"
		self.graph.cypher.execute(query, edges = self.edges)

	def storeData(self):
		self.createLabel()
		self.createNodes()
		self.createEdges()