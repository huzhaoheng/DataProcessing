import nltk
from nltk.tokenize import RegexpTokenizer
import hashlib
import json

def queryBuilder(path, parameter_id, startDate, endDate):
	query = """
		MATCH 
			(a:QueryParameter) 
		WHERE 
			ID(a) = {parameter_id} 
		WITH 
			(a) 
		MATCH 
			(a)""".format(parameter_id = parameter_id)

	for layer, node in enumerate(path):
		node_alias = "layer{layer}_{node_name}".format(layer = str(layer), node_name = node.replace(' ', ''))	
		query += "-[:hasChild]->({alias}:Object {{node_name : '{node_name}'}})".format(alias = node_alias, node_name = node)
		if layer == len(path) - 1:
			startDataCondition = "date(split(v.collected_at, ' ')[0]) >= date('{startDate}')".format(startDate = startDate) if startDate else "true"
			endDateCondition = "date(split(v.collected_at, ' ')[0]) <= date('{endDate}')".format(endDate = endDate) if endDate else "true"
			end_part = """-[:hasValue]->(v:Value) 
							WHERE 
								{startDataCondition}
							AND
								{endDateCondition}
							WITH 
								({alias}), (v)
							MATCH 
								(x:Object)-[:hasChild]->({alias})
							RETURN
								ID(x) AS {alias}_objectID, 
								v.value AS {alias}_value
						""".format(
							startDataCondition = startDataCondition, 
							endDateCondition = endDateCondition,
							alias = node_alias)

			query += end_part

	ret = {"alias" : node_alias, "query" : query}
	return ret

def applyTextFunction(textFunctionName, data, textAPIClient, parameters):
	result = None

	if textFunctionName == "Concepts":
		result = textAPIClient.Concepts({'text' : data})
	elif textFunctionName == "Entities":
		result = textAPIClient.Entities({'text' : data})
	elif textFunctionName == "Hashtags":
		result = textAPIClient.Hashtags({'text' : data})
	elif textFunctionName == "Sentiment":
		result = textAPIClient.Sentiment({'text' : data})
	elif textFunctionName == "Top K Words":
		KValue = parameters["KValue"]
		includeStopWords = parameters["includeStopWords"]

		tokenizer = RegexpTokenizer(r'\w+')
		allWords = tokenizer.tokenize(data)
		stopwords = nltk.corpus.stopwords.words('english')

		allWordDist = nltk.FreqDist(w.lower() for w in allWords)
		allWordExceptStopDist = nltk.FreqDist(w.lower() for w in allWords if w.lower() not in stopwords)

		result = {}
		top = allWordDist.most_common(KValue) if includeStopWords else allWordExceptStopDist.most_common(KValue)
		for each in top:
			word, freq = each
			result[word] = freq
		
	return result

# def createUserNode(username, email, graph):
# 	try:
# 		query = """
# 				CREATE 
# 					(u:SystemUser {{
# 						username : '{username}',
# 						email : '{email}'
# 					}})
# 			""".format(username = username, email = email)
# 		graph.cypher.execute(query)
# 		return {"succeed": True, "message": "Done"}
# 	except Exception as e:
# 		return {"succeed": False, "message": str(e)}
	
def getUserNameByUserID(userID, graph):
	query = """
				MATCH 
					(u:SystemUser) 
				WHERE 
					u.userID = '{userID}' 
				RETURN u.username AS username
			""".format(userID = userID)
	username = graph.cypher.execute(query)[0]["username"]
	return username

def validateUserNode(username, email, userID, graph):
	query = """
				MATCH 
					(u:SystemUser) 
				WHERE 
					u.userID = '{userID}' 
				RETURN ID(u)
			""".format(userID = userID)
	user_exists = graph.cypher.execute(query)
	user_id = None
	if not user_exists:
		query = """
					CREATE 
						(u:SystemUser {{username : '{username}', email : '{email}', userID: '{userID}'}}) 
					RETURN
						ID(u)
				""".format(username = username, email = email, userID = userID)
		result = graph.cypher.execute(query)
		user_id = result[0]["ID(u)"]
	else:
		user_id = user_exists[0]["ID(u)"]

	return user_id

def validateQueryNode(username, query_name, graph):
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

def validateParameterNode(schema, username, query_name, parsed_parameters, graph):
	parameter_hash = hashlib.md5(json.dumps(schema).encode()).hexdigest()
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
		parameters_str = ""
		for k, v in parsed_parameters.items():
			if v:
				if type(v) is str:
					parameters_str += "{k} : '{v}', ".format(k = k, v = v)
				else:
					parameters_str += "{k} : {v}, ".format(k = k, v = v)
			else:
				parameters_str += "{k} : {v}, ".format(k = k, v = "null")

		query = """
					CREATE 
						(p:QueryParameter {{query_name : '{query_name}', username : '{username}', {parameters_str} parameter_hash : '{parameter_hash}'}})
					RETURN 
						ID(p)
				""".format(query_name = query_name, username = username, parameter_hash = parameter_hash, parameters_str = parameters_str)
		result = graph.cypher.execute(query)
		print (query)
		parameter_id = result[0]["ID(p)"]
	else:
		parameter_id = parameter_exists[0]["ID(p)"]

	return parameter_id

def connectNodes(source_id, target_id, rel_name, graph):
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

def validateDataStructure(parent_id, schema, node_name, graph):
	if "anyOf" in schema:
		new_schema = None
		sub_schemas = schema["anyOf"]
		for sub_schema in sub_schemas:
			if sub_schema["type"] != "null":
				new_schema = sub_schema
				break

		validateDataStructure(parent_id, new_schema, node_name, graph)
	
	else:
		data_type = schema["type"]
		if data_type == "object":
			query = """
						MATCH
							(x)
						WHERE
							ID(x) = {parent_id}
						WITH
							(x)
						MERGE
							(x)-[r:hasChild]->(o:StructureObject {{node_name : '{node_name}'}})
						RETURN 
							ID(o)
			""".format(parent_id = parent_id, node_name = node_name)

			result = graph.cypher.execute(query)
			this_id = result[0]["ID(o)"]

			if "properties" in schema:
				for node_name, node_schema in schema["properties"].items():
					validateDataStructure(this_id, node_schema, node_name, graph)
			

		elif data_type == "array":
			try:
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

				validateDataStructure(parent_id, new_schema, node_name, graph)

			except Exception as e:
				pass
			


		elif type(data_type) is list:
			nonnull_type = None
			for each in data_type:
				if each != "null":
					nonnull_type = each

			validateDataStructure(parent_id, {"type" : nonnull_type}, node_name, graph)

		else:
			query = """
						MATCH
							(x)
						WHERE
							ID(x) = {parent_id}
						WITH
							(x)
						MERGE
							(x)-[:hasChild]->(o:StructureObject {{node_name : '{node_name}'}})
			""".format(parent_id = parent_id, node_name = node_name)
			graph.cypher.execute(query)

def storeData(data, schema, node_name, parent_id, curr_time, tx, graph):
	if not data:
		return
		
	if "anyOf" in schema:
		new_schema = None
		sub_schemas = schema["anyOf"]
		for sub_schema in sub_schemas:
			if sub_schema["type"] != "null":
				new_schema = sub_schema
				break

		if data:
			storeData(data, new_schema, node_name, parent_id, curr_time, tx, graph)
		else:
			pass

	else:
		data_type = schema["type"]
		if data_type == "object":
			query = """
						MATCH
							(x)
						WHERE
							ID(x) = {parent_id}
						WITH
							(x)
						CREATE 
							(x)-[r:hasChild]->(o:Object {{node_name : '{node_name}', collected_at : '{curr_time}'}})
						RETURN 
							ID(o)
			""".format(parent_id = parent_id, node_name = node_name, curr_time = curr_time)

			result = graph.cypher.execute(query)
			this_id = result[0]["ID(o)"]

			if "properties" in schema:
				for node_name, node_schema in schema["properties"].items():
					if node_name in data:
						storeData(data[node_name], node_schema, node_name, this_id, curr_time, tx, graph)
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
					storeData(each, new_schema, node_name, parent_id, curr_time, tx, graph)

		elif type(data_type) is list:
			nonnull_type = None
			for each in data_type:
				if each != "null":
					nonnull_type = each
			if data:
				storeData(data, {"type" : nonnull_type}, node_name, parent_id, curr_time, tx, graph)

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
				query = """
							MATCH
								(x)
							WHERE
								ID(x) = {parent_id}
							WITH
								(x)
							CREATE 
								(x)-[:hasChild]->(o:Object {{node_name : '{node_name}', collected_at : '{curr_time}'}})-[:hasValue]->(v:Value {{collected_at : '{curr_time}', value : {value}}})
				""".format(curr_time = curr_time, parent_id = parent_id, value = value, node_name = node_name)
				# graph.cypher.execute(query)
				tx.append(query)
	return;

def parameterParser(structure):
	ret = {}
	if type(structure) is dict:
		if structure["selected"]:
			curr_name = structure["name"]
			if structure["inputs"]:
				for each in structure["inputs"]:
					name = each["name"]
					value = each["value"]
					inputType = each["inputType"]
					if inputType == "Int":
						ret[curr_name + "_" + name] = int(value)
					elif inputType == "Float":
						ret[curr_name + "_" + name] = float(value)
					else:
						ret[curr_name + "_" + name] = value
			if structure["children"]:
				children_ret = parameterParser(structure["children"])
				for k, v in children_ret.items():
					ret[curr_name + "_" + k]  = v
		return ret
	
	else:
		for each in structure:
			for k, v in parameterParser(each).items():
				ret[k] = v
		return ret

def generateNodesMapping(stages):
	ret = {}
	for stage in stages:
		nodes = stage['nodes']
		for node in nodes:
			nodeID = node['id']
			ret[nodeID] = node
	return ret

def generateNodeSchema(node, nodesMapping):
	nestedSchema = {}
	schemas = []
	inputs = node["inputs"]
	dependencies = node["dependencies"]
	inputID2NodeIDMapping = {}
	for dep in dependencies:
		inputID2NodeIDMapping[dep['input_id']] = dep['node_id']
		for each in inputs:
			if each['input_id'] in inputID2NodeIDMapping:
				nodeID = inputID2NodeIDMapping[each['input_id']]
				inputNode = nodesMapping[nodeID]
				values = inputNode['outputs'][0]['value']
				nestedSchema[each['path']] = values
	
	print ("nestedSchema generated")
	print (nestedSchema)
	return nestedSchema

	# schemasNum = 1
	
	# for v in nestedSchema.values():
	# 	schemasNum *= len(v)

	# for i in range(schemasNum):
	# 	initSchema = {}
	# 	for k in nestedSchema.keys():
	# 		initSchema[k] = None
	# 	schemas.append(initSchema)

	# for k, v in nestedSchema.items():
	# 	valuesNum = len(v)
	# 	period = schemasNum // valuesNum
	# 	for i in range(valuesNum):
	# 		for j in range(period):
	# 			schemas[i * period + j][k] = v[i]

	# print (str(schemasNum), "schemas are generated")
	# return schemas

def generateDataFromNode(node):
	data = {}
	outputs = node['outputs']
	for each in outputs:
		curr = data
		path = each['path']
		values = path['value']
		steps = path.split(".")
		for i, step in enumerate(steps):
			if step not in curr:
				curr[step] = {}
			if i != len(steps) - 1:
				curr = curr[step]
			else:
				curr[step] = values

	print ("data generated")
	print (data)
	return data

def storeDataStructure(data, nodeName, parentID, graph):
	query = """
				MATCH
					(x)
				WHERE
					ID(x) = {parentID}
				WITH
					(x)
				MERGE
					(x)-[r:hasChild]->(o:StructureObject {{node_name : '{nodeName}'}})
				RETURN 
					ID(o)
			""".format(parentID = parentID, nodeName = nodeName)

	result = graph.cypher.execute(query)
	this_id = result[0]["ID(o)"]
	if type(data) is dict:
		for k, v in data.items():
			storeDataStructure(v, k, this_id, graph)

def storeDataInMetaQuery(data, nodeName, parentID, currTime, tx, graph):
	if type(data) is dict:
		query = """
					MATCH
						(x)
					WHERE
						ID(x) = {parentID}
					WITH
						(x)
					CREATE 
						(x)-[r:hasChild]->(o:Object {{node_name : '{nodeName}', collected_at : '{currTime}'}})
					RETURN 
						ID(o)
				""".format(parentID = parentID, nodeName = nodeName, currTime = currTime)

		result = graph.cypher.execute(query)
		this_id = result[0]["ID(o)"]

		for k, v in data.items():
			storeDataInMetaQuery(v, k, this_id, currTime, tx, graph)

	elif type(data) is list:
			for each in value:
				storeDataInMetaQuery(each, nodeName, parentID, currTime, tx, graph)
	else:
		for value in data:
			if value:
				valStr = None
				if type(value) is int:
					valStr = "toInteger({value})".format(value = value)
				elif type(value) is float:
					valStr = "toFloat({value})".format(value = value)
				elif type(value) is bool:
					valStr = "toBoolean({value})".format(value = value)
				else:
					valStr = '"{value}"'.format(value = value.replace('"', "'"))


				query = """
					MATCH
						(x)
					WHERE
						ID(x) = {parentID}
					WITH
						(x)
					CREATE 
						(x)-[:hasChild]->(o:Object {{node_name : '{nodeName}', collected_at : '{currTime}'}})-[:hasValue]->(v:Value {{collected_at : '{parentID}', value : {value}}})
				""".format(currTime = currTime, parentID = parentID, value = valStr, nodeName = nodeName)
				# graph.cypher.execute(query)
				tx.append(query)

	result = graph.cypher.execute(query)
	this_id = result[0]["ID(o)"]