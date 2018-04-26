function loadRepositoryListQuery(){
	var query = "MATCH (r:Repository) WHERE " + 
				"r.system_user_username = '" + window.username + "' AND " + 
				"r.system_user_hashkey = '" + window.hashkey + "' " +
				"RETURN r.name;";
	return query;
}

function getRepositoryParametersQuery(){
	var query = "MATCH (r:Repository)-[:hasSubRepository]->(s:SubRepository) WHERE " + 
				"r.system_user_username = '" + window.username + "' AND " + 
				"r.system_user_hashkey = '" + window.hashkey + "' " +
				"RETURN s;";
	return query;
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

/*function loadRepositoryQuery(repository){
	var query = "MATCH (d:Data)-[r:InRepository]->(x:Repository) WHERE " + 
				"x.system_user_username = '" + window.username + "' AND " + 
				"x.system_user_hashkey = '" + window.hashkey + "' AND " + 
				"x.name = '" + repository + "' " + 
				"RETURN d;";
	return query;
}*/

function loadRepositoryQuery(repository, parameter_id){
	if (parameter_id != null){
		var query = "MATCH (d:Data)-[r:InSubRepository]->(x:SubRepository) WHERE " + 
				"x.system_user_username = '" + window.username + "' AND " + 
				"x.system_user_hashkey = '" + window.hashkey + "' AND " + 
				"x.parent_repository_name = '" + repository + "' AND " + 
				"x.parameter_id = '" + parameter_id + "' " + 
				"RETURN d;";
		return query;	
	}
	else{
		var query = "MATCH (d:Data)-[r:InRepository]->(x:Repository) WHERE " + 
				"x.system_user_username = '" + window.username + "' AND " + 
				"x.system_user_hashkey = '" + window.hashkey + "' AND " + 
				"x.name = '" + repository + "' " + 
				"RETURN d;";
		return query;
	}
	
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

function loadDatasetQuery(dataset){
	var query = "MATCH (d:Data)-[r:InDataset]->(x:Dataset) WHERE " + 
				"x.system_user_username = '" + window.username + "' AND " + 
				"x.system_user_hashkey = '" + window.hashkey + "' AND " + 
				"x.name = '" + dataset + "' " + 
				"RETURN d;";
	return query;
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

/*function deleteRepositoryQuery(repositories) {
	var query = "MATCH (u:SystemUser)-[r:hasRepository]->(s:Repository) WHERE " + 
				"u.username = '" + window.username + "' AND " + 
				"u.hashkey = '" + window.hashkey + "' AND " + 
				"s.name IN " + "['" + repositories.join("','") + "'] " + 
				"DETACH DELETE s;";
	return query;
}*/

function deleteRepositoryQuery(repository, parameter_id) {
	if (parameter_id != null){
		var query = "MATCH (x:SubRepository) WHERE " + 
					"x.system_user_username = '" + window.username + "' AND " + 
					"x.parameter_id = '" + parameter_id + "' AND " + 
					"x.parent_repository_name = '" + repository + "' " + 
					"DETACH DELETE x;";
		return query;	
	}
	else{
		var query = "MATCH (a:Repository)-[r:hasSubRepository]->(b:SubRepository) WHERE " + 
					"a.system_user_username = '" + window.username + "' AND " + 
					"a.name = '" + repository + "' " + 
					"DETACH DELETE a, b, r;";
		return query;
	}
	
}

function renameDatasetQuery(dataset, new_name){
	var query = "MATCH (u:SystemUser)-[r:hasDataset]->(s:Dataset) WHERE " + 
				"u.username = '" + window.username + "' AND " + 
				"u.hashkey = '" + window.hashkey + "' AND " + 
				"s.name = '" + dataset + "' " + 
				"SET s.name = '" + new_name + "';"
	return query;
}

function renameRepositoryQuery(repository, new_name){
	var query = "MATCH (u:SystemUser)-[r:hasRepository]->(s:Repository)-[:hasSubRepository]->(x:SubRepository) WHERE " + 
				"u.username = '" + window.username + "' AND " + 
				"u.hashkey = '" + window.hashkey + "' AND " + 
				"s.name = '" + repository + "' " + 
				"SET s.name = '" + new_name + "', " + 
				"x.parent_repository_name = '" + new_name + "'";
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


function statisticalFunctionDataSelectionQuery(data){
	var queries = [];

	for (num in data){
		record = data[num];
		var dataset = record['dataset'];
		var function_name = record['function'];
		var distinct = record['distinct'];
		var resource = record['resource'];
		var object = record['object'];
		var property = record['property'];
		var alias = record['alias'];


		var query = "MATCH (d:Data)-[r:InDataset]->(s:Dataset) WHERE " + 
				 "s.system_user_username = '" + window.username + "' AND " + 
				 "s.system_user_hashkey = '" + window.hashkey + "' AND " + 
				 "s.name = '"+ dataset + "' AND " +
				 "d.resource = '" + resource + "' AND " + 
				 "d.object = '" + object + "' " + 
				 "RETURN d."  + property;

		queries.push(query);
	}


	return queries;
}


function getResourceAndObjectPairsQuery(type, name){
	var query = "MATCH (d:Data)-[r:In" + type + "]->(x:" + type + ") WHERE " + 
				"x.system_user_username = '" + window.username + "' AND " + 
				"x.system_user_hashkey = '" + window.hashkey + "' AND " + 
				"x.name = '" + name + "' " + 
				"RETURN DISTINCT [d.resource, d.object, keys(d)];";
	return query;
}

/*function createStatisticalReportQuery(report_name, queries, functions, names, inputs) {
	console.log(inputs);
	var ret = 'CREATE (r:statisticalReport {system_user_username : "' + window.username + '", ' + 
				'system_user_hashkey : "' + window.hashkey + '", ' + 
				'name : "' + report_name + '", ' + 
				'data_selection_query : ["' + queries.join('","') + '"], ' + 
				'functions : ["' + functions.join('","') + '"], ' + 
				'names : ["' + names.join('","') + '"], ' + 
				'inputs : ["' + inputs.join('","') + '"]' + 
				'});';
	return ret;
}*/

function createStatisticalReportQuery(report_name, queries, functions, names, inputs) {
	console.log(inputs);
	/*var ret = 'CREATE (r:statisticalReport {system_user_username : "' + window.username + '", ' + 
				'system_user_hashkey : "' + window.hashkey + '", ' + 
				'name : "' + report_name + '", ' + 
				'data_selection_query : ["' + queries.join('","') + '"], ' + 
				'functions : ["' + functions.join('","') + '"], ' + 
				'names : ["' + names.join('","') + '"], ' + 
				'inputs : "';*/
	if (inputs.length > 0){
		var ret = 'CREATE (r:statisticalReport {system_user_username : "' + window.username + '", ' + 
				'system_user_hashkey : "' + window.hashkey + '", ' + 
				'name : "' + report_name + '", ' + 
				'data_selection_query : ["' + queries.join('","') + '"], ' + 
				'functions : ["' + functions.join('","') + '"], ' + 
				'names : ["' + names.join('","') + '"], ' + 
				'inputs : "';

		inputs.forEach(input => {
			ret += "(" + input.join(",") + "),";
		})

		ret = ret.slice(0, -1) + '"});';
		return ret;
	}
	else{
		var ret = 'CREATE (r:statisticalReport {system_user_username : "' + window.username + '", ' + 
				'system_user_hashkey : "' + window.hashkey + '", ' + 
				'name : "' + report_name + '", ' + 
				'data_selection_query : ["' + queries.join('","') + '"], ' + 
				'functions : ["' + functions.join('","') + '"], ' + 
				'names : ["' + names.join('","') + '"]});';
		return ret;
	}
}

function getStatisticalReportListQuery(){
	var query = 'MATCH (r:statisticalReport {system_user_username : "' + window.username + '", ' + 
				'system_user_hashkey : "' + window.hashkey + '"}) ' + 
				'RETURN r.name, r.data_selection_query, r.functions, r.names, r.inputs;';
	return query;
}

function deleteStatisticalReportQuery(report_name){
	var query = "MATCH (r:statisticalReport {system_user_username : '" + window.username + "', " + 
				"system_user_hashkey : '" + window.hashkey + "', " + 
				"name : '" + report_name + "'}) " + 
				'DETACH DELETE r;';

	return query;
}