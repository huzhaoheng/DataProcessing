function downloadDataset(dataset) {
	//var queries = loadDatasetsQuery([dataset]);
	var query = loadDatasetQuery(dataset)
	$.getJSON(
		'/getDatasetData',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var dataList = Object.values(result);
			/*var dataList = result[dataset];*/
			var csv_data = [];
			for (var i = 0; i < dataList.length; i++) {
				csv_data.push(formatData(dataList[i]));
			}
			var data, link;
			var csv = convertArrayOfObjectsToCSV({
				data: csv_data
			});
			console.log(csv);
			/*return;*/
			if (csv == null) return;
			var filename = dataset + '.csv';

			if (!csv.match(/^data:text\/csv/i)) {
				csv = 'data:text/csv;charset=utf-8,' + csv;
			}
			data = encodeURI(csv);

			link = document.createElement('a');
			link.setAttribute('href', data);
			link.setAttribute('download', filename);
			link.click();

			return;
		}
	)
}

function downloadRepository(repository, parameter_id) {
	//var queries = loadDatasetsQuery([dataset]);
	var query = query = loadRepositoryQuery(repository, parameter_id);	
	$.getJSON(
		'/getDatasetData',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var dataList = Object.values(result);
			/*var dataList = result[dataset];*/
			var csv_data = [];
			for (var i = 0; i < dataList.length; i++) {
				csv_data.push(formatData(dataList[i]));
			}
			var data, link;
			var csv = convertArrayOfObjectsToCSV({
				data: csv_data
			});
			console.log(csv);
			/*return;*/
			if (csv == null) return;
			var filename = repository + '.csv';

			if (!csv.match(/^data:text\/csv/i)) {
				csv = 'data:text/csv;charset=utf-8,' + csv;
			}
			data = encodeURI(csv);

			link = document.createElement('a');
			link.setAttribute('href', data);
			link.setAttribute('download', filename);
			link.click();

			return;
		}
	)
}

function formatData(data) {
	var special_properties = ['internal_id', 'system_user_username', 'system_user_hashkey', 'alias', 'neo4j_id', 'resource', 'object', 'Dataset Name', 'Repository Name', 'Statistical Report Name'];
	var ret = {}
	for (key in data){
		var value = data[key];
		if (!special_properties.includes(key)){
			ret[key.split('_').slice(0, -1).join('_')] = value;	
		}
		else if (key != 'alias'){
			ret[key] = value;
		}
		else{
			true;
		}
	}

	return ret;
}

function pivot(arr) {
	var mp = new Map();
	
	function setValue(a, path, val) {
		if (Object(val) !== val) { // primitive value
			var pathStr = path.join('.');
			var i = (mp.has(pathStr) ? mp : mp.set(pathStr, mp.size)).get(pathStr);
			a[i] = val;
		} else {
			for (var key in val) {
				setValue(a, key == '0' ? path : path.concat(key), val[key]);
			}
		}
		return a;
	}
	
	var result = arr.map( obj => setValue([], [], obj) );
	ret = [[...mp.keys()], ...result];
	return ret
}

function toCsv(arr) {
	ret = arr.map( row => 
		row.map ( val => isNaN(val) ? JSON.stringify(val.split(',').join(' ')) : val ).join(',')
	).join('\n');
	return ret
}

function convertArrayOfObjectsToCSV(args) 
{
	ret = toCsv(pivot(args.data));
	return ret;
}