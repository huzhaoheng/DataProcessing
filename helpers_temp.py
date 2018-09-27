def queryBuilder(structure, parameter_id, startDate, endDate):
	query = """
		MATCH 
			(a:QueryParameter) 
		WHERE 
			ID(a) = {parameter_id} 
		WITH 
			(a) 
		MATCH 
			(a)""".format(parameter_id = parameter_id)
	ret = queryBuilderHelper(structure, parameter_id, startDate, endDate, query)
	return ret
	
def queryBuilderHelper(curr_structure, parameter_id, startDate, endDate, query):
	if len(curr_structure) == 0:
		return []

	else:
		ret = []
		for node_name in curr_structure:
			checked = curr_structure[node_name]["checked"]
			layer = curr_structure[node_name]["layer"]
			children = curr_structure[node_name]["children"]
			node_alias = "layer_{layer}_{node_name}".format(layer = str(layer), node_name = node_name.replace(' ', ''))
			extended_query = query + "-[:hasChild]->({alias}:Object {{node_name : '{node_name}'}})".format(alias = node_alias, node_name = node_name)
			if checked:
				startDataCondition = "date(split(v.collected_at, ' ')[0]) >= date('{startDate}')".format(startDate = startDate) if startDate else "true"
				endDateCondition = "date(split(v.collected_at, ' ')[0]) <= date('{endDate}')".format(endDate = endDate) if endDate else "true"
				# end_part = """-[:hasValue]->(v:Value) 
				# 				WHERE 
				# 					{startDataCondition}
				# 				AND
				# 					{endDateCondition}
				# 				RETURN 
				# 					v.value AS {alias}_value
				# 			""".format(
				# 				startDataCondition = startDataCondition, 
				# 				endDateCondition = endDateCondition,
				# 				alias = node_alias)


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
									ID(x) AS {alias}_obj_id, 
									v.value AS {alias}_value
							""".format(
								startDataCondition = startDataCondition, 
								endDateCondition = endDateCondition,
								alias = node_alias)



				complete_query = extended_query + end_part
				ret.append([node_alias, complete_query])
			ret += queryBuilderHelper(children, parameter_id, startDate, endDate, extended_query)
		return ret

def applyTextFunction(textFunctionName, data, textAPIClient):
	result = None

	if textFunctionName == "Concepts":
		result = textAPIClient.Concepts({'text' : data})
	elif textFunctionName == "Entities":
		result = textAPIClient.Entities({'text' : data})
	elif textFunctionName == "Hashtags":
		result = textAPIClient.Hashtags({'text' : data})
	elif textFunctionName == "Sentiment":
		result = textAPIClient.Sentiment({'text' : data})
	else:
		pass

	return result