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

$('[data-toggle=confirmation]').on('confirmed.bs.confirmation', function () {
	console.log('here');
			var name = null,
				type = null,
				data = [];
			if (window.source == 'RepositoryList'){
				name = row['Repository Name'];
				type = 'Repository';
				var parameter_id = null;
				var btn_text = $(this).closest('tr').first().find('td').eq(2).find('button').first().text();
				if (btn_text == "Parameters"){
					parameter_id = null;
				}
				else{
					var selected_index = parseInt(btn_text.split(' ').slice(-1)[0]);
					var selected_li_id = $(this).closest('tr').first().find('td').eq(2).find("li").eq(selected_index).attr('id');
					parameter_id = selected_li_id.split('-').slice(-1)[0];
				}

				var query = deleteRepositoryQuery(name, parameter_id);
				$.getJSON(
					'/writeOnlyQuery',
					{arg: JSON.stringify({"query" : query})},
					function (response){
						loadRepositoryList();
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
		})