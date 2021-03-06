# coding=utf-8
import os
from flask import Flask, jsonify, render_template, redirect, url_for, request, make_response, Response
from py2neo import Graph, Path, authenticate
import json
from helpers import *
from flask_cors import CORS
import py2neo
from py2neo.packages.httpstream import http
from time import gmtime, strftime, localtime
import sys
from aylienapiclient import textapi
import pymysql
from genson import SchemaBuilder
import time
import datetime
import re
pymysql.install_as_MySQLdb()

import MySQLdb

http.socket_timeout = 9999

app = Flask(__name__)
CORS(app)
authenticate("localhost:7474", "neo4j", "123456")
neo4jUrl = os.environ.get('NEO4J_URL',"http://localhost:7474/db/data/")
graph = Graph(neo4jUrl)
textAPIClient = textapi.Client("bcbe7ef4", "627c1e3eeb321a490f68057c197cee6f")
db = MySQLdb.connect(
    host = "127.0.0.1", 
    user = "root", 
    passwd = "root", 
    # db = "ListenOnline",
    use_unicode=True,
    charset = "utf8mb4"
)
# db.autocommit(True)
db.ping(True)
cursor = db.cursor(MySQLdb.cursors.DictCursor)
cursor.execute("SELECT VERSION();")
db.commit()
MYSQLVERSION = cursor.fetchall()[0]['VERSION()']
print (MYSQLVERSION)
cursor.execute("CREATE DATABASE IF NOT EXISTS ListenOnline")
cursor.execute("USE ListenOnline")
cursor.execute("SET NAMES utf8mb4;")
cursor.execute("SET CHARACTER SET utf8mb4;")
cursor.execute("SET character_set_connection=utf8mb4;")

cursor.execute("CREATE TABLE IF NOT EXISTS OWNERS (username TEXT NOT NULL, originalTableName TEXT NOT NULL, derivedTableName TEXT NOT NULL);")
db.commit()

@app.route('/home/handshake', methods=['GET', 'POST'])
def handshake():
    print ("handshaking started")
    print (request.json)
    # requese.json example: {'user': {'id': '6ee840e0-f541-11e8-b36a-d331d74ace97', 'name': 'Zhaoheng', 'email': 'hu61@illinois.edu'}}
    rawUsername = request.json['user']['name']
    username = re.sub('[\W_]+', '', rawUsername)
    email = request.json['user']['email']
    userID = request.json['user']['id']
    res = validateUserNode(username, email, userID, graph)
    print (res)
    return Response("{'message':'handshaking from dataprocessing'}", status=201, mimetype='application/json')

@app.route('/home', methods=['GET', 'POST'])
def home():
    print ("request received in /home")
    payload = request.json
    if payload:
        # userInfo = json.loads(request.json["user"])
        # queryInfo = json.loads(request.json["value"])
        # username = userInfo["name"]
        # data = queryInfo["result"]
        # query_name = queryInfo["queryName"]
        # structure = queryInfo["structure"]

        queryType = payload['type']
        userID = payload['user']['id']
        username = getUserNameByUserID(userID, graph)
        print (username)
        if queryType == 'query':
            query_name = payload['value']['name']
            data = json.loads(payload['value']['data'])
            structure = json.loads(payload['value']['structure'])
            json.dump(structure, open("sample_structure.json", "w"))
            parsed_parameters = parameterParser(structure)
            builder = SchemaBuilder()
            builder.add_object(data)
            schema = builder.to_schema()
            user_id = graph.cypher.execute("MATCH (u:SystemUser) WHERE u.username = '{username}' RETURN ID(u) AS id".format(username = username))[0]["id"]
            query_id = validateQueryNode(username, query_name, graph)
            parameter_id = validateParameterNode(username, query_name, parsed_parameters, graph)
            connectNodes(user_id, query_id, "hasQuery", graph)
            connectNodes(query_id, parameter_id, "hasParameter", graph)
            validateDataStructure(parameter_id, schema, "root", graph)
            curr_time = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            print ("transaction begins")
            startTime = time.time()
            tx = graph.cypher.begin()
            storeData(data, schema, "root", parameter_id, curr_time, tx, graph)
            tx.commit()
            endTime = time.time()
            print ("dataprocessing finished")
            print ("Duration:", endTime - startTime)

        else:
            json.dump(payload, open("payload.json", "w"))
            metaQueryName = payload["value"]["name"]
            structure = payload["value"]["structure"]
            stages = structure["stages"]
            nodesMapping = generateNodesMapping(stages)
            numStages = len(stages)
            for i in range(numStages - 1, -1, -1):
                stage = stages[i]
                nodes = stage["nodes"]
                #last basic query
                if len(nodes) == 1 and nodes[0]["type"] == "query":
                    node = nodes[0]
                    query_name = node["name"]
                    user_id = graph.cypher.execute("MATCH (u:SystemUser) WHERE u.username = '{username}' RETURN ID(u) AS id".format(username = username))[0]["id"]
                    query_id = validateQueryNode(username, query_name, graph)
                    connectNodes(user_id, query_id, "hasQuery", graph)
                    nestedSchema = generateNodeSchema(node, nodesMapping)   
                    parameter_id = validateParameterNode(username, query_name, nestedSchema, graph)                     
                    connectNodes(query_id, parameter_id, "hasParameter", graph)
                    data = generateDataFromNode(node)
                    storeDataStructure(data, "root", parameter_id, graph)
                    curr_time = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
                    print ("transaction begins")
                    startTime = time.time()
                    tx = graph.cypher.begin()
                    storeDataInMetaQuery(data, "root", parameter_id, curr_time, tx, graph)
                    tx.commit()
                    endTime = time.time()
                    print ("dataprocessing finished")
                    print ("Duration:", endTime - startTime)
                    break


        return render_template('index.html', username = username)

    else:
        return render_template('login.html')        

@app.route('/verifyUser')
def verifyUser():
    rawUsername = json.loads(request.args.get('arg'))['username']
    username = re.sub('[\W_]+', '', rawUsername)
    email = json.loads(request.args.get('arg'))['email']
    query = """
        MATCH (u:SystemUser)
        WHERE u.username = '{username}'
        AND u.email = '{email}'
        RETURN u
    """.format(username = username, email = email)
    result = graph.cypher.execute(query)
    ret = {}
    print (result)
    if not result:
        ret = {"valid" : False, "url" : None}
    else:
        ret = {"valid" : True, "url" : url_for('index', username = username)}
        
    return jsonify(elements = ret)

@app.route('/index')
def index():
    args = request.args.to_dict()
    print (args)
    rawUsername = args['username']
    username = re.sub('[\W_]+', '', rawUsername)
    return render_template('index.html', username = username)
    

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
                WHERE
                    ID(q) = {query_id}
                RETURN
                    p
    """.format(query_id = query_id)
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
    # query = """
    #             MATCH 
    #                 (a:QueryParameter)-[:hasChild]->(b:Object)-[*]->(c:Object)-[:hasValue]->(d:Value)
    #             WHERE
    #                 ID(a) = {parameter_id}
    #             WITH 
    #                 (b), (c) 
    #             MATCH 
    #                 p = (b)-[*]-(c) 
    #             RETURN p;
    # """.format(parameter_id = parameter_id)

    query = """
                MATCH 
                    p = (a:QueryParameter)-[:hasChild]->(b:StructureObject)-[*]->(c:StructureObject)
                WHERE
                    ID(a) = {parameter_id}
                AND
                    NOT((c)-[:hasChild]->(:StructureObject))
                RETURN 
                    p;
    """.format(parameter_id = parameter_id)
    result = graph.cypher.execute(query)
    ret = {}
    for path in result:
        curr = ret
        nodes = path["p"].nodes
        for node in nodes[1:]:
            props = node.properties
            node_name = props["node_name"]
            if node_name not in curr:
                curr[node_name] = {}

            curr = curr[node_name]
    
    return jsonify(elements = ret)

# @app.route('/queryData')
# def queryData():
#     paths = json.loads(request.args.get('arg'))['paths']
#     parameter_id = json.loads(request.args.get('arg'))['parameter_id']
#     dates = json.loads(request.args.get('arg'))['dates']
#     startDate = dates['startDate']
#     endDate = dates['endDate']
#     ret = {"data" : {}, "queries" : []}
#     queries = [queryBuilder(path, parameter_id, startDate, endDate) for path in paths]
#     for each in queries:
#         node_alias = each["alias"]
#         query = each["query"]
#         value_alias = node_alias + "_value"
#         objectID_alias = node_alias + "_objectID"
#         result = graph.cypher.execute(query)
#         ret["queries"].append(' '.join(query.split()))
#         for each in result:
#             value = each[value_alias]
#             objectID = each[objectID_alias]
#             if objectID not in ret["data"]:
#                 ret["data"][objectID] = {}
#             if node_alias not in ret["data"][objectID]:
#                 ret["data"][objectID][node_alias] = []
#             ret["data"][objectID][node_alias].append(value)

#     return jsonify(elements = ret)

@app.route('/queryData')
def queryData():
    paths = json.loads(request.args.get('arg'))['paths']
    parameter_id = json.loads(request.args.get('arg'))['parameter_id']
    dates = json.loads(request.args.get('arg'))['dates']
    startDate = dates['startDate']
    endDate = dates['endDate']
    ret = {"data" : {}, "queries" : []}
    queries = [queryBuilder(path, parameter_id, startDate, endDate) for path in paths]
    queryList = [each["query"] for each in queries]
    propertyAliasList = [each["alias"] for each in queries]
    tx = graph.cypher.begin()
    for query in queryList:
        tx.append(query)
    results = tx.commit()
    for i, result in enumerate(results):
        query = queryList[i]
        ret["queries"].append(' '.join(query.split()))

        propertyAlias = propertyAliasList[i]
        valueAlias = propertyAlias + "_value"
        entityIDAlias = propertyAlias + "_objectID"

        for each in result:
            value = each[valueAlias]
            entityID = each[entityIDAlias]
            if entityID not in ret["data"]:
                ret["data"][entityID] = {}
            if propertyAlias not in ret["data"][entityID]:
                ret["data"][entityID][propertyAlias] = []
            ret["data"][entityID][propertyAlias].append(value)

    return jsonify(elements = ret)

@app.route('/storeFormula')
def storeFormula():
    print ("here")
    # passedArgs = json.loads(request.args.get('arg'))
    # username = passedArgs['username']
    # formulaName = passedArgs['formulaName']
    # evalCode = passedArgs['evalCode']
    # writtenCode = passedArgs['writtenCode']
    # args = passedArgs['args']
    # query = """
    #     MATCH
    #         (u:SystemUser {{username : '{username}'}})
    #     WITH 
    #         (u)
    #     MERGE 
    #         (u)-[:hasFormula]->(f:Formula {{
    #             formulaName : '{formulaName}',
    #             username : '{username}',
    #             evalCode : '{evalCode}',
    #             writtenCode : '{writtenCode}',
    #             args : '{args}'}})
    #     RETURN (f)
    # """.format(formulaName = formulaName, username = username, evalCode = evalCode, writtenCode = writtenCode, args = args)

    # print (query)

    query = """
        WITH 
            {formula}
        AS
            formula
        MATCH
            (u:SystemUser {username : formula.username})
        WITH
            (u), formula
        MERGE
            (u)-[:hasFormula]->(f:Formula {
                formulaName : formula.formulaName,
                username : formula.username,
                evalCode : formula.evalCode,
                writtenCode : formula.writtenCode,
                args : formula.args
            })
    """

    formula = json.loads(request.args.get('arg'))

    ret = {"message" : "", "status" : ""};
    try:
        result = graph.cypher.execute(query, formula = formula)
        print (result)
        ret["status"] = "success"
        ret["message"] = "Great! Your formula has been successfully created!"
    except Exception as e:
        print (e)
        ret["status"] = "failure"
        ret["message"] = "Oops! Something wrong, check console for more details :("

    print (ret)
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
            columnListWithoutSystemID = [col for col in columns if col != "SystemID"]
            query = "CREATE TABLE IF NOT EXISTS {table} (SystemID int NOT NULL AUTO_INCREMENT, {columns} TEXT, PRIMARY KEY (SystemID));".format(table = derivedTableName, columns = " TEXT, ".join(columnListWithoutSystemID))
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
                query = "INSERT INTO {table} ({columns}) VALUES (".format(table = derivedTableName, columns = ", ".join(columnListWithoutSystemID))
                for column in columnListWithoutSystemID:
                    query += " '{value}',".format(value = each[column].replace("'", "''")) if each[column] else " NULL,"

                query = query[:-1] + ");"
                cursor.execute(query)

        else:
            if 'SystemID' not in columns:
                for each in data:
                    query = "REPLACE INTO {table} ({columns}) VALUES (".format(table = derivedTableName, columns = ", ".join(columns))
                    for column in columns:
                        query += " '{value}',".format(value = each[column].replace("'", "''")) if each[column] else " NULL,"

                    query = query[:-1] + ");"
                    cursor.execute(query)

            else:
                for each in data:
                    if each['SystemID']:
                        query = "REPLACE INTO {table} ({columns}) VALUES (".format(table = derivedTableName, columns = ", ".join(columns))
                        for column in columns:
                            if column != "SystemID":
                                query += " '{value}',".format(value = each[column].replace("'", "''")) if each[column] else " NULL,"
                            else:
                                query += " {value},".format(value = str(each[column]))
                    else:
                        columnListWithoutSystemID = [col for col in columns if col != "SystemID"]
                        query = "REPLACE INTO {table} ({columns}) VALUES (".format(table = derivedTableName, columns = ", ".join(columnListWithoutSystemID))
                        for column in columns:
                            if column != "SystemID":
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
    originalTableNameList = [each['originalTableName'] for each in result]
    derivedTableNameList = [each['derivedTableName'] for each in result]
    sizeList = []
    for derivedTableName in derivedTableNameList:
        query = """
            SELECT
                CAST(ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 ) AS UNSIGNED) AS `Size (KB)`
            FROM
                information_schema.TABLES
            WHERE
                TABLE_SCHEMA = "ListenOnline"
            AND
                TABLE_NAME = "{tableName}"
            ORDER BY
                (DATA_LENGTH + INDEX_LENGTH)
            DESC;
        """.format(tableName = derivedTableName)
        cursor.execute(query)

        db.commit()
        result = cursor.fetchall()
        sizeList.append(result[0]['Size (KB)'])

    return jsonify(elements = {"originalTableNameList" : originalTableNameList, "derivedTableNameList" : derivedTableNameList, "sizeList" : sizeList})

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
    derivedTableName = result[0]['derivedTableName']

    
    query = "DESCRIBE  {derivedTableName}".format(derivedTableName = derivedTableName)
    cursor.execute(query)
    db.commit()
    result = cursor.fetchall()
    columns = [each['Field'] for each in result]

    # query = "SELECT {columns} FROM {derivedTableName};".format(columns = ', '.join(columns), derivedTableName = derivedTableName)
    query = "SELECT * FROM {derivedTableName};".format(derivedTableName = derivedTableName)
    cursor.execute(query)
    db.commit()
    result = cursor.fetchall()
    data = result

    return jsonify(elements = {"data" : data, 'columns' : columns})

@app.route('/runQuery')
def runQuery():
    userQuery = json.loads(request.args.get('arg'))['query']
    username = json.loads(request.args.get('arg'))['username']
    query = "SELECT originalTableName, derivedTableName FROM OWNERS WHERE username = '{username}';".format(username = username)
    cursor.execute(query)
    db.commit()
    result = cursor.fetchall()
    prefix = ""
    if len(result) > 0:
        prefix = "WITH "
        for each in result:
            prefix += "{originalTableName} AS (SELECT * FROM {derivedTableName}),".format(originalTableName = each['originalTableName'], derivedTableName  = each['derivedTableName'])

        prefix = prefix[:-1] + " "

    query = prefix + userQuery
    ret = {"message" : None, "data" : []}
    try:
        cursor.execute(query)
        db.commit()
        result = cursor.fetchall()
        ret['message'] = "Done"
        # for each in result:
        #     ret["data"].append(list(each))
        ret["data"] = result
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
    app.run(host = "0.0.0.0", port = 1111, threaded=True)
