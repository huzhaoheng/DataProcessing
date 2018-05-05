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


def parseQueryParameterStructure(username, hashkey, structure, query_name, parameter_id):
    name, output, children, selected = structure['name'], structure['output'], structure['children'], structure['selected']
    if selected:
        if not children:
            return None
        else:    
            ret = {
                    'system_user_username' : username, 
                    'system_user_hashkey' : hashkey, 
                    'query_name' : query_name,
                    'parameter_id' : parameter_id,
                    'name' : name,
                    'children' : []
                }

            try:
                ret['object_name'] = output['type']['ofType']['name']
            except Exception as e:
                ret['object_name'] = ''

            for child in children:
                child_structure = parseQueryParameterStructure(username, hashkey, child, query_name, parameter_id)
                if child_structure:
                    ret['children'].append(child_structure)
            return ret
    else:
        return None


def storeData(graph, data, username, hashkey, structure, repository, parameter_id):
    gg = GraphGenerator(username, hashkey, data, structure)
    nodes, edges = gg.generateGraph()
    loader = DataLoader(graph, nodes, edges, username, hashkey, repository, parameter_id)
    loader.storeData()
    return {"msg" : "Done"}

def generateGraphStructure(raw_graph, name):
    graph = {}
    for each in raw_graph:
        if len(each[0].split('->')) == 1:
            element = each[0]
            graph[element] = {}
                
        else:
            source, relation, target = each[0].split('->')
            if source not in graph:
                graph[source] = {"relation->" + relation : {target : {}}}
            elif "relation->" + relation not in graph[source]:
                graph[source]["relation->" + relation] = {target : {}}
            elif target not in graph[source]["relation->" + relation]:
                graph[source]["relation->" + relation][target] = {}
            else:
                pass

    ret = {name : {'relation->has' : graph}}

    return ret

def applyStatisticalFunction(data, function, values, name):
    if function == 'COUNT':
        return {name : len(data)}
    elif function == 'COUNT DISTINCT':
        return {name : len(set(data))}
    elif function == 'MAX':
        return {name : max(data)}
    elif function == 'MIN':
        return {name : min(data)}
    elif function == 'AVG':
        # return {name : np.average(data)}
        return {name : np.nanmean(data)}
        # return sum(data) / len(data)
    elif function == 'SUM':
        return {name : sum(data)}
    elif function == 'STDEV':
        return {name : np.std(data)}
    elif function == 'WORD FREQ':
        ret = {}
        long_string = '  '.join(data).lower()
        values_list = values.split(',')        
        for value in values_list:
            phrase = value.rstrip().lstrip().lower()
            label = name + " : " + value
            count = max(len(long_string.split(phrase)) - 1, 0)
            ret[label] = count
        return ret
    else:
        return None

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

def generateParameterID(parameters):
    s = json.dumps(parameters)
    return hashlib.md5(s.encode()).hexdigest()