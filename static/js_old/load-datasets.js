function loadDataset() {
	var query = loadDatasetListQuery();
	$.getJSON(
		'/getDatasetList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var datasetList = result['datasetList'];
			var queries = loadDatasetsQuery(datasetList);
			$.getJSON(
				'/getDatasetsData',
				{arg: JSON.stringify({"queries" : queries})},
				function (response){
					var result = response.elements;
					
					$("#nav-tabs").empty();
					$("#tab-content").empty();
					
					dataset_index = -1;
					for (dataset in result){

						var stripped = dataset.replace(/[^0-9a-zA-Z]/gi, '');
						
						dataset_index += 1;
						var data = [];
						result[dataset].forEach(each => {
							data.push({"data" : each});
						})

						var div = document.createElement("div");
						if (dataset_index == 0){
							div.setAttribute("class", "tab-pane active");
						}
						else{
							div.setAttribute("class", "tab-pane");
						}
						div.setAttribute("id", stripped + "-div");

						var p = document.createElement("p");

						var new_table = document.createElement("table"); 
						new_table.setAttribute("data-classes", "table table-hover table-condensed");
						new_table.setAttribute("id", stripped);

						div.appendChild(p);
						p.appendChild(new_table);

						var li = document.createElement("li");
						if (dataset_index == 0){
							li.setAttribute('class', 'active');
							window.source = 'Dataset';
						}
						
									
						var a = document.createElement("a");
						a.setAttribute("href", "#" + stripped + "-div");
						a.setAttribute("data-toggle", "tab");
						a.innerHTML = dataset;

						li.appendChild(a);

						document.getElementById("nav-tabs").appendChild(li);
						document.getElementById("tab-content").appendChild(div);

						displayInTable(data, "data", "#" + stripped);


					}
				}
			)
		}
	);
}