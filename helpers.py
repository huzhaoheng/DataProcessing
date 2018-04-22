from GraphGenerator import GraphGenerator
from DataLoader import DataLoader
import numpy as np
import pandas as pd


def getHashKey(nodeRecord):
    data = {"id": str(nodeRecord.d._id)}
    data.update(nodeRecord.d.properties)
    return data

def buildNodes(nodeRecord):
    data = {"id": str(nodeRecord.d._id), "label": next(iter(nodeRecord.d.labels))}
    data.update(nodeRecord.d.properties)
    ret = {"data": data}
    return ret

def buildEdges(relationRecord):
    data = {"source": str(relationRecord.r.start_node._id), 
            "target": str(relationRecord.r.end_node._id),
            "relationship": relationRecord.r.rel['type']}

    return {"data": data}

def storeData(graph, data, username, hashkey, structure, repository):
    gg = GraphGenerator(username, hashkey, data, structure)
    nodes, edges = gg.generateGraph()
    loader = DataLoader(graph, nodes, edges, username, hashkey, repository)
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
        return {name : np.average(data)}
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