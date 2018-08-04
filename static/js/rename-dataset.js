$("#rename-dataset-btn").click(function (e) {
	e.preventDefault();

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

	else{
		window.alert("Please select one dataset from dataset list/datset tabs");
		return;
	}
	
	if (datasets.length == 0){
			window.alert("Please select at least one dataset");
		return;
	}

	else if (datasets.length > 1){
		window.alert("Too many datasets selected (only 1 each time)");
		return;
	}

	else{
		$("#rename-dataset").modal("show");
	}

})

$("#rename-dataset-submit").click(function() {
	var datasets = [];
	if (window.source == 'DatasetList') {
		var selected_datasets = $("#datasets").bootstrapTable('getSelections');
		$.map(selected_datasets, function(row) {
			datasets.push(row['Dataset Name']);
		});
	}

	else{
		window.name = $("ul#nav-tabs li.active").first().find('a').first().text();
		datasets = [window.name]; 
	}

	var dataset = datasets[0];
	var new_name = $("#rename-dataset-new-name input").val();

	//check if dataset already exist
	var query = loadDatasetListQuery();
	$.getJSON(
		'/getDatasetList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var datasetList = result['datasetList'];
			if ($.inArray(new_name, datasetList) != -1){
					window.alert("Dataset " + new_name + " already exist");
					return;
			}
			else{
				query = renameDatasetQuery(dataset, new_name);

				$.getJSON(
					'/writeOnlyQuery',
					{arg: JSON.stringify({"query" : query})},
					function (response){
						if (window.source == 'Dataset') {
							loadDataset();
						}
						else{
							loadDatasetList();
						}
						return;
					}
				);


				$("#rename-dataset-close").click();
				return;
			}
		}
	)
})


$('#rename-dataset .close').click(function() {
	$("#rename-dataset-close").click();
	return;	
})


$("#rename-dataset-close").click(function() {
	$("#rename-dataset-new-name input").val('');
	return;
})