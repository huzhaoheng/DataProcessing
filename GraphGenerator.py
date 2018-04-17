import os
from py2neo import Graph, Path, authenticate
import hashlib
import json
import time
import datetime

class GraphGenerator(object):
	def __init__(self, username, hashkey, data, structure):
		self.data = data
		self.username = username
		self.hashkey = hashkey
		self.structure = structure
		self.nodes = {}
		self.edges = {}

	def parseStructure(self, structure):
		name, output, children, selected = structure['name'], structure['output'], structure['children'], structure['selected']
		if selected:
			if not children:
				data_type = None
				# if output['isAList'] == 'true' or output['isAList'] == true:
				if output['type']['kind'] == 'LIST':
					data_type = [output['type']['ofType']['name']]
				else:
					data_type = output['type']['name']
				return True, name, data_type

			else:
				ret = {'type': None, 'schema': {}}
				# if output['isAList'] == 'true' or output['isAList'] == true:
				if output['type']['kind'] == 'LIST':
					ret['type'] = [output['type']['ofType']['name']]
				else:
					ret['type'] = output['type']['name']
				for child in children:
					flag, key, value = self.parseStructure(child)
					if flag:
						ret['schema'][key] = value
				return True, name, ret

		return False, None, None

	def generatePaths(self, structure):
		ret = []
		for k, v in structure.items():
			if type(v) != dict:
				ret.append([k])
			else:
				sub_ret = self.generatePaths(v['schema'])
				for each in sub_ret:
					ret.append([k] + each)
		return ret

	def generateInternalID(self, instance):
		sorted_keys = list(instance.keys())
		sorted_keys.sort()
		id_str = self.username
		for k in sorted_keys:
			v = instance[k]
			id_str += str(v)			
		internal_id = hashlib.md5(id_str.encode()).hexdigest()
		return internal_id

	def createInstances(self, curr_path, curr_structure, curr_data, parent_id, resource, username, hashkey):
		curr = curr_path[0]
		if type(curr_structure) is dict:
			if type(curr_structure['type']) is list:
				Obj = curr_structure['type'][0]
				if curr_data:
					for each in curr_data:
						instance = {k + "_" + (curr_structure['schema'][k] if type(curr_structure['schema'][k]) is str else 'LISTOF' + curr_structure['schema'][k][0]) : each[k] for k in each if type(curr_structure['schema'][k]) is not dict}
						instance['resource'] = resource
						instance['object'] = Obj
						instance['system_user_username'] = username
						instance['system_user_hashkey'] = hashkey
						internal_id = self.generateInternalID(instance)
						instance['internal_id'] = internal_id
						if internal_id not in self.nodes:
							self.nodes[internal_id] = instance

						if parent_id != 'init_id' and (parent_id, internal_id) not in self.edges:
							self.edges[(parent_id, internal_id)] = curr

						if len(curr_path) > 2:
							Next = curr_path[1]
							self.createInstances(curr_path[1:], curr_structure['schema'][Next], each[Next], internal_id, resource, username, hashkey)
			else:
				if curr_data:
					Obj = curr_structure['type']
					instance = {k + "_" + (curr_structure['schema'][k] if type(curr_structure['schema'][k]) is str else 'LISTOF' + curr_structure['schema'][k][0]) : curr_data[k] for k in curr_data if type(curr_structure['schema'][k]) is not dict}
					instance['resource'] = resource
					instance['object'] = Obj
					instance['system_user_username'] = username
					instance['system_user_hashkey'] = hashkey
					internal_id = self.generateInternalID(instance)
					instance['internal_id'] = internal_id
					if internal_id not in self.nodes:
						self.nodes[internal_id] = instance

					if parent_id != 'init_id' and (parent_id, internal_id) not in self.edges:
						self.edges[(parent_id, internal_id)] = curr

					if len(curr_path) > 2:
						Next = curr_path[1]
						self.createInstances(curr_path[1:], curr_structure['schema'][Next], curr_data[Next], internal_id, resource, username, hashkey)
				
		else:
			if curr_data:
				instance = {curr + "_" + (curr_structure if type(curr_structure) is str else 'LISTOF' + curr_structure[0]) : curr_data}
				instance['resource'] = resource
				instance['object'] = curr
				instance['system_user_username'] = username
				instance['system_user_hashkey'] = hashkey
				internal_id = self.generateInternalID(instance)
				instance['internal_id'] = internal_id
				if internal_id not in self.nodes:
					self.nodes[internal_id] = instance

				if parent_id != 'init_id' and (parent_id, internal_id) not in self.edges:
					self.edges[(parent_id, internal_id)] = curr

			return

	def generateGraph(self):
		flag, key, value = self.parseStructure(self.structure)
		parsed_structure = {'data' : value}
		paths = self.generatePaths(parsed_structure)
		for path in paths:
			curr = path[2]
			self.createInstances(path[2:], parsed_structure[path[0]]['schema'][path[1]]['schema'][curr], self.data[path[0]][path[1]][curr], 'init_id', path[1], self.username, self.hashkey)
		self.formatNodes()
		self.formatEdges()
		return self.nodes, self.edges

	def formatNodes(self):
		formatted = {"data" : []}
		for k, v in self.nodes.items():
			formatted["data"].append(v)
		self.nodes = formatted

	def formatEdges(self):
		formatted = {'edges' : []}
		for (source, target), relation in self.edges.items():
			formatted['edges'].append({'source' : source, 'target' : target, 'relation' : relation})
		self.edges = formatted

	# for test use, comment this, use generateGraph above
	# def generateGraph(self, parsed_structure):
	# 	paths = self.generatePaths(parsed_structure)
	#	for path in paths:
	#		curr = path[2]
	#		self.createInstances(path[2:], parsed_structure[path[0]]['schema'][path[1]]['schema'][curr], self.data[path[0]][path[1]][curr], 'init_id', path[1], self.username, self.hashkey)
	#	self.formatNodes()
	#	self.formatEdges()
	#	return self.nodes, self.edges
