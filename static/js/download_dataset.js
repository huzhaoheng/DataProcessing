$("#download-dataset-btn").click(function () {
	var datasets = [];

	if (window.source == 'DatasetList') {
		var selected_datasets = $("#datasets").bootstrapTable('getSelections');
		$.map(selected_datasets, function(row) {
			datasets.push(row['Dataset Name']);
		});
	}

	else if (window.source == 'Dataset'){
		window.name = $("ul#nav-tabs li.active").first().find('a').first().text();
		datasets = [window.name]; 
	}
	
	if (datasets.length == 0){
			window.alert("Please select at least one dataset");
		return;
	}

	datasets.forEach(dataset => {
		downloadDataset(dataset);
	})

	return;
})

function downloadDataset(dataset) {
	var queries = loadDatasetsQuery([dataset]);
	$.getJSON(
		'/getDatasetsData',
		{arg: JSON.stringify({"queries" : queries})},
		function (response){
			var result = response.elements;
			var dataList = result[dataset];
			var csv_data = [];
			for (var i = 0; i < dataList.length; i++) {
				/*csv_data.push(formatData(data[i]["data"]));*/
				csv_data.push(formatData(dataList[i]));
			}
			var data, link;
			var csv = convertArrayOfObjectsToCSV({
				data: csv_data
			});
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

/*function formatData(data) {
	var ret = {}
	var twitter_date_properties = ['created_at', 'author_created_at'];
	var reddit_date_properties = [, 'created', 'created_utc', 'comment_created'];
	var youtube_date_properties = ['publishedAt', 'timeLinked', 'updateAt', 'publishAt', 'recordingDate', 'actualStartTime', 'actualEndTime', 'scheduledStartTime', 'scheduledEndTime'];
	var date_properties = Array.prototype.concat.apply([], [twitter_date_properties, reddit_date_properties, youtube_date_properties]);
	for (key in data){
		var value = data[key];
		//console.log(key, value);
		if (date_properties.includes(key)) {
			ret[key] = (new Date(Number(value) * 1000)).toString();
		}
		else{
			ret[key] = value;
		}
	}
	return ret;
}*/

function formatData(data) {
	var special_properties = ['internal_id', 'system_user_username', 'system_user_hashkey', 'alias', 'neo4j_id', 'resource', 'object', 'Dataset Name'];
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