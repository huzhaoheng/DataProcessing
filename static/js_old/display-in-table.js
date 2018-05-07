function displayInTable(result, type, container = '#table') {
	if (type == "data"){
		var formatted_data = [];
		for (var i = 0; i < result.length; i++) {
			formatted_data.push(formatData(result[i]["data"]));
		}
		var temp = pivot(formatted_data);
		//var columns = [{checkbox: true, visible: true}];
		var columns = [];
		temp[0].forEach(n => {
			columns.push({field : n, title : n});
		})

		$(container).bootstrapTable('destroy').bootstrapTable({
			columns: columns,
			data: formatted_data,
			sidePagination: "client",
			pageNumber: 1,
			pageSize: 10,
			pageList: [1, 10, 20, 30, 40], 
			clickToSelect: true,
			showToggle:true,
			//cardView: true,
			pagination: true,
			search: true,
			striped: true,
			/*showFullscreen: true,*/
			/*detailView: true,*/
			formatLoadingMessage: function () {  
				return "Loading...";  
			},
			formatNoMatches: function () { 
				return 'No such record';  
			},  
			onLoadError: function (data) {
				$('#reportTable').bootstrapTable('removeAll');  
			},
		});	
	}

	else if (type == 'repository'){
		var formatted_data = [];
		for (var i = 0; i < result.length; i++) {
			formatted_data.push(formatData(result[i]["data"]));
		}
		while (formatted_data.length < 10){
			formatted_data.push({'Repository Name':null});
		}
		var temp = pivot(formatted_data);
		// var columns = [{checkbox: true, visible: true}];
		var columns = [];
		temp[0].forEach(n => {
			columns.push({
				field : n, 
				title : n,
				valign:"middle",
				align:"center"
			});
		})

		columns.push({
			field: 'Last Update Time', 
			title: 'Last Update Time',
			valign:"middle",
			align:"center",
			formatter: updateTimeFormatter
		})

		columns.push({
			field: 'Data Size (Bytes)', 
			title: 'Data Size (Bytes)',
			valign:"middle",
			align:"center",
			formatter: dataSizeFormatter
		})

		columns.push({
			field: 'Query Parameters', 
			title: 'Query Parameters',
			valign:"middle",
			align:"center",
			formatter: parametersFormatter
		})

		columns.push({
			field: 'Button', 
			title: 'Operations', 
			valign:"middle",
			align:"center",
			events: operateEvents,
			formatter: operateFormatter
		})

		$(container).bootstrapTable('destroy').bootstrapTable({
			columns: columns,
			data: formatted_data,
			sidePagination: "client",
			pageNumber: 1,
			pageSize: 10,
			pageList: [20, 30, 40], 
			clickToSelect: true,
			showToggle:true,
			//cardView: true,
			pagination: true,
			search: true,

			//showColumns: true,

			formatLoadingMessage: function () {  
				return "Loading...";  
			},
			formatNoMatches: function () { 
				return 'No such record';  
			},  
			onLoadError: function (data) {  
				$('#reportTable').bootstrapTable('removeAll');  
			},
		});
	}

	else if (type == 'dataset'){
		var formatted_data = [];
		for (var i = 0; i < result.length; i++) {
			formatted_data.push(formatData(result[i]["data"]));
		}
		var temp = pivot(formatted_data);
		// var columns = [{checkbox: true, visible: true}];
		var columns = [];
		temp[0].forEach(n => {
			columns.push({
				field : n, 
				title : n,
				valign:"middle",
				align:"center"
			});
		})

		columns.push({
			field: 'Last Update Time', 
			title: 'Last Update Time',
			valign:"middle",
			align:"center",
			formatter: updateTimeFormatter
		})

		columns.push({
			field: 'Data Size (Bytes)',
			title: 'Data Size (Bytes)',
			valign:"middle",
			align:"center",
			formatter: dataSizeFormatter
		})

		/*columns.push({
			field: 'Parameters', 
			title: 'Parameters',
			valign:"middle",
			align:"center",
			//formatter: parametersFormatter
		})*/

		columns.push({
			field: 'Button', 
			title: 'Operations', 
			valign:"middle",
			align:"center",
			events: operateEvents,
			formatter: operateFormatter
		})

		$(container).bootstrapTable('destroy').bootstrapTable({
			columns: columns,
			data: formatted_data,
			sidePagination: "client",
			pageNumber: 1,
			pageSize: 10,
			pageList: [20, 30, 40], 
			clickToSelect: true,
			showToggle:true,
			//cardView: true,
			pagination: true,
			search: true,

			//showColumns: true,

			formatLoadingMessage: function () {  
				return "Loading...";  
			},
			formatNoMatches: function () { 
				return 'No such record';  
			},  
			onLoadError: function (data) {  
				$('#reportTable').bootstrapTable('removeAll');  
			},
		});
	}

	else if (type == 'statistical report'){
		var formatted_data = [];
		for (var i = 0; i < result.length; i++) {
			formatted_data.push(formatData(result[i]["data"]));
		}
		var temp = pivot(formatted_data);
		// var columns = [{checkbox: true, visible: true}];
		var columns = [
				{field : 'Statistical Report Name', title : 'Statistical Report Name', valign : 'middle', align : 'center'}
		];

		columns.push({
			field: 'Button', 
			title: 'Operations', 
			valign:"middle",
			align:"center",
			events: operateEvents,
			formatter: operateFormatter
		})

		$(container).bootstrapTable('destroy').bootstrapTable({
			columns: columns,
			data: formatted_data,
			sidePagination: "client",
			pageNumber: 1,
			pageSize: 10,
			pageList: [20, 30, 40], 
			clickToSelect: true,
			showToggle:true,
			//cardView: true,
			pagination: true,
			search: true,

			//showColumns: true,

			formatLoadingMessage: function () {  
				return "Loading...";  
			},
			formatNoMatches: function () { 
				return 'No such record';  
			},  
			onLoadError: function (data) {  
				$('#reportTable').bootstrapTable('removeAll');  
			},
		});
	}

	return;
}

function operateFormatter(value, row, index){
	var name = null;
	if (window.source == 'RepositoryList'){
		name = row['Repository Name'];
		if (name != null){
			return [
				"<button type='button', class='btn btn-default view'>View</button> &nbsp;&nbsp;",
				"<button type='button', class='btn btn-default delete'>Delete</button> &nbsp;&nbsp;",
				"<button type='button', class='btn btn-default download'>Download</button> &nbsp;&nbsp;",
				"<button type='button', class='btn btn-default save-as-dataset'>Save As Dataset</button> &nbsp;&nbsp;",
				"<button type='button', class='btn btn-default add-to-dataset'>Add to Dataset</button> &nbsp;&nbsp;",
			].join("");	
		}
	}
	else if (window.source == "DatasetList"){
		name = row["Dataset Name"];
		if (name != null){
			return [
				"<button type='button', class='btn btn-default view'>View</button> &nbsp;&nbsp;",
				"<button type='button', class='btn btn-default delete'>Delete</button> &nbsp;&nbsp;",
				"<button type='button', class='btn btn-default download'>Download</button> &nbsp;&nbsp;",
				"<button type='button', class='btn btn-default save-as-dataset'>Save As Dataset</button> &nbsp;&nbsp;",
				"<button type='button', class='btn btn-default add-to-dataset'>Add to Dataset</button> &nbsp;&nbsp;",
			].join("");	
		}
	}
	else if (window.source == "StatisticalReportList"){
		name = row["Statistical Report Name"];
		if (name != null){
			return [
				"<button type='button', class='btn btn-default view'>View In Bar Chart</button> &nbsp;&nbsp;",
				"<button type='button', class='btn btn-default delete'>Delete</button> &nbsp;&nbsp;",

			].join("");	
		}
	}

	else{
		return "";
	}
	
}

window.operateEvents = {
	'click .view': function(e, value, row, index) {
		var name = null,
			type = null,
			data = [];
		if (window.source == 'RepositoryList'){
			name = row['Repository Name'];
			type = 'Repository';
			var parameter_id = null;
			var btn_text = $(this).closest('tr').first().find('td').eq(3).find('button').first().text();
			if (btn_text == "Query Parameters"){
				parameter_id = null;
			}
			else{
				var selected_index = parseInt(btn_text.split(' ').slice(-1)[0]);
				var selected_li_id = $(this).closest('tr').first().find('td').eq(3).find("li").eq(selected_index - 1).attr('id');
				parameter_id = selected_li_id.split('-').slice(-1)[0];
			}
			

			var query = loadRepositoryQuery(name, parameter_id);
			$.getJSON(
				'/getRepositoryData',
				{arg: JSON.stringify({"query" : query})},
				function (response){
					var result = response.elements;
					for (id in result){
						data.push({'data' : result[id]});
					}
					putDataInTable(data, type, name);
					return;
				}
			)
		}
		else if (window.source == 'DatasetList'){
			name = row['Dataset Name'];
			type = 'Dataset';
			var query = loadDatasetQuery(name);
			$.getJSON(
				'/getDatasetData',
				{arg: JSON.stringify({"query" : query})},
				function (response){
					var result = response.elements;
					for (id in result){
						data.push({'data' : result[id]}); 
					}
					putDataInTable(data, type, name);
					return;
				}
			)
		}
		else if (window.source == "StatisticalReportList"){
			name = row["Statistical Report Name"];
			type = 'Statistical Report';
			var chartType = 'bar';
			var data_selection_queries = window.reports_info[name][0], 
				functions = window.reports_info[name][1], 
				names = window.reports_info[name][2],
				values = window.reports_info[name][3];
			$.getJSON(
				'/getStatisticalReportResult',
				{arg: JSON.stringify({"queries" : data_selection_queries, "functions" : functions, "names" : names, "values" : values})},
				function (response){
					var result = response.elements;
					console.log(result);
					displayStatisticalReportInChart(result, chartType)
					displayStatisticalReportInTable(result)
					$("#view-statistical-report-close").click();
					$("#chart-trigger-btn").click();
				}
			)	
		}
		else{
			return;
		}
	},
	'click .delete': function(e, value, row, index) {
		var name = null,
			type = null,
			data = [];
		if (window.source == 'RepositoryList'){
			name = row['Repository Name'];
			type = 'Repository';
			var parameter_id = null;
			var btn_text = $(this).closest('tr').first().find('td').eq(3).find('button').first().text();
			console.log(btn_text);
			if (btn_text == "Query Parameters"){
				parameter_id = null;
			}
			else{
				var selected_index = parseInt(btn_text.split(' ').slice(-1)[0]);
				console.log(selected_index);
				var selected_li_id = $(this).closest('tr').first().find('td').eq(3).find("li").eq(selected_index - 1).attr('id');
				console.log(selected_li_id);
				parameter_id = selected_li_id.split('-').slice(-1)[0];
			}
			var query = deleteRepositoryQuery(name, parameter_id);
			console.log(query);
			$.getJSON(
				'/writeOnlyQuery',
				{arg: JSON.stringify({"query" : query})},
				function (response){
					/*loadRepositoryList();*/
					location.reload();
					return;
				}
			);
		}
		else if (window.source == 'DatasetList'){
			name = row['Dataset Name'];
			type = 'Dataset';
			var query = deleteDatasetQuery([name]);
			console.log(query);
			$.getJSON(
				'/writeOnlyQuery',
				{arg: JSON.stringify({"query" : query})},
				function (response){
					loadDatasetList();
					return;
				}
			);
		}
		else if (window.source = "StatisticalReportList"){
			name = row["Statistical Report Name"];
			type = 'Statistical Report';
			var query = deleteStatisticalReportQuery(name);
			$.getJSON(
				'/writeOnlyQuery',
				{arg: JSON.stringify({"query" : query})},
				function (response){
					var result = response.message;
					loadStatisticalReport();
				}
			)
		}
		else{
			return;
		}
	},
	/*'click .rename': function(e, value, row, index) {
		var name = null,
			type = null;
		var new_name = window.prompt("Enter a new name");
		if (new_name == ""){
			window.alert("Name cannot be empty");
			return;
		}
		if (window.source == 'RepositoryList'){
			name = row['Repository Name'];
			type = 'Repository';
			var query = renameRepositoryQuery(name, new_name);
			console.log(query);
			$.getJSON(
				'/writeOnlyQuery',
				{arg: JSON.stringify({"query" : query})},
				function (response){
					loadRepositoryList();
					window.alert('Done');
					return;
				}
			);
		}
		else if (window.source == 'DatasetList'){
			name = row['Dataset Name'];
			type = 'Dataset';
			var query = renameDatasetQuery(name, new_name);
			$.getJSON(
				'/writeOnlyQuery',
				{arg: JSON.stringify({"query" : query})},
				function (response){
					loadDatasetList();
					window.alert('Done');
					return;
				}
			);
		}
		else{
			return;
		}
	},*/
	'click .download': function(e, value, row, index) {
		var name = null,
			type = null;
		if (window.source == 'RepositoryList'){
			name = row['Repository Name'];
			type = 'Repository';
			var parameter_id = null;
			var btn_text = $(this).closest('tr').first().find('td').eq(3).find('button').first().text();
			if (btn_text == "Query Parameters"){
				parameter_id = null;
			}
			else{
				var selected_index = parseInt(btn_text.split(' ').slice(-1)[0]);
				var selected_li_id = $(this).closest('tr').first().find('td').eq(3).find("li").eq(selected_index - 1).attr('id');
				parameter_id = selected_li_id.split('-').slice(-1)[0];
			}

			downloadRepository(name, parameter_id)
		}
		else if (window.source == 'DatasetList'){
			name = row['Dataset Name'];
			type = 'Dataset';
			downloadDataset(name);
		}
		else{
			return;
		}
	},
	'click .save-as-dataset': function(e, value, row, index) {
		var name = null,
			type = null;
		if (window.source == 'RepositoryList'){
			name = row['Repository Name'];
			type = 'Repository';
			var parameter_id = null;
			var btn_text = $(this).closest('tr').first().find('td').eq(3).find('button').first().text();
			if (btn_text == "Query Parameters"){
				parameter_id = null;
			}
			else{
				console.log(btn_text);
				var selected_index = parseInt(btn_text.split(' ').slice(-1)[0]);
				console.log(selected_index);
				var selected_li_id = $(this).closest('tr').first().find('td').eq(3).find("li").eq(selected_index - 1).attr('id');
				console.log(selected_li_id);
				parameter_id = selected_li_id.split('-').slice(-1)[0];
			}

			saveRepositoryToDataset(name, parameter_id);
		}
		else if (window.source == 'DatasetList'){
			name = row['Dataset Name'];
			type = 'Dataset';
			saveDatasetToDataset(name);
		}
		else{
			return;
		}
	},
	'click .add-to-dataset': function(e, value, row, index) {
		var name = null,
			type = null;
		if (window.source == 'RepositoryList'){
			name = row['Repository Name'];
			type = 'Repository';
			var parameter_id = null;
			var btn_text = $(this).closest('tr').first().find('td').eq(3).find('button').first().text();
			if (btn_text == "Query Parameters"){
				parameter_id = null;
			}
			else{
				var selected_index = parseInt(btn_text.split(' ').slice(-1)[0]);
				var selected_li_id = $(this).closest('tr').first().find('td').eq(3).find("li").eq(selected_index - 1).attr('id');
				parameter_id = selected_li_id.split('-').slice(-1)[0];
			}

			$("#add-to-dataset-selection-trigger-btn").attr('source_type', 'repository');
			$("#add-to-dataset-selection-trigger-btn").attr('name', name);
			$("#add-to-dataset-selection-trigger-btn").attr('parameter_id', parameter_id);
			$("#add-to-dataset-selection-trigger-btn").click();

			/*$("#add-to-dataset-selection-submit").on('click', function(){
				var target = $("#dataset_name_dropdown_btn").text();
				console.log(target);
				if (target == 'Dataset'){
					window.alert('Please select a dataset');
					return;
				}	
				addRepositoryToDataset(name, parameter_id, target);
				$("#add-to-dataset-selection-close").click();
			})*/

		}
		else if (window.source == 'DatasetList'){
			name = row['Dataset Name'];
			type = 'Dataset';
			$("#add-to-dataset-selection-trigger-btn").attr('source_type', 'dataset');
			$("#add-to-dataset-selection-trigger-btn").attr('name', name);
			$("#add-to-dataset-selection-trigger-btn").attr('parameter_id', '');
			$("#add-to-dataset-selection-trigger-btn").click();

			/*$("#add-to-dataset-selection-submit").on('click', function(){
				var target = $("#dataset_name_dropdown_btn").text();
				console.log(target);
				if (target == 'Dataset'){
					window.alert('Please select a dataset');
					return;
				}
				addDatasetToDataset(name, target);
				$("#add-to-dataset-selection-close").click();
			})*/
			
		}
		else{
			return;
		}
	}

}

function putDataInTable(data, type, name) {
	$("#nav-tabs").empty();
	$("#tab-content").empty();

	var stripped = name.replace(/[^0-9a-zA-Z]/gi, '');
	var div = document.createElement("div");
	div.setAttribute("class", "tab-pane active");
	div.setAttribute("id", stripped + "-div");

	var p = document.createElement("p");

	var new_table = document.createElement("table"); 
	new_table.setAttribute("data-classes", "table table-hover table-condensed");
	new_table.setAttribute("id", stripped);

	div.appendChild(p);
	p.appendChild(new_table);

	var li = document.createElement("li");
	li.setAttribute('id', stripped + '-li');
	li.setAttribute('class', 'active');

	var a = document.createElement("a");
	a.setAttribute("href", "#" + stripped + "-div");
	a.setAttribute("data-toggle", "tab");
	a.innerHTML = name;

	li.appendChild(a);

	document.getElementById("nav-tabs").appendChild(li);
	document.getElementById("tab-content").appendChild(div);

	window.source = type;
	window.name = name;

	/*if (type == 'repository'){
		$("#" + stripped + "-li").hoverTips(name, );	
	}*/

	window.source = "Data";
	window.name = null;

	displayInTable(data, "data", "#" + stripped);
}

function updateTimeFormatter(value, row, index) {
	var name = null,
		type = null,
		ret = "";

	$.ajaxSetup({
		async: false
	});

	if (window.source == 'RepositoryList'){
		name = row['Repository Name'];
		type = 'Repository';
		var parameter_id = null;
		var query = getRepositoryUpdateTimeQuery(name, parameter_id);
		$.getJSON(
			'/getUpdateTime',
			{arg: JSON.stringify({"query" : query})},
			function (response){
				var result = response.elements;
				var update_time = result['update_time'];
				ret = "<p>" + update_time + "</p>";
			}
		);
	}
	else if (window.source == 'DatasetList'){
		name = row['Dataset Name'];
		type = 'Dataset';
		var query = getDatasetUpdateTimeQuery(name);
		$.getJSON(
			'/getUpdateTime',
			{arg: JSON.stringify({"query" : query})},
			function (response){
				var result = response.elements;
				var update_time = result['update_time'];
				ret = "<p>" + update_time + "</p>";
			}
		);
	}
	else{
		ret = "<p></p>";
	}

	$.ajaxSetup({
		async: true
	});
	return ret;
}

function dataSizeFormatter(value, row, index){
	var name = null,
		type = null,
		ret = "";

	$.ajaxSetup({
		async: false
	});

	if (window.source == 'RepositoryList'){
		name = row['Repository Name'];
		type = 'Repository';
		var parameter_id = null;
		var query = loadRepositoryQuery(name, parameter_id);
		$.getJSON(
			'/getDataSize',
			{arg: JSON.stringify({"query" : query})},
			function (response){
				var result = response.elements;
				var data_size = result['data size'];
				ret = "<p>" + data_size + "</p>";
			}
		);
	}
	else if (window.source == 'DatasetList'){
		name = row['Dataset Name'];
		type = 'Dataset';
		var query = loadDatasetQuery(name);
		$.getJSON(
			'/getDataSize',
			{arg: JSON.stringify({"query" : query})},
			function (response){
				var result = response.elements;
				var data_size = result['data size'];
				ret = "<p>" + data_size + "</p>";
			}
		);
	}
	else{
		ret = "<p></p>";
	}

	$.ajaxSetup({
		async: true
	});
	return ret;
}

function parametersFormatter(value, row, index) {
	var name = null,
		type = null;
	name = row['Repository Name'];
	if (name != null){
		var stripped = name.replace(/[^0-9a-zA-Z]/gi, '');
		var ret = 	"<div class='btn-group' style='width : 100%'>" + 
						"<button type='button' class='btn btn-block btn-default repository-parameters-btn' data-toggle='dropdown'" + 
							'onclick="reporsitoryParametersBtnHandler(' + "'" + name + "'" + ');">Query Parameters</button>' + 
						"<ul id='" + stripped + "-ul' class='dropdown-menu repository-parameters' role='menu'>" + 
						"</ul>" + 
					"</div>";
		return ret;
	}
	else{
		return "";
	}
}

function reporsitoryParametersBtnHandler(repository_name) {
	var stripped = repository_name.replace(/[^0-9a-zA-Z]/gi, '');
	var subRepositories = window.parameters[repository_name];
	var i = 0;
	var code = "";
	for (parameter_id in subRepositories){
		code += "<li id='" + stripped + "-" + parameter_id + "' onclick='parameterGroupLiClickHandler(this);'><a href='#'>Parameter Group " + (i + 1) + "</a></li>";
		//var para = subRepositories[parameter_id];
		i ++;
	}
	$("#" + stripped + "-ul").html(code);
	for (parameter_id in subRepositories){
		$("#" + stripped + "-" + parameter_id).hoverTips(repository_name, parameter_id);
	}
	return;
}

function parameterGroupLiClickHandler(ele) {
	var selected = $(ele).find('a')[0].innerText;
	var name = $(ele).closest('tr').find('td').eq(0).text();
	var parameter_id = $(ele).attr('id').split('-').slice(-1)[0];
	console.log(name);
	console.log(parameter_id);

	$.ajaxSetup({
		async: false
	});

	var query = loadRepositoryQuery(name, parameter_id);
	$.getJSON(
		'/getDataSize',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var data_size = result['data size'];
			var code = "<p>" + data_size + "</p>";
			$(ele).closest('tr').find('td').eq(2).html(code);
		}
	);

	var query = getRepositoryUpdateTimeQuery(name, parameter_id);
	$.getJSON(
		'/getUpdateTime',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var update_time = result['update_time'];
			var code = "<p>" + update_time + "</p>";
			$(ele).closest('tr').find('td').eq(1).html(code);
		}
	);

	$.ajaxSetup({
		async: true
	});

	/*$(ele).parent().prev().text(selected);
	console.log($(ele).parent().prev());
	console.log($(ele).parent().prev().text());*/
	$(ele).parent().parent().find('button').first().text(selected);
	return;
}

function saveRepositoryToDataset(name, parameter_id) {
	var new_name = window.prompt("Enter a name");
	if (new_name == ""){
		window.alert("Name cannot be empty");
		return;
	}
	var query = saveRepositoryToDatasetQuery(name, parameter_id, new_name);
	console.log(query);
	$.getJSON(
		'/writeOnlyQuery',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			$("#datasets-custom").click();
			/*loadDatasetList();*/
			window.alert('Done');
			return;
		}
	);

}

function addRepositoryToDataset(name, parameter_id, target) {
	var query = addRepositoryToDatasetQuery(name, parameter_id, target);
	console.log(query);
	$.getJSON(
		'/writeOnlyQuery',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			$("#datasets-custom").click();
			/*loadDatasetList();*/
			window.alert('Done');
			return;
		}
	);

}

function saveDatasetToDataset(name, new_name) {
	// body...
	var new_name = window.prompt("Enter a name");
	if (new_name == ""){
		window.alert("Name cannot be empty");
		return;
	}
	var query = saveDatasetToDatasetQuery(name, new_name);
	$.getJSON(
		'/writeOnlyQuery',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			$("#datasets-custom").click();
			/*loadDatasetList();*/
			window.alert('Done');
			return;
		}
	);
}

function addDatasetToDataset(name, target){
	var query = addDatasetToDatasetQuery(name, target);
	console.log(query);
	$.getJSON(
		'/writeOnlyQuery',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			$("#datasets-custom").click();
			/*loadDatasetList();*/
			window.alert('Done');
			return;
		}
	);
}