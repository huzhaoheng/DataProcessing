$( "#add-to-dataset-selection").on('shown.bs.modal', function(){
	var query = loadDatasetListQuery();
	$.getJSON(
		'/getDatasetList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var datasetList = result['datasetList'];
			var code = "";
			datasetList.forEach(dataset => {
				code += "<li onclick=datasetNameClickHandler(this);><a href='#'>" + dataset + "</a></li>"
			})
			$("#add-to-dataset-selection-form").find(".dropdown-menu").first().html(code);
		}
	)
})

function datasetNameClickHandler(ele){
	var dataset = $(ele).find('a').first().text();
	console.log(dataset);
	$("#dataset_name_dropdown_btn").text(dataset);
}

$("#add-to-dataset-selection-submit").on('click', function(){
	var target = $("#dataset_name_dropdown_btn").text();
	var source_type = $("#add-to-dataset-selection-trigger-btn").attr('source_type');
	var name = $("#add-to-dataset-selection-trigger-btn").attr('name');
	var parameter_id = $("#add-to-dataset-selection-trigger-btn").attr('parameter_id');
	if (source_type == 'repository'){
		addRepositoryToDataset(name, parameter_id, target);
	}
	else if (source_type == 'dataset'){
		addDatasetToDataset(name, target);
	}
	else{
		true;
	}
	$("#add-to-dataset-selection-close").click();
})

$("#add-to-dataset-selection-close").on('click', function(){
	$("#dataset_name_dropdown_btn").text("Dataset");
	$("#add-to-dataset-selection-form").find(".dropdown-menu").first().html("");
})

$("add-to-dataset-selection .close").on('click', function(){
	$("#add-to-dataset-selection-close").click();
})