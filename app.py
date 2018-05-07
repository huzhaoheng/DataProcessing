# coding=utf-8
import os
from flask import Flask, jsonify, render_template, redirect, url_for, request, make_response
from py2neo import Graph, Path, authenticate
import hashlib
import json
from helpers import *
from flask_cors import CORS
import pandas
from py2neo.packages.httpstream import http
from time import gmtime, strftime, localtime
import sys
http.socket_timeout = 9999

app = Flask(__name__)
CORS(app)
authenticate("localhost:7474", "neo4j", "123456")
neo4jUrl = os.environ.get('NEO4J_URL',"http://localhost:7474/db/data/")
graph = Graph(neo4jUrl)
hidden_properties = ['internal_id', 'system_user_username', 'system_user_hashkey']

@app.route('/verification', methods=['GET', 'POST'])
def verification():
    print("request received")
    curr_time = strftime("%a, %d %b %Y %H:%M:%S GMT", gmtime())
    username, data, query_name, structure = request.json["username"], json.loads(request.json["data"]), request.json["name"], json.loads(request.json["structure"])
    with open('sample_structure.json', 'w') as fp:
        json.dump(structure, fp)
    with open('data.json', 'w') as fp:
        json.dump(data, fp)
    hashkey = hashlib.md5((username).encode()).hexdigest()
    parameters = parameterParser(structure)
    parameter_id = generateParameterID(parameters)
    query = "MATCH (d:SystemUser) WHERE d.username = '" + username + "' RETURN d"
    exists = graph.cypher.execute(query)
    redirect_url = "http://listen.online:1111" + url_for('home', username = username, hashkey = hashkey)
    response = make_response(redirect_url)
    response.set_cookie('hashkey', hashkey)
    response.set_cookie('username', username)
    if not exists:
        query = "CREATE (u:SystemUser {username : '" + username + "', hashkey : '" + hashkey + "'})"
        graph.cypher.execute(query)
    query_name_exist = graph.cypher.execute("MATCH (q:Query {name : '" + query_name + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "'}) RETURN q")
    if not query_name_exist:
        query = "MATCH (a:SystemUser {username:'" + username + "'}) CREATE (a)-[:hasQuery]->(b:Query {name:'" + query_name + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "', update_time : '" + curr_time + "'})-[:hasParameter]->(c:QueryParameter {query_name : '" + query_name + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "', parameter_id : '" + parameter_id + "', update_time : '" + curr_time + "'"
        for k, v in parameters.items():
            if v:
                if (type(v) is int) or (type(v) is float):
                    query += ", " + k + ": " + str(v)
                else:
                    query += ", " + k + ": '" + str(v) + "'"
        query += "})"
        graph.cypher.execute(query)
        createQueryParameterStructure(graph, username, hashkey, structure, query_name, parameter_id)
    else:
        query = "MATCH (a:QueryParameter {query_name : '" + query_name + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "', parameter_id : '" + parameter_id + "'}) RETURN a;"
        query_parameter_exist = graph.cypher.execute(query)
        if not query_parameter_exist:
            query = "MATCH (a:Query {name:'" + query_name + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "'}) CREATE (a)-[:hasParameter]->(b:QueryParameter {query_name : '" + query_name + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "', parameter_id : '" + parameter_id + "', update_time : '" + curr_time + "'"
            for k, v in parameters.items():
                if v:
                    if (type(v) is int) or (type(v) is float):
                        query += ", " + k + ": " + str(v)
                    else:
                        query += ", " + k + ": '" + str(v) + "'"
            query += "})"
            graph.cypher.execute(query)
            createQueryParameterStructure(graph, username, hashkey, structure, query_name, parameter_id)
        
    storeData(graph, data, username, hashkey, structure, query_name, parameter_id)
    return response

@app.route('/home')
def home():
    username, hashkey = request.args.get('username'), request.args.get('hashkey')
    return render_template('home.html', username = username, hashkey = hashkey)

@app.route('/getDataStructure')
def getDataStructure():
    username, hashkey = json.loads(request.args.get('arg'))['username'], json.loads(request.args.get('arg'))['hashkey']
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

    return jsonify(elements = ret)

@app.route('/getData')
def getData():
    ret = {}
    query = "match p = (a:Data)-[*]->(b:Data) where not (:Data {system_user_username : '" + username + "'})-[]->(a {system_user_username : '" + username + "'}) and not (b)-[]->(:Data) with a, b match another = (:SystemUser)-[*]->(a)-[*]->(b) return another;"
    res = graph.cypher.execute(query)
    for each in res:
        curr = ret
        path = each.another
        for i, segment in enumerate(path):
            start_node, end_node = dict(segment.start_node.get_properties()), dict(segment.end_node.get_properties())
            if i == 0:
                if start_node['username'] not in curr:
                    curr[start_node['username']] = {}
                curr = curr[start_node['username']]

            elif i == 1:
                if start_node['name'] not in curr:
                    curr[start_node['name']] = {}
                curr = curr[start_node['name']]
            
            elif i == 2:
                if start_node['parameter_id'] not in curr:
                    curr[start_node['parameter_id']] = {}
                curr = curr[start_node['parameter_id']]
            
            else:
                if list(segment.start_node.labels)[0] == 'QueryObject':
                    if list(segment.end_node.labels)[0] == 'QueryObject':
                        if start_node['name'] not in curr:
                            curr[start_node['name']] = {}
                        curr = curr[start_node['name']]
                    else:
                        if start_node['name'] not in curr:
                            curr[start_node['name']] = {'hasData' : {}}
                        curr = curr[start_node['name']]['hasData']

                else:
                    rel_name = segment.properties['name']
                    if start_node['neo4j_id'] not in curr:
                        curr[start_node['neo4j_id']] = start_node

                    if rel_name not in curr[start_node['neo4j_id']]:
                        curr[start_node['neo4j_id']][rel_name] = {}

                    curr = curr[start_node['neo4j_id']][rel_name]

                    if i == len(path) - 1:
                        if end_node['neo4j_id'] not in curr:
                            curr[end_node['neo4j_id']] = end_node

    return jsonify(elements = ret)

@app.route('/getUpdateTime')
def getUpdateTime():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    if result:
        result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()[0][0]
    else:
        result = ""
    return jsonify(elements = {"update_time" : result})

@app.route('/getDataSize')
def getDataSize():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    ret = {'data size' : 0}
    if result:
        dic = {}
        for each in result:
            data = {key:each.d.properties[key] for key in each.d.properties if key not in hidden_properties}
            dic[data['neo4j_id']] = data
        ret['data size'] = sys.getsizeof(dic)
    
    return jsonify(elements = ret)

@app.route('/getRepositoryList')
def getRepositoryList():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    repositoryList = []
    if result:
        result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
        repositoryList = [each[0] for each in result]
    
    return jsonify(elements = {"repositoryList" : repositoryList})

@app.route('/getRepositoryParameters')
def getRepositoryParameters():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    print (result)
    ret = {}
    for each in result:
        repository_name = each.s.properties['parent_repository_name']
        parameter_id = each.s.properties['parameter_id']
        if repository_name not in ret:
            ret[repository_name] = {parameter_id : {}}
            for key in each.s.properties:
                if key not in ['parameter_id', 'parent_repository_name', 'system_user_username', 'system_user_hashkey', 'update_time']:
                    ret[repository_name][parameter_id][key] = each.s.properties[key]
        else:
            ret[repository_name][parameter_id] = {}
            for key in each.s.properties:
                if key not in ['parameter_id', 'parent_repository_name', 'system_user_username', 'system_user_hashkey', 'update_time']:
                    ret[repository_name][parameter_id][key] = each.s.properties[key]
    
    return jsonify(elements = ret)


@app.route('/getRepositoriesData')
def getRepositoriesData():
    ret = {}
    queries = json.loads(request.args.get('arg'))['queries']
    for repository in queries:
        ret[repository] = []
        query = queries[repository]
        result = graph.cypher.execute(query)
        for each in result:
            data = {key:each.d.properties[key] for key in each.d.properties if key not in hidden_properties}
            ret[repository].append(data)

    # print (ret)

    return jsonify(elements = ret)

@app.route('/getRepositoryData')
def getRepositoryData():
    ret = {}
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    for each in result:
        data = {key:each.d.properties[key] for key in each.d.properties if key not in hidden_properties}
        ret[data['neo4j_id']] = data

    return jsonify(elements = ret)

@app.route('/getDatasetData')
def getDatasetData():
    ret = {}
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    for each in result:
        data = {key:each.d.properties[key] for key in each.d.properties if key not in hidden_properties}
        ret[data['neo4j_id']] = data

    return jsonify(elements = ret)

@app.route('/getDatasetList')
def getDatasetList():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    datasetList = []
    if result:
        result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
        datasetList = [each[0] for each in result]
    
    return jsonify(elements = {"datasetList" : datasetList})


@app.route('/getDatasetsData')
def getDatasetsData():
    ret = {}
    queries = json.loads(request.args.get('arg'))['queries']
    for dataset in queries:
        ret[dataset] = []
        query = queries[dataset]
        result = graph.cypher.execute(query)
        for each in result:
            data = {key:each.d.properties[key] for key in each.d.properties if key not in hidden_properties}
            ret[dataset].append(data)

    return jsonify(elements = ret)

@app.route('/getResourcesList')
def getResourcesList():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    resourcesList = []
    if result:
        result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
        resourcesList = [each[0] for each in result]

    return jsonify(elements = {"resourcesList" : resourcesList})


@app.route('/getGraphStructure')
def getGraphStructure():
    ret = None
    query = json.loads(request.args.get('arg'))['query']
    name = json.loads(request.args.get('arg'))['name']
    result = graph.cypher.execute(query)
    if not result:
        ret = {}
    else:
        raw_graph = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
        ret = generateGraphStructure(raw_graph, name)
    return jsonify(elements = ret)

@app.route('/getPropertiesOfObject')
def getPropertiesOfObject():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
    # schema = json.load(open('schemas/' + resource + '_schema.json'))
    ret_dic = {}
    for each in result:
        properties = each[0]
        for Property in properties:
            if Property not in hidden_properties and Property not in ["resource", "object", "neo4j_id"] and Property not in ret_dic:
                ret_dic['_'.join(Property.split("_")[:-1])] = Property.split("_")[-1]

    ret = jsonify(elements = ret_dic)
    return ret

@app.route('/getPath')
def getPath():
    query = json.loads(request.args.get('arg'))['query']
    names = json.loads(request.args.get('arg'))['names']
    result = graph.cypher.execute(query)
    ret = {name : {} for name in names}
    for data in result:
        for name in names:
            cmd = "ret['" + name + "'][data." + name + ".properties['neo4j_id']] = data." + name + ".properties"
            exec(cmd)

    return jsonify(elements = ret)

@app.route('/writeOnlyQuery')
def writeOnlyQuery():
    query = json.loads(request.args.get('arg'))['query']
    ret = None
    try:
        result = graph.cypher.execute(query)
        ret = "Done"
    except Exception as e:
        ret = e
        
    return jsonify(message = {"message" : ret})


#-----------------------------------------------------------------------------------

@app.route('/getResources')
def getResources():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    if result:
        result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
        ret = {i : result[i][0] for i in range(len(result))}
    else:
        ret = {}

    return jsonify(elements = ret)


@app.route('/getObjects')
def getObjects():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    if result:
        result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
        ret = {i : result[i][0] for i in range(len(result))}
    else:
        ret = {}
    return jsonify(elements = ret)

# @app.route('/getProperties')
# def getProperties():
#     query = json.loads(request.args.get('arg'))['query']
#     resource = json.loads(request.args.get('arg'))['resource']
#     obj = json.loads(request.args.get('arg'))['object']
#     result = graph.cypher.execute(query)
#     result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
#     schema = json.load(open('schemas/' + resource + '_schema.json'))
#     ret_dic = {}
#     for each in result:
#         properties = each[0]
#         for Property in properties:
#             if (Property not in ["resource", "object", "neo4j_id", "system_user_username", "system_user_hashkey"]) and (Property not in ret_dic):
#                 ret_dic[Property] = schema[obj][Property]
#     ret = jsonify(elements = ret_dic)
#     return ret


@app.route('/getResourcesAndObjectsPair')
def getResourcesAndObjectsPair():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    if result:
        result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
        pairs = [each[0] for each in result]
    else:
        print ("empty result")
        pairs = []
    
    return jsonify(elements = {"pairs" : pairs})


@app.route('/getNodes')
def getNodes():
    query = json.loads(request.args.get('arg'))['query']
    nodes = map(buildNodes, graph.cypher.execute(query))
    return jsonify(elements = {"nodes": list(nodes)})


@app.route('/getDatasetProperties')
def getDatasetProperties():

    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    ret = {}
    if result:
        result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
        for each in result:
            resource, obj, properties = each
            if (resource + ":" + obj) not in ret:
                ret[resource + ":" + obj] = {}
                for Property in properties:
                    if Property not in ["resource", "object", "neo4j_id", "system_user_username", "system_user_hashkey", "internal_id"]:
                        ret[resource + ":" + obj]['_'.join(Property.split('_')[:-1])] = Property.split('_')[-1]
                    else:
                        ret[resource + ":" + obj][Property] = 'String'
            else:
                for Property in properties:
                    if Property not in ["resource", "object", "neo4j_id", "system_user_username", "system_user_hashkey", "internal_id"] and '_'.join(Property.split('_')[:-1]) not in ret[resource + ":" + obj]:
                        ret[resource + ":" + obj]['_'.join(Property.split('_')[:-1])] = Property.split('_')[-1]
                    elif Property in ["resource", "object", "neo4j_id", "system_user_username", "system_user_hashkey", "internal_id"] and Property not in ret[resource + ":" + obj]:
                        ret[resource + ":" + obj][Property] = "String"
                    else:
                        pass

    else:
        print ("empty result")
    
    return jsonify(elements = ret)




@app.route('/getResourceAndObjectPairs')
def getResourceAndObjectPairs():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
    ret = {}
    for each in result:
        # print (each)
        resource, obj, properties = each[0]
        if resource not in ret:
            ret[resource] = {obj : {}}
            for Property in properties:
                if Property not in ["resource", "object", "neo4j_id", "system_user_username", "system_user_hashkey", "internal_id"]:
                    ret[resource][obj]['_'.join(Property.split("_")[:-1])] = Property.split("_")[-1]
        else:
            if obj not in ret[resource]:
                ret[resource][obj] = {}
                for Property in properties:
                    if Property not in ["resource", "object", "neo4j_id", "system_user_username", "system_user_hashkey", "internal_id"]:
                        ret[resource][obj]['_'.join(Property.split("_")[:-1])] = Property.split("_")[-1]
            else:
                for Property in properties:
                    if Property not in ["resource", "object", "neo4j_id", "system_user_username", "system_user_hashkey", "internal_id"]:
                        if '_'.join(Property.split("_")[:-1]) not in ret[resource][obj]:
                            ret[resource][obj]['_'.join(Property.split("_")[:-1])] = Property.split("_")[-1]


    return jsonify(elements = ret)


@app.route('/getStatisticalReportList')
def getStatisticalReportList():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
    ret = {}
    for each in result:
        report_name, data_selection_queries, functions, names, values = each
        ret[report_name] = [data_selection_queries, functions, names, values]

    return jsonify(elements = ret)

@app.route('/getStatisticalReportResult')
def getStatisticalReportResult():
    queries = json.loads(request.args.get('arg'))['queries']
    functions = json.loads(request.args.get('arg'))['functions']
    names = json.loads(request.args.get('arg'))['names']
    values = json.loads(request.args.get('arg'))['values']
    ret = {}

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
            for label, val in results.items():
                ret[label] = val
    print ("ret:")
    print (ret)
    return jsonify(elements = ret)


@app.route('/getValue')
def getValue():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()[0]
    return jsonify(elements = result)


@app.route('/getValues')
def getValues():
    query = json.loads(request.args.get('arg'))['query']
    function = json.loads(request.args.get('arg'))['function']
    result = graph.cypher.execute(query)
    result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
    res = None
    if function == "MostFrequentWord":
        texts = [each[0] for each in result]
        res = findMostFrequentWords(texts)

    return jsonify(elements = res)

app.secret_key = 'A0Zr98j/3yX R~XHH!jmN]LWX/,?RT'

if __name__ == '__main__':
    app.debug = True
    app.run("0.0.0.0", port = 1111, threaded=True)
