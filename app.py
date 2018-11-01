# coding=utf-8
import os
from flask import Flask, jsonify, render_template, redirect, url_for, request, make_response
from py2neo import Graph, Path, authenticate
import hashlib
import json
from helpers import *
from flask_cors import CORS
import pandas
import py2neo
from py2neo.packages.httpstream import http
from time import gmtime, strftime, localtime
import sys
from aylienapiclient import textapi
import MySQLdb

http.socket_timeout = 9999

app = Flask(__name__)
CORS(app)
authenticate("localhost:7474", "neo4j", "123456")
neo4jUrl = os.environ.get('NEO4J_URL',"http://localhost:7474/db/data/")
graph = Graph(neo4jUrl)
textAPIClient = textapi.Client("bcbe7ef4", "627c1e3eeb321a490f68057c197cee6f")
db = MySQLdb.connect(
    host = "localhost", 
    user = "root", 
    passwd = "root", 
    db = "ListenOnline",
    use_unicode=True,
    charset = "utf8mb4"
)
# db.autocommit(True)
db.ping(True)
cursor = db.cursor()
cursor.execute("SET NAMES utf8mb4;")
cursor.execute("SET CHARACTER SET utf8mb4;")
cursor.execute("SET character_set_connection=utf8mb4;")

cursor.execute("CREATE TABLE IF NOT EXISTS OWNERS (username TEXT NOT NULL, originalTableName TEXT NOT NULL, derivedTableName TEXT NOT NULL);")
db.commit()

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
    return render_template('home.html', username = username)
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

@app.route('/loadFormulaByID')
def loadFormulaByID():
    formulaIDList = json.loads(request.args.get('arg'))['formulaIDList']
    query = """
        MATCH
            (f:Formula)
        WHERE
            ID(f) IN [{formulaIDList}]
        RETURN
            f.formulaName AS formulaName,
            f.username AS username,
            f.evalCode AS evalCode,
            f.writtenCode AS writtenCode,
            f.args AS args
    """.format(formulaIDList = ",".join(formulaIDList))
    ret = {"status" : "", "message" : "", "formula":[]}
    try:
        result= graph.cypher.execute(query)
        ret["status"] = "success"
        ret["message"] = "Successfully loaded your formula"
        for each in result:
            ret["formula"].append({
                "formulaName" : each["formulaName"],
                "username" : each["username"],
                "evalCode" : each["evalCode"],
                "writtenCode" : each["writtenCode"],
                "args" : each["args"],
            })
    except Exception as e:
        ret["status"] = "failure"
        ret["message"] = "Oops! Something wrong, check console for more details :("
    return jsonify(elements = ret)

@app.route('/loadFormulaByUser')
def loadFormulaByUser():
    username = json.loads(request.args.get('arg'))['username']
    query = """
        MATCH
            (f:Formula)
        WHERE
            f.username = "{username}"
        RETURN
            f.formulaName AS formulaName,
            f.username AS username,
            f.evalCode AS evalCode,
            f.writtenCode AS writtenCode,
            f.args AS args
    """.format(username = username)
    ret = {"status" : "", "message" : "", "formula":[]}
    try:
        result= graph.cypher.execute(query)
        ret["status"] = "success"
        ret["message"] = "Successfully loaded your formula"
        for each in result:
            ret["formula"].append({
                "formulaName" : each["formulaName"],
                "username" : each["username"],
                "evalCode" : each["evalCode"],
                "writtenCode" : each["writtenCode"],
                "args" : each["args"],
            })
    except Exception as e:
        ret["status"] = "failure"
        ret["message"] = "Oops! Something wrong, check console for more details :("
    return jsonify(elements = ret)

@app.route('/textFunction')
def textFunction():
    data = json.loads(request.args.get('arg'))['data']
    textFunctionName = json.loads(request.args.get('arg'))['textFunctionName']
    parameters = json.loads(request.args.get('arg'))['parameters']
    result = applyTextFunction(textFunctionName, data, textAPIClient, parameters)
    return jsonify(elements = result)

@app.route('/saveSheets')
def saveSheets():
    username = json.loads(request.args.get('arg'))['username']
    originalTableName = json.loads(request.args.get('arg'))['name']
    data = json.loads(request.args.get('arg'))['data']
    columns = json.loads(request.args.get('arg'))['columns']
    derivedTableName = "_".join([username, originalTableName])

    status = "success"
    message = "Table saved"
    try:
        query = "SELECT * FROM OWNERS WHERE derivedTableName = '{derivedTableName}'".format(derivedTableName = derivedTableName)
        cursor.execute(query)
        db.commit()
        result = cursor.fetchall()
        if len(result) == 0:
            query = "CREATE TABLE IF NOT EXISTS {table} ({columns} TEXT);".format(table = derivedTableName, columns = " TEXT, ".join(columns))
            cursor.execute(query)
            query = "ALTER TABLE {table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;".format(table = derivedTableName)
            cursor.execute(query)
            query = """
                INSERT INTO 
                    OWNERS (username, originalTableName, derivedTableName) 
                VALUES ('{username}', '{originalTableName}', '{derivedTableName}');
                """.format(
                    username = username,
                    originalTableName = originalTableName,
                    derivedTableName = derivedTableName
                )
            cursor.execute(query)

        for each in data:
            query = "INSERT INTO {table} ({columns}) VALUES (".format(table = derivedTableName, columns = ", ".join(columns))
            for column in columns:
                query += " '{value}',".format(value = each[column].replace("'", "''")) if each[column] else " NULL,"

            query = query[:-1] + ");"
            cursor.execute(query)

        db.commit()
    except Exception as e:
        message = str(e)
        status = "failure"
        
    ret = {"status" : status, "message" : message}

    return jsonify(elements = ret)

@app.route('/getStoredTables')
def getStoredTables():
    username = json.loads(request.args.get('arg'))['username']
    query = "SELECT originalTableName, derivedTableName FROM OWNERS WHERE username = '{username}'".format(username = username)
    cursor.execute(query)
    db.commit()
    result = cursor.fetchall()
    originalTableNameList = [each[0] for each in result]
    derivedTableNameList = [each[1] for each in result]

    return jsonify(elements = {"originalTableNameList" : originalTableNameList, "derivedTableNameList" : derivedTableNameList})

@app.route('/loadTable')
def loadTable():
    username = json.loads(request.args.get('arg'))['username']
    originalTableName = json.loads(request.args.get('arg'))['table']

    query = """
        SELECT 
            derivedTableName 
        FROM 
            OWNERS 
        WHERE 
            username = '{username}' AND originalTableName = '{originalTableName}'
    """.format(username = username, originalTableName = originalTableName)
    cursor.execute(query)
    db.commit()
    result = cursor.fetchall()
    derivedTableName = result[0][0]

    
    query = "DESCRIBE  {derivedTableName}".format(derivedTableName = derivedTableName)
    cursor.execute(query)
    db.commit()
    result = cursor.fetchall()
    columns = [each[0] for each in result]

    query = "SELECT {columns} FROM {derivedTableName};".format(columns = ', '.join(columns), derivedTableName = derivedTableName)
    cursor.execute(query)
    db.commit()
    result = cursor.fetchall()

    data = []
    for row in result:
        record = {}
        for i, column in enumerate(columns):
            record[column] = row[i]
        data.append(record)

    return jsonify(elements = {"data" : data, 'columns' : columns})

@app.route('/runQuery')
def runQuery():
    query = json.loads(request.args.get('arg'))['query']
    ret = {"message" : None, "data" : []}
    try:
        cursor.execute(query)
        db.commit()
        result = cursor.fetchall()
        ret['message'] = "Done"
        for each in result:
            ret["data"].append(list(each))
    except Exception as e:
        ret['message'] = str(e)

    return jsonify(elements = ret)

@app.route('/deleteTable')
def deleteTable():
    originalTableName = json.loads(request.args.get('arg'))['originalTableName']
    derivedTableName = json.loads(request.args.get('arg'))['derivedTableName']
    username = json.loads(request.args.get('arg'))['username']
    message = "Table {originalTableName} deleted".format(originalTableName = originalTableName)
    status = "success"
    query = """
            DELETE FROM 
                OWNERS 
            WHERE 
                username = '{username}' 
                AND 
                originalTableName = '{originalTableName}'
                AND
                derivedTableName = '{derivedTableName}'
    """.format(username = username, originalTableName = originalTableName, derivedTableName = derivedTableName)
    try:
        query = """
            DELETE FROM 
                OWNERS 
            WHERE 
                username = '{username}' 
                AND 
                originalTableName = '{originalTableName}'
                AND
                derivedTableName = '{derivedTableName}'
        """.format(username = username, originalTableName = originalTableName, derivedTableName = derivedTableName)
        cursor.execute(query)
        query = "DROP TABLE {derivedTableName}".format(derivedTableName = derivedTableName)
        cursor.execute(query)
        db.commit()
    except Exception as e:
        message = str(e)
        status = "failure"

    ret = {"status" : status, "message" : message}
    return jsonify(elements = ret)

app.secret_key = 'A0Zr98j/3yX R~XHH!jmN]LWX/,?RT'

if __name__ == '__main__':
    app.debug = True
    app.run("0.0.0.0", port = 1111, threaded=True)
