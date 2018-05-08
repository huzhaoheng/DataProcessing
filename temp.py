import json
import hashlib
import numpy as np
from py2neo import Graph, Path, authenticate
from py2neo import Node
from GraphGenerator import GraphGenerator
from DataLoader import DataLoader
import os
import pandas
from py2neo.packages.httpstream import http
http.socket_timeout = 9999


authenticate("localhost:7474", "neo4j", "123456")
neo4jUrl = os.environ.get('NEO4J_URL',"http://localhost:7474/db/data/")
graph = Graph(neo4jUrl)


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


def getStatisticalReportResult():
    # queries = json.loads(request.args.get('arg'))['queries']
    # functions = json.loads(request.args.get('arg'))['functions']
    # names = json.loads(request.args.get('arg'))['names']
    # values = json.loads(request.args.get('arg'))['values']


    queries = ["MATCH (d:Data)-[r:InDataset]->(s:Dataset) WHERE s.system_user_username = 'hu61' AND s.system_user_hashkey = 'b87df872aad4d56866f33699d4177631' AND s.name = 'youtubeDataAboutHealth' AND d.resource = 'youtube' AND d.object = 'videoStatistics' RETURN d.viewCount_Int", "MATCH (d:Data)-[r:InDataset]->(s:Dataset) WHERE s.system_user_username = 'hu61' AND s.system_user_hashkey = 'b87df872aad4d56866f33699d4177631' AND s.name = 'youtubeDataAboutCancer' AND d.resource = 'youtube' AND d.object = 'videoStatistics' RETURN d.viewCount_Int", "MATCH (d:Data)-[r:InDataset]->(s:Dataset) WHERE s.system_user_username = 'hu61' AND s.system_user_hashkey = 'b87df872aad4d56866f33699d4177631' AND s.name = 'youtubeDataAboutBlood' AND d.resource = 'youtube' AND d.object = 'videoStatistics' RETURN d.viewCount_Int"]
    functions = ['AVG', 'AVG', 'AVG']
    names = ['avgViewCountOfHeathVideo', 'avgViewCountOfCancerVideo', 'avgViewCountOfBloodVideo']
    values = None

    ret = {}

    # print ('-------------------')
    # print ('values:')
    # print (values)
    # print ('-------------------')

    if values:
        temp = values.split("),(")
        values_list = []
        for i, each in enumerate(temp):
            to_push = None
            if i != 0 and i != len(temp) - 1:
                values_list.append(each)
            else:
                if i == 0 and i == len(temp) - 1:
                    values_list.append(each.lstrip('(').rstrip(')'))
                elif i == 0:
                    values_list.append(each.lstrip('('))
                else:
                    values_list.append(each.rstrip(')'))
        

    
        for i, name in enumerate(names):
            query = queries[i]
            function = functions[i]
            inputs = values_list[i]
            result = graph.cypher.execute(query)
            result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
            data = []
            for each in result:
                if type(each[0]) is str:
                    data.append(each[0])
                elif type(each[0]) is list:
                    data += each[0]
                else:
                    pass
            # data = [each[0] for each in result]
            results = applyStatisticalFunction(data, function, inputs, name)
            for label, val in results.items():
                ret[label] = val

    else:
        for i, name in enumerate(names):
            query = queries[i]
            function = functions[i]
            result = graph.cypher.execute(query)
            result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
            data = []
            for each in result:
                if type(each[0]) is list:
                    data += each[0]
                else:
                    data.append(each[0])
            # data = [each[0] for each in result]
            results = applyStatisticalFunction(data, function, None, name)
            print ("results:")
            print (results)
            for label, val in results.items():
                ret[label] = val
    print ("ret:")
    print (ret)

# getStatisticalReportResult()

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

# structure = json.load(open('sample_structure.json'))
# ret = parameterParser(structure)
# print (ret)

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


def storeData(graph, data, username, hashkey, structure, query_name, parameter_id):
    loader = DataLoader(graph, data, username, hashkey, structure, query_name, parameter_id)
    loader.storeData()
    return {"msg" : "Done"}


data = json.load(open('data.json'))
username = 'hu61'
hashkey = 'b87df872aad4d56866f33699d4177631'
structure = json.load(open('sample_structure.json'))
query_name = 'twitter query'
parameter_id = '778d25a2d92122bae87df572ee2b3a53'


# createQueryParameterStructure(graph, username, hashkey, structure, query_name, parameter_id)
storeData(graph, data, username, hashkey, structure, query_name, parameter_id)


def getDataStructure():
    ret = {}
    query = "MATCH p=(:SystemUser {username : '" + username + "'})-[*]->(x:QueryObject) WITH p, x MATCH (x)-[:hasData]->(d) RETURN p, d;"
    res = graph.cypher.execute(query)
    for each in res:
        node = dict(each.d.get_properties())
        path = each.p
        label_path = []
        query_parameter = None
        for i, segment in enumerate(path):
            start_node, end_node = dict(segment.start_node.get_properties()), dict(segment.end_node.get_properties())
            if i == 0:
                start_label, end_label = start_node['username'], end_node['name']
                label_path = [start_label, end_label]

            elif i == 1:
                label_path.append(end_node['parameter_id'])
                # label_path.append("query parameter")
                query_parameter = end_node

            else:
                label_path.append(end_node['name'])

        curr = ret
        for i, label in enumerate(label_path):
            if label not in curr:
                curr[label] = {'children' : {}, 'data' : {}}
            else:
                pass

            if i == len(label_path) - 1:
                curr[label]['data'][node['neo4j_id']] = node
            elif i == 2:
                curr[label]['data'] = query_parameter
            else:
                pass

            curr = curr[label]['children']

    return ret

    # print ("==================================")
    


# with open('paths.json', 'w') as fp:
#     json.dump(getDataStructure(), fp)

# ret = {}
# query = "match p = (a:Data)-[*]->(b:Data) where not (:Data {system_user_username : '" + username + "'})-[]->(a {system_user_username : '" + username + "'}) and not (b)-[]->(:Data) with a, b match another = (:SystemUser)-[*]->(a)-[*]->(b) return another;"
# print (query)
# res = graph.cypher.execute(query)
# print (res)
# for each in res:
#     curr = ret
#     path = each.another
#     for i, segment in enumerate(path):
#         start_node, end_node = dict(segment.start_node.get_properties()), dict(segment.end_node.get_properties())
#         if i == 0:
#             if start_node['username'] not in curr:
#                 curr[start_node['username']] = {}
#             curr = curr[start_node['username']]

#         elif i == 1:
#             if start_node['name'] not in curr:
#                 curr[start_node['name']] = {}
#             curr = curr[start_node['name']]
        
#         elif i == 2:
#             if start_node['parameter_id'] not in curr:
#                 curr[start_node['parameter_id']] = {}
#             curr = curr[start_node['parameter_id']]
        
#         else:
#             if list(segment.start_node.labels)[0] == 'QueryObject':
#                 if list(segment.end_node.labels)[0] == 'QueryObject':
#                     if start_node['name'] not in curr:
#                         curr[start_node['name']] = {}
#                     curr = curr[start_node['name']]
#                 else:
#                     if start_node['name'] not in curr:
#                         curr[start_node['name']] = {'hasData' : {}}
#                     curr = curr[start_node['name']]['hasData']

#             else:
#                 rel_name = segment.properties['name']
#                 if start_node['neo4j_id'] not in curr:
#                     curr[start_node['neo4j_id']] = start_node

#                 if rel_name not in curr[start_node['neo4j_id']]:
#                     curr[start_node['neo4j_id']][rel_name] = {}

#                 curr = curr[start_node['neo4j_id']][rel_name]

#                 if i == len(path) - 1:
#                     if end_node['neo4j_id'] not in curr:
#                         curr[end_node['neo4j_id']] = end_node
            


# with open('temp.json', 'w') as fp:
#     json.dump(ret, fp)