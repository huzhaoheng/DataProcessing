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
from aylienapiclient import textapi
http.socket_timeout = 9999

app = Flask(__name__)
CORS(app)
authenticate("localhost:7474", "neo4j", "123456")
neo4jUrl = os.environ.get('NEO4J_URL',"http://localhost:7474/db/data/")
graph = Graph(neo4jUrl)
textAPIClient = textapi.Client("bcbe7ef4", "627c1e3eeb321a490f68057c197cee6f")

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
    parameter_id = generateParameterID(parameters, username)
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
    return render_template('home_temp.html', username = username, hashkey = hashkey)
#----------------------------------------------------------------------------------------
@app.route('/getQueries')
def getQueries():
    username = json.loads(request.args.get('arg'))['username']
    query = """
                MATCH
                    (q:Query)
                WHERE
                    q.username = '{username}'
                RETURN
                    q.name, ID(q), q.comment
    """.format(username = username)
    ret = {}
    result = graph.cypher.execute(query)
    for each in result:
        ret[each["q.name"]] = {"ID" : each["ID(q)"], "comment" : each["q.comment"]}
    return jsonify(elements = ret)

@app.route('/getParameters')
def getParameters():
    query_id = json.loads(request.args.get('arg'))['query_id']
    query = """
                MATCH 
                    (q:Query)-[r:hasParameter]->(p:QueryParameter)
                RETURN
                    p
    """
    ret = {}
    result = graph.cypher.execute(query)
    for each in result:
        parameter_node_id = each["p"]._id
        parameters = each["p"].properties
        ret[parameter_node_id] = {}
        for k, v in parameters.items():
            if k not in ["username", "parameter_hash"]:
                ret[parameter_node_id][k] = v

    return jsonify(elements = ret)

@app.route('/setNodeProperties')
def setNodeProperties():
    node_id = json.loads(request.args.get('arg'))['id']
    key = json.loads(request.args.get('arg'))['key']
    value = json.loads(request.args.get('arg'))['value']
    val_type = json.loads(request.args.get('arg'))['type']
    value_str=  None
    if val_type == "string":
        value_str = '"{value}"'.format(value = value.replace('"', "'"))
    else:
        value_str = '{value}'.format(value = value)

    query = """
                MATCH
                    (n)
                WHERE
                    ID(n) = {node_id}
                SET
                    n.{key} = {value}
    """.format(node_id = node_id, key = key, value = value_str)

    ret = {"message" : "Done"}
    try:
        graph.cypher.execute(query)
    except Exception as e:
        ret["message"] = "Error"

    return jsonify(elements = ret) 

#----------------------------------------------------------------------------------------

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

@app.route('/getDataByPath')
def getDataByPath():
    path = json.loads(request.args.get('arg'))['path']
    ret = []
    query = "MATCH p="
    for node in path:
        query += "(:" + node['label'] + " {" + node['identifier'] + ":'" + node[node['identifier']] + "'})"
        query += "-[]->"
    query += "(d:Data) RETURN d"
    res = graph.cypher.execute(query)
    for each in res:
        ret.append(each.d.properties)
        # print (each.d.properties)
    return jsonify(elements = ret)


@app.route('/textAnalysis')
def textAnalysis():
    data = json.loads(request.args.get('arg'))['data']
    textFunctionName = json.loads(request.args.get('arg'))['textFunctionName']
    result = applyTextFunction(textFunctionName, data, textAPIClient)
    return jsonify(elements = result)

app.secret_key = 'A0Zr98j/3yX R~XHH!jmN]LWX/,?RT'

if __name__ == '__main__':
    app.debug = True
    app.run("0.0.0.0", port = 1111, threaded=True)