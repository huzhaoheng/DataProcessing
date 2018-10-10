# coding=utf-8
import os
from flask import Flask, jsonify, render_template, redirect, url_for, request, make_response
from py2neo import Graph, Path, authenticate
import hashlib
import json
from helpers_temp import *
from flask_cors import CORS
import pandas
import py2neo
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
    return render_template('home_temp.html', username = username)
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

@app.route('/getStructure')
def getStructure():
    parameter_id = json.loads(request.args.get('arg'))['parameter_id']
    query = """
                MATCH 
                    (a:QueryParameter)-[:hasChild]->(b:Object)-[*]->(c:Object)-[:hasValue]->(d:Value)
                WHERE
                    ID(a) = {parameter_id}
                WITH (b), (c) MATCH p = (b)-[*]-(c) return p;
    """.format(parameter_id = parameter_id)
    result = graph.cypher.execute(query)
    ret = {}
    for path in result:
        curr = ret
        nodes = path["p"].nodes
        for node in nodes:
            props = node.properties
            node_name = props["node_name"]
            if node_name not in curr:
                curr[node_name] = {}

            curr = curr[node_name]

    return jsonify(elements = ret)

@app.route('/queryData')
def queryData():
    structure = json.loads(request.args.get('arg'))['structure']
    parameter_id = json.loads(request.args.get('arg'))['parameter_id']
    dates = json.loads(request.args.get('arg'))['dates']
    startDate = dates['startDate']
    endDate = dates['endDate']
    ret = {}
    queries = queryBuilder(structure, parameter_id, startDate, endDate)
    for [node_alias, query] in queries:
        value_alias = node_alias + "_value"
        obj_id_alias = node_alias + "_obj_id"
        result = graph.cypher.execute(query)
        for each in result:
            value = each[value_alias]
            obj_id = each[obj_id_alias]
            if obj_id not in ret:
                ret[obj_id] = {}
            if node_alias not in ret[obj_id]:
                ret[obj_id][node_alias] = []
            ret[obj_id][node_alias].append(value)
    return jsonify(elements = ret)

@app.route('/storeFormula')
def storeFormula():
    print ("here")
    formula = json.loads(request.args.get('arg'))
    query = """
        WITH 
            {formula} 
        AS 
            formula
        MATCH
            (u:SystemUser {username : formula.username})
        
        MERGE 
            (f:Formula {formulaName : formula.formulaName})
        ON
            CREATE 
        SET 
            f.formulaName = formula.formulaName, 
            f.username = formula.username,
            f.evalCode = formula.evalCode,
            f.writtenCode = formula.writtenCode,
            f.args = formula.args
        ON 
            MATCH
        SET
            f.formulaName = formula.formulaName, 
            f.username = formula.username,
            f.evalCode = formula.evalCode,
            f.writtenCode = formula.writtenCode,
            f.args = formula.args

        MERGE 
            (u)-[:hasFormula]->(f)
    """



    ret = {"message" : "", "status" : ""};
    try:
        result = graph.cypher.execute(query, formula = formula)
        ret["status"] = "success"
        ret["message"] = "Great! Your formula has been successfully created!"
    except Exception as e:
        ret["status"] = "failure"
        ret["message"] = "Oops! Something wrong, check console for more details :("
    return jsonify(elements = ret)

@app.route('/getFormulaList')
def getFormulaList():
    username = json.loads(request.args.get('arg'))['username']
    query = """
        MATCH 
            (f:Formula)
        WHERE
            f.username = '{username}'
        RETURN
            ID(f) AS id,
            f.formulaName AS formulaName
    """.format(username = username)
    ret = {"status" : "", "message" : "", "formulaList" : {}}
    try:
        result = graph.cypher.execute(query)
        # ret["formulaList"] = [each['formulaName'] for each in result]
        ret["status"] = "success"
        ret["message"] = "Great! Your formula has been successfully created!"
        for each in result:
            formulaName = each["formulaName"]
            formulaID = each["id"]
            ret["formulaList"][formulaID] = formulaName
    except Exception as e:
        print (e)
        ret["status"] = "failure"
        ret["message"] = "Oops! Something wrong, check console for more details :("
    return jsonify(elements = ret)

@app.route('/deleteFormula')
def deleteFormula():
    formulaID = json.loads(request.args.get('arg'))['formulaID']
    query = """
        MATCH
            (f:Formula)
        WHERE
            ID(f) = {formulaID}
        DETACH DELETE
            f
    """.format(formulaID = formulaID)
    ret = {"status" : "", "message" : ""}
    try:
        graph.cypher.execute(query)
        ret["status"] = "success"
        ret["message"] = "Successfully delete your formula"
    except Exception as e:
        ret["status"] = "failure"
        ret["message"] = "Oops! Something wrong, check console for more details :("
    return jsonify(elements = ret)

@app.route('/loadFormula')
def loadFormula():
    formulaID = json.loads(request.args.get('arg'))['formulaID']
    query = """
        MATCH
            (f:Formula)
        WHERE
            ID(f) = {formulaID}
        RETURN
            f.formulaName AS formulaName,
            f.username AS username,
            f.evalCode AS evalCode,
            f.writtenCode AS writtenCode,
            f.args AS args
    """.format(formulaID = formulaID)
    ret = {"status" : "", "message" : "", "formula":{}}
    try:
        result= graph.cypher.execute(query)
        ret["status"] = "success"
        ret["message"] = "Successfully loaded your formula"
        for each in result:
            ret["formula"]["formulaName"] = each["formulaName"]
            ret["formula"]["username"] = each["username"]
            ret["formula"]["evalCode"] = each["evalCode"]
            ret["formula"]["writtenCode"] = each["writtenCode"]
            ret["formula"]["args"] = each["args"]
    except Exception as e:
        ret["status"] = "failure"
        ret["message"] = "Oops! Something wrong, check console for more details :("
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


@app.route('/textFunction')
def textFunction():
    data = json.loads(request.args.get('arg'))['data']
    textFunctionName = json.loads(request.args.get('arg'))['textFunctionName']
    parameters = json.loads(request.args.get('arg'))['parameters']
    result = applyTextFunction(textFunctionName, data, textAPIClient, parameters)
    return jsonify(elements = result)

app.secret_key = 'A0Zr98j/3yX R~XHH!jmN]LWX/,?RT'

if __name__ == '__main__':
    app.debug = True
    app.run("0.0.0.0", port = 1111, threaded=True)
