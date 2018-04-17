$('#delete-dataset-btn').on('confirmed.bs.confirmation', function () {
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

	var query = deleteDatasetQuery(datasets);

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

	return;
})