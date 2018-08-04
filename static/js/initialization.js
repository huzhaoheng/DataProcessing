function initialization(username, hashkey) {
	window.username = username;
	window.hashkey = hashkey;
	resetButtons();
	displayDataStructure(username, hashkey);
}

/*function initialization(username, hashkey) {
	setParameters(username, hashkey);
	getRepositoryParameters();
	//loadStatisticalReport();
	loadRepositoryList();
	setBrand();
}*/

function setParameters(username, hashkey) {
	window.username = username;
	window.hashkey = hashkey;
	window.source = 'RepositoryList';
	window.name = null;
	window.reports_info = null;
}


function loadDatasetList() {
	var query = loadDatasetListQuery();
	$.getJSON(
		'/getDatasetList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var datasetList = result['datasetList'];
			var preparedData = [];
			for (var i = 0; i < datasetList.length; i ++) {
				var dataset = datasetList[i];
				preparedData.push({'data' : {'Dataset Name' : dataset}});
			}

			$("#nav-tabs").empty();
			$("#tab-content").empty();

			var div = document.createElement("div");
			div.setAttribute("class", "tab-pane active");
			div.setAttribute("id", "datasets-div");

			var p = document.createElement("p");

			var new_table = document.createElement("table"); 
			new_table.setAttribute("data-classes", "table table-hover table-condensed");
			new_table.setAttribute("id", "datasets");

			div.appendChild(p);
			p.appendChild(new_table);

			var li = document.createElement("li");
			li.setAttribute("class", "active");
						
			var a = document.createElement("a");
			a.setAttribute("href", "#datasets-div");
			a.setAttribute("data-toggle", "tab");
			a.innerHTML = "Datasets";

			li.appendChild(a);

			document.getElementById("nav-tabs").appendChild(li);
			document.getElementById("tab-content").appendChild(div);

			window.source = "DatasetList";
			window.name = null;

			displayInTable(preparedData, "dataset", "#datasets");

		}
	);
}

function loadRepositoryList() {
	var query = loadRepositoryListQuery();
	$.getJSON(
		'/getRepositoryList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var repositoryList = result['repositoryList'];
			var preparedData = [];
			for (var i = 0; i < repositoryList.length; i ++) {
				var repository = repositoryList[i];
				preparedData.push({'data' : {'Repository Name' : repository}});

			}

			$("#nav-tabs").empty();
			$("#tab-content").empty();

			var div = document.createElement("div");
			div.setAttribute("class", "tab-pane active");
			div.setAttribute("id", "repositories-div");

			var p = document.createElement("p");

			var new_table = document.createElement("table"); 
			new_table.setAttribute("data-classes", "table table-hover table-condensed");
			new_table.setAttribute("id", "repositories");

			div.appendChild(p);
			p.appendChild(new_table);

			var li = document.createElement("li");
			li.setAttribute("class", "active");
						
			var a = document.createElement("a");
			a.setAttribute("href", "#repositories-div");
			a.setAttribute("data-toggle", "tab");
			a.innerHTML = "Repositories";

			li.appendChild(a);

			document.getElementById("nav-tabs").appendChild(li);
			document.getElementById("tab-content").appendChild(div);

			window.source = "RepositoryList";
			window.name = null;

			displayInTable(preparedData, "repository", "#repositories");

		}
	);
}

/*$('[data-toggle="confirmation"]').confirmation();*/

function setBrand() {
	var query = getResourcesListQuery();
	var marquee = document.getElementById('marquee');
	$.getJSON(
		'/getResourcesList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var resourcesList = result['resourcesList'];
			resourcesList.forEach(resource => {
				var p = document.createElement('p');
				p.innerHTML = resource;
				marquee.appendChild(p);
			})
		}
	)
	return;
}

function getUpdateTime(){
	window.update_time = {"Repository" : {}, }
	var query = getRepositoryUpdateTimeQuery(name, parameter_id);
	console.log(query);
	$.getJSON(
		'/getUpdateTime',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var update_time = result['update_time'];
			ret = "<p>" + update_time + "</p>";
			return ret;
		}
	);
}

function loadStatisticalReport() {
	var query = getStatisticalReportListQuery();
	console.log(query);
	$.getJSON(
		'/getStatisticalReportList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			window.reports_info = response.elements;
			var datasetList = Object.keys(window.reports_info);
			var preparedData = [];
			for (var i = 0; i < datasetList.length; i ++) {
				var dataset = datasetList[i];
				preparedData.push({'data' : {'Statistical Report Name' : dataset}});
			}

			$("#nav-tabs").empty();
			$("#tab-content").empty();

			var div = document.createElement("div");
			div.setAttribute("class", "tab-pane active");
			div.setAttribute("id", "datasets-div");

			var p = document.createElement("p");

			var new_table = document.createElement("table"); 
			new_table.setAttribute("data-classes", "table table-hover table-condensed");
			new_table.setAttribute("id", "statistical-report");

			div.appendChild(p);
			p.appendChild(new_table);

			var li = document.createElement("li");
			li.setAttribute("class", "active");
						
			var a = document.createElement("a");
			a.setAttribute("href", "#statistical-report-div");
			a.setAttribute("data-toggle", "tab");
			a.innerHTML = "Statistical Report";

			li.appendChild(a);

			document.getElementById("nav-tabs").appendChild(li);
			document.getElementById("tab-content").appendChild(div);

			window.source = "StatisticalReportList";
			window.name = null;

			displayInTable(preparedData, "statistical report", "#statistical-report");
		}
	)
}