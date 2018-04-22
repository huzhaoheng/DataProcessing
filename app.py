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
    username, data, repository, structure = request.json["username"], json.loads(request.json["data"]), request.json["name"], json.loads(request.json["structure"])
    hashkey = hashlib.md5((username).encode()).hexdigest()
    query = "MATCH (d:SystemUser) WHERE d.username = '" + username + "' RETURN d"
    exists = graph.cypher.execute(query)
    fp = open("data.txt", "w", encoding = "utf-8")
    fp.write(json.dumps(data))
    fp.close()
    # redirect_url = "http://127.0.0.1:1111" + url_for('home', username = username, hashkey = hashkey)
    redirect_url = "http://listen.online:1111" + url_for('home', username = username, hashkey = hashkey)
    response = make_response(redirect_url)
    response.set_cookie('hashkey', hashkey)
    response.set_cookie('username', username)
    if not exists:
        query = "CREATE (u:SystemUser {username : '" + username + "', hashkey : '" + hashkey + "'})"
        graph.cypher.execute(query)
    repository_exist = graph.cypher.execute("MATCH (r:Repository {name : '" + repository + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "'}) RETURN r")
    if not repository_exist:
        query = "CREATE (r:Repository {name : '" + repository + "', system_user_username : '" + username + "', system_user_hashkey : '" + hashkey + "'})"
        graph.cypher.execute(query)
        query = "MATCH (a:SystemUser {username:'" + username + "'}), (b:Repository {name:'" + repository + "', system_user_username : '" + username + "'}) CREATE (a)-[r:hasRepository]->(b);"
        graph.cypher.execute(query)

    storeData(graph, data, username, hashkey, structure, repository)

    return response

@app.route('/home')
def home():
    username, hashkey = request.args.get('username'), request.args.get('hashkey')
    return render_template('home.html', username = username, hashkey = hashkey)


@app.route('/getRepositoryList')
def getRepositoryList():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    repositoryList = []
    if result:
        result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
        repositoryList = [each[0] for each in result]
    
    return jsonify(elements = {"repositoryList" : repositoryList})

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
    print (query)
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


# @app.route('/getStatisticalReportList')
# def getStatisticalReportList():
#     query = json.loads(request.args.get('arg'))['query']
#     result = graph.cypher.execute(query)
#     result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
#     ret = {}
#     for each in result:
#         name, query = each
#         ret[name] = query

#     return jsonify(elements = ret)

@app.route('/getStatisticalReportList')
def getStatisticalReportList():
    query = json.loads(request.args.get('arg'))['query']
    result = graph.cypher.execute(query)
    result = pandas.DataFrame(result.records, columns=result.columns).values.tolist()
    print (result)
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
        

    ret = {}
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
