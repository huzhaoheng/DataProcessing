function initialization(username, hashkey) {
	setParameters(username, hashkey);
	getRepositoryParameters();
	loadRepository();
	setBrand();
}

function setParameters(username, hashkey) {
	window.username = username;
	window.hashkey = hashkey;
	window.source = 'Repository';
	window.name = null;
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
				dataset = datasetList[i];
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

			displayInTable(preparedData, "dataset", "#datasets");

			window.source = "DatasetList";
			window.name = null;
		}
	);
}

$('[data-toggle="confirmation"]').confirmation();

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