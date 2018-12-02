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

		validateDataStructure(parent_id, new_schema, node_name)
	
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
					validateDataStructure(this_id, node_schema, node_name)
			

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

				validateDataStructure(parent_id, new_schema, node_name)

			except Exception as e:
				pass
			


		elif type(data_type) is list:
			nonnull_type = None
			for each in data_type:
				if each != "null":
					nonnull_type = each

			validateDataStructure(parent_id, {"type" : nonnull_type}, node_name)

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
			storeData(data, new_schema, node_name, parent_id, curr_time, tx)
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
						storeData(data[node_name], node_schema, node_name, this_id, curr_time, tx)
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
					storeData(each, new_schema, node_name, parent_id, curr_time, tx)

		elif type(data_type) is list:
			nonnull_type = None
			for each in data_type:
				if each != "null":
					nonnull_type = each
			if data:
				storeData(data, {"type" : nonnull_type}, node_name, parent_id, curr_time, tx)

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