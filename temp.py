import json
import hashlib
import numpy as np
from py2neo import Graph, Path, authenticate
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
    	print (data)
        return {name : np.average(data)}
        # return {name : np.nanmean(data)}
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

getStatisticalReportResult()