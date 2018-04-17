$("#find-union-btn").click(function () {
	var selected_datasets = $("#datasets").bootstrapTable('getSelections');
	
	if (selected_datasets.length < 2){
		window.alert("Please select at least two dataset");
		return;
	}

	var datasets = []
	$.map(selected_datasets, function(row) {
		datasets.push(row['Dataset Name']);
	});
	
	var query = findUnionQueryBuilder(datasets);
	
	$.getJSON(
				'/getNodes',
				{arg: JSON.stringify({"query" : query})},
				function (response) 
				{
					var result = response.elements['nodes'];
					
					$("#nav-tabs").empty();
					$("#tab-content").empty();

					var div = document.createElement("div");
					div.setAttribute("class", "tab-pane  active");
					div.setAttribute("id", "union-div");

					var p = document.createElement("p");

					var new_table = document.createElement("table"); 
					new_table.setAttribute("data-classes", "table table-hover table-condensed");
					new_table.setAttribute("id", "union");

					div.appendChild(p);
					p.appendChild(new_table);

					var li = document.createElement("li");
					li.setAttribute("class", "active");
								
					var a = document.createElement("a");
					a.setAttribute("href", "#union-div");
					a.setAttribute("data-toggle", "tab");
					a.innerHTML = "union";

					li.appendChild(a);

					document.getElementById("nav-tabs").appendChild(li);
					document.getElementById("tab-content").appendChild(div);

					displayInTable(result, "data", "#union");

					window.source = null;
					window.name = null;
				}
	)
	return;
})