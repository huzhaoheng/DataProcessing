$("#save-as-new-dataset").click(function () {
	var dataset = prompt("Please enter name for new dataset");
	if (!dataset){
		window.alert("Name cannot be empty.");
		return;
	}

	var query = loadDatasetListQuery();
	//check if dataset already exist
	$.getJSON(
		'/getDatasetList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var datasetList = result['datasetList'];
			if ($.inArray(dataset, datasetList) != -1){
					window.alert("Dataset " + dataset + " already exist");
					return;
			}
			//create dataset
			var query = createDatasetQuery(dataset);
			$.getJSON(
				'/writeOnlyQuery',
				{arg: JSON.stringify({"query" : query})},
				function (response){
					message = response.message['message'];
					//connect data to dataset
					var data = getCurrData();
					neo4j_ids = [];
					data.forEach(each => {
						var neo4j_id = each['neo4j_id'];
						neo4j_ids.push(neo4j_id)
					})
					var query = connectDataToDatasetQuery(neo4j_ids, dataset);
					$.getJSON(
						'/writeOnlyQuery',
						{arg: JSON.stringify({"query" : query})},
						function (response){
							message = response.message['message'];
							window.alert('Done');
							//loadDatasetList();
							return;
						}
					)

					return;
				}
			)
			return;
		}
	);
})

function getCurrData() {
	var target = $("ul#nav-tabs li.active a").attr('href');
	var table_id = target.substring(1, target.length - 4);
	var table = $("#" + table_id);
	var data = table.bootstrapTable('getData');
	return data;
}