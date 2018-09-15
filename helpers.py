from GraphGenerator import GraphGenerator
from DataLoader import DataLoader
import numpy as np
import pandas as pd
import hashlib
import json


def createQueryParameterStructure(graph, username, hashkey, structure, query_name, parameter_id):
    query_parameter_structure = parseQueryParameterStructure(username, hashkey, structure, query_name, parameter_id)
    prev_path = "(a:QueryParameter {query_name : '" + query_name + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "', parameter_id : '" + parameter_id + "'})"
    children = query_parameter_structure['children']
    createQueryParameterStructureHelper(graph, username, hashkey, children, query_name, parameter_id, prev_path)
    

def createQueryParameterStructureHelper(graph, username, hashkey, structures, query_name, parameter_id, prev_path):
    if len(structures) == 0:
        return

    for each in structures:
        query = "match p=" + prev_path + " with last(nodes(p)) as x create (x)-[:Has" + each['name'] + "]->(:QueryObject {name : '" + each['name'] + "', object : '" + each['object_name'] + "', query_name : '" + query_name + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "', parameter_id : '" + parameter_id + "'});"
        graph.cypher.execute(query)
        new_prev_path = prev_path + "-[:Has" + each['name'] + "]->(:QueryObject {name : '" + each['name'] + "', object : '" + each['object_name'] + "', query_name : '" + query_name + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "', parameter_id : '" + parameter_id + "'})"
        createQueryParameterStructureHelper(graph, username, hashkey, each['children'], query_name, parameter_id, new_prev_path)


def storeData(graph, data, username, hashkey, structure, query_name, parameter_id):
    loader = DataLoader(graph, data, username, hashkey, structure, query_name, parameter_id)
    loader.storeData()
    return {"msg" : "Done"}


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


def generateParameterID(parameters, username):
    keys = list(parameters.keys())
    keys.sort()
    id_str = username
    for k in keys:
        v = parameters[k]
        id_str += str(v)            

    return hashlib.md5(id_str.encode()).hexdigest()


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