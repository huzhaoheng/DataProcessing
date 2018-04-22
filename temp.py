import json
import hashlib


structure = None
with open('sample_structure.json') as json_data:
	structure = json.load(json_data)

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
						ret[curr_name + "->" + name] = int(value)
					elif inputType == "Float":
						ret[curr_name + "->" + name] = float(value)
					else:
						ret[curr_name + "->" + name] = value
			if structure["children"]:
				children_ret = parameterParser(structure["children"])
				for k, v in children_ret.items():
					ret[curr_name + "->" + k]  = v
		return ret
	
	else:
		for each in structure:
			for k, v in parameterParser(each).items():
				ret[k] = v
		return ret


def generateRepositoryID(repository, username, parameters):
	s = repository + username + json.dumps(parameters)
	return hashlib.md5(s.encode()).hexdigest()

parameters = parameterParser(structure)
with open('parameters.json', 'w') as fp:
	json.dump(parameters, fp)

# print (not parameters['query->reddit->search->syntax'])

# i = generateRepositoryID("myquery", "hu61", parameters)
# print (i)