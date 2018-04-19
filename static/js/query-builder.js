function loadRepositoryListQuery(){
	var query = "MATCH (r:Repository) WHERE " + 
				"r.system_user_username = '" + window.username + "' AND " + 
				"r.system_user_hashkey = '" + window.hashkey + "' " +
				"RETURN r.name;"
	return query
}

function loadRepositoriesQuery(repositoryList) {
	var queries = {};
	repositoryList.forEach(repository => {
		var query = "MATCH (d:Data)-[r:InRepository]->(x:Repository) WHERE " + 
					"d.system_user_username = '" + window.username + "' AND " + 
					"d.system_user_hashkey = '" + window.hashkey + "' AND " + 
					"x.name = '" + repository + "' RETURN d";	
		
		queries[repository] = query;
	})

	return queries;
}

function loadDatasetListQuery(){
	var query = "MATCH (s:Dataset) WHERE " + 
				"s.system_user_username = '" + window.username + "' AND " + 
				"s.system_user_hashkey = '" + window.hashkey + "' " +
				"RETURN s.name;"
	return query
}

function loadDatasetsQuery(datasetList) {
	var queries = {};
	datasetList.forEach(dataset => {
		var query = "MATCH (d:Data)-[r:InDataset]->(x:Dataset) WHERE " + 
					"d.system_user_username = '" + window.username + "' AND " + 
					"d.system_user_hashkey = '" + window.hashkey + "' AND " + 
					"x.name = '" + dataset + "' RETURN d";	
		
		queries[dataset] = query;
	})

	return queries;
}

function getGraphStructureQuery(source, name){
	var query = "MATCH (a:Data {system_user_username : '" + window.username + "'})-[:In" + source + "]->(:" + source + " {name : '" + name + "'}) OPTIONAL MATCH (a)-[b]->(c:Data {system_user_username:'" + window.username + "'})-[:In" + source + "]->(:" + source + " {name:'" + name + "'})  WITH CASE b WHEN NULL THEN a.resource + ':' + a.object ELSE a.resource + ':' + a.object + '->' + b.relation_name + '->' + c.resource + ':' + c.object END AS result RETURN DISTINCT result;"
	/*var query = "MATCH p=(" + source + " {name: '" + name + "'})<-[*]-(leaf) " + 
				"WHERE NOT (leaf)<--() " + 
				"WITH EXTRACT(x IN reverse(NODES(p))[..-1] | x.resource + ':' + x.object) AS n, EXTRACT(x IN reverse(RELATIONSHIPS(p))[..-1] | x.relation_name) AS r " + 
				"RETURN distinct(['nodes'] + n + ['relations'] + r);"*/
	return query;
}

function getPropertiesOfObjectQuery(source, name, resource, object) {
	var query = "MATCH (d:Data)-[:In" + source + "]->(s:" + source + ") WHERE s.name = '" + name +
				"' AND d.system_user_username = '" + window.username + 
				"' AND d.system_user_hashkey = '" + window.hashkey + 
				"' AND d.resource = '" + resource + 
				"' AND d.object = '" + object + 
				"' RETURN keys(d);" 
	return query;
}


function selectDatatQuery(path, source, source_name){
	var query = null;
	var names = [];

	if (path.length == 0){
		query = "MATCH (" + source_name + "_data:Data)-[:In" + source + "]->(" + source + " {name : '" + source_name + "'}) RETURN " + source_name + "_data;";
		names.push(source_name + "_data");
	}
	else{
		var conditions = [];
		query = "MATCH p = (:" + source + " {name : '" + source_name + "'})<-[:In" + source + "]-";
		for (var i = 0 ; i < path.length ; i ++) {
			//node
			if (i % 2 == 0){
				var name = path[i][0];
				var condition = path[i][1];
				var resource = path[i][2];
				var object = path[i][3];
				names.push(name);
				conditions.push(condition);
				query += "(" + name + ":Data {system_user_username : '" + window.username + "', resource : '" + resource + "', object : '" + object + "'})"
			}
			//edge
			else{
				query += "-[:Relation{relation_name:'" + path[i] + "'}]->"
			}
		}

		query += " WHERE true";

		conditions.forEach(condition => {
			delete condition['node_name'];
			if(Object.keys(condition).length > 0){
				for (property in condition){
					constrain_str = condition[property];
					query += " AND (" + constrain_str + ")"
				}
			}
		})

		query += " RETURN ";
		names.forEach(node_name => {
			query += node_name + ",";
		})
		query = query.slice(0, -1) + ';';
	}

	/*else if (path.length == 1){
		query = "MATCH (" + resource + "_data:Data {system_user_username : '" + window.username + "', resource : '" + resource + "'}) RETURN " + resource + "_data;"
		names = [resource + "_data"];
	}
	else{
		var query = "MATCH p = ";
		var conditions = [];
		for (var i = 2 ; i < path.length ; i ++) {
			var element = path[i][0];
			//node
			if (i % 2 == 0){
				var name = path[i][1];
				var condition = path[i][2];
				names.push(name);
				conditions.push(condition);
				query += "(" + name + ":Data {system_user_username : '" + window.username + "', resource : '" + resource + "', object : '" + element.data('name') + "'})"
			}
			//edge
			else{
				query += "-[:Relation{relation_name:'" + element.data('rel_name') + "'}]->"
			}
		}

		query += " WHERE true";

		conditions.forEach(condition => {
			delete condition['node_name'];
			console.log(condition);
			if(Object.keys(condition).length > 0){
				for (property in condition){
					constrain_str = condition[property];
					console.log(constrain_str);
					query += " AND (" + constrain_str + ")"
				}
			}
		})

		query += " RETURN ";
		names.forEach(node_name => {
			query += node_name + ",";
		})
		query = query.slice(0, -1) + ';';
	}*/

	return [query, names];
}

function createDatasetQuery(dataset) {
	var query = "MATCH (u:SystemUser {username:'" + window.username + "', hashkey: '" + window.hashkey + "'}) WITH u " +
				"CREATE (u)-[:hasDataset]->(ds:Dataset {name: '" + dataset + "', " + 
				"system_user_username : '" + window.username + "', " + 
				"system_user_hashkey : '" + window.hashkey + "'});";

	return query;
}

function connectDataToDatasetQuery(neo4j_ids, dataset){
	var query = "MATCH (d:Data {system_user_username : '" + window.username + "'," + 
				"system_user_hashkey :'" + window.hashkey + "'})," + 
				"(ds:Dataset {system_user_username : '" + window.username + "'," + 
				"system_user_hashkey : '" + window.hashkey + "'," + 
				"name : '" + dataset + "'}) " +
				"WHERE d.neo4j_id IN " + "['" + neo4j_ids.join("','") + "'] " +
				"CREATE (d)-[:InDataset]->(ds);";

	return query;
}

function deleteDatasetQuery(datasets) {
	var query = "MATCH (u:SystemUser)-[r:hasDataset]->(s:Dataset) WHERE " + 
				"u.username = '" + window.username + "' AND " + 
				"u.hashkey = '" + window.hashkey + "' AND " + 
				"s.name IN " + "['" + datasets.join("','") + "'] " + 
				"DETACH DELETE s;";
	return query;
}

function renameDatasetQuery(dataset, new_name){
	var query = "MATCH (u:SystemUser)-[r:hasDataset]->(s:Dataset) WHERE " + 
				"u.username = '" + window.username + "' AND " + 
				"u.hashkey = '" + window.hashkey + "' AND " + 
				"s.name = '" + dataset + "' " + 
				"SET s.name = '" + new_name + "';"
	return query;
}

function findIntersectionQueryBuilder(datasets){
	var query = "MATCH (d:Data) WHERE " + 
				"d.system_user_username = '" + window.username + "' AND " + 
				"d.system_user_hashkey = '" + window.hashkey + "'";

	datasets.forEach(dataset => {
		query += " WITH d MATCH (d)-[:InDataset]->(:Dataset {name : '" + dataset + "'})";
	})

	query += " RETURN d;"
	return query;
}

function findUnionQueryBuilder(datasets){
	var query = "MATCH (d:Data)-[r:InDataset]->(s:Dataset) WHERE " + 
					"d.system_user_username = '" + window.username + "' AND " + 
					"d.system_user_hashkey = '" + window.hashkey + "' AND " + 
					"s.name IN ['" + datasets.join("','") + "'] " + 
					"RETURN DISTINCT d;";
	return query;
}

function getResourcesListQuery() {
	var query = "MATCH (d:Data {system_user_username : '" + window.username + "', system_user_hashkey : '" + window.hashkey + "'}) RETURN DISTINCT (d.resource);"
	return query;
}

function getDatasetPropertiesQuery(dataset){
	var query = "MATCH (d:Data)-[r:InDataset]->(s:Dataset) WHERE " + 
					"s.system_user_username = '" + window.username + "' AND " + 
					"s.system_user_hashkey = '" + window.hashkey + "' AND " + 
					"s.name = '"+ dataset + "' " + 
					"RETURN d.resource, d.object, keys(d);";
	return query;
}


function statisticalFunctionQuery(data){
	var query = "";

	var names = []

	for (num in data){
		record = data[num];
		var dataset = record['dataset'];
		var function_name = record['function'];
		var distinct = record['distinct'];
		var resource = record['resource'];
		var object = record['object'];
		var property = record['property'];
		var alias = record['alias'];

		names.push(alias);

		query += "MATCH (d:Data)-[r:InDataset]->(s:Dataset) WHERE " + 
				 "s.system_user_username = '" + window.username + "' AND " + 
				 "s.system_user_hashkey = '" + window.hashkey + "' AND " + 
				 "s.name = '"+ dataset + "' AND " +
				 "d.resource = '" + resource + "' AND " + 
				 "d.object = '" + object + "' " + 
				 "WITH ";

		for (var i = 1; i < parseInt(num); i++) {
			query += data[i.toString()]['alias'] + ", ";
		}

		if (distinct == true){
			query += function_name + "(DISTINCT d." + property + ") AS " + alias + " ";
		} 
		else{
			query += function_name + "(d." + property + ") AS " + alias + " ";
		}
	}

	var ret_format = [];
	names.forEach(name => {
		ret_format.push("['" + name + "', " + name + "]");
	})

	query += "RETURN " + ret_format.join(",");

	return query;
}


function getResourceAndObjectPairsQuery(type, name){
	var query = "MATCH (d:Data)-[r:In" + type + "]->(x:" + type + ") WHERE " + 
				"x.system_user_username = '" + window.username + "' AND " + 
				"x.system_user_hashkey = '" + window.hashkey + "' AND " + 
				"x.name = '" + name + "' " + 
				"RETURN DISTINCT [d.resource, d.object, keys(d)];";
	return query;
}

function statisticalReportQuery(report_name, query) {
	var ret = 'CREATE (r:statisticalReport {system_user_username : "' + window.username + '", ' + 
				'system_user_hashkey : "' + window.hashkey + '", ' + 
				'name : "' + report_name + '", ' + 
				'report_query : "' + query + '"' + 
				'});';
	return ret;
}