var nodes = null;
var edges = null;
var network = null;

var repository_list = null;
var dataset_list = null;

var edge_source_type = null;
var edge_source_name = null;

var resource_and_object = null;

var init_code = "<tr id='data-flow-filter-table-addr1'>" + 
					"<td style='text-align: center; vertical-align: middle;'>1</td>" + 
					"<td>" + 
						"<div class='btn-group' style='width : 100%'>" + 
							"<button type='button' class='btn btn-block btn-secondary data-flow-filter-property-btn' data-toggle='dropdown' onclick='dataFlowFilterPropertyBtnHandler(this);'>Property</button>" + 
							"<ul class='dropdown-menu data-flow-filter-property' role='menu'></ul>" + 
						"</div>" + 
					"</td>" + 
					"<td>" + 
						"<div class='btn-group' style='width : 100%'>" + 
							"<button type='button' class='btn btn-block btn-secondary data-flow-filter-boolean-btn' data-toggle='dropdown'>Boolean</button>" + 
							"<ul class='dropdown-menu data-flow-filter-boolean' role='menu'>" + 
								"<li onclick='dataFlowFilterBooleanLiClickHandler(this);'><a href='#'>IS</a></li>" + 
								"<li onclick='dataFlowFilterBooleanLiClickHandler(this);'><a href='#'>NOT</a></li>" + 
							"</ul>" + 
						"</div>" + 
					"</td>" + 
					"<td>" + 
						"<div class='btn-group' style='width : 100%'>" + 
							"<button type='button' class='btn btn-block btn-secondary data-flow-filter-operator-btn' data-toggle='dropdown'>Operator</button>" + 
							"<ul class='dropdown-menu data-flow-filter-operator' role='menu'></ul>" + 
						"</div>" + 
					"</td>" + 
					"<td>" + 
						"<div class='btn-group' style='width : 100%'>" + 
						"</div>" + 
					"</td>" + 
				"</tr>";

$( "#data-flow").on('shown.bs.modal', function(){
	init();

	var query = loadDatasetListQuery();
	$.getJSON(
		'/getDatasetList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			dataset_list = result['datasetList'];
		}
	)

	var query = loadRepositoryListQuery();
	$.getJSON(
		'/getRepositoryList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			repository_list = result['repositoryList'];
		}
	)
})

$("#data-flow-submit").on('click', function () {
	$("#network-popUp").css('z-index', 0);
	$("#data-flow-close").click();
})

$("#data-flow-close").on('click', function () {
	$("#network-popUp").css('z-index', 0);
})

$("#data-flow .close").on('click', function () {
	$("#network-popUp").css('z-index', 0);
})


// randomly create some nodes and edges
/*var data = {
				'edges' : [
					{from: 1, to: 0, id: "ce07698a-f1ba-4955-b8a2-ffd08ea7fb19"},
					{from: 2, to: 1, id: "07b4a013-e906-42e0-8591-a73efbd79e57"}
				],
				'nodes' : [
					{id: 0, label: "0"},
					{id: 1, label: "1"},
					{id: 2, label: "2"}
				]
		};*/

var data = {
				'edges' : [],
				'nodes' : []
		};


function destroy() {
	if (network !== null) {
		network.destroy();
		network = null;
	}
}

function drawDataFlow() {
	destroy();
	nodes = [];
	edges = [];
	// create a network

	var container = document.getElementById('data-flow-graph');
	var options = {
			layout: {
				improvedLayout: true
			},
			manipulation: {
				addNode: function (data, callback) {
					$("#network-popUp").css('z-index', 9999);
					// filling in the popup DOM elements
					document.getElementById('operation').innerHTML = "Add Node";
					document.getElementById('saveButton').onclick = saveData.bind(this, data, callback);
					document.getElementById('cancelButton').onclick = clearPopUp.bind();
					document.getElementById('network-popUp').style.display = 'block';
				},
				editNode: function (data, callback) {
					$("#network-popUp").css('z-index', 9999);
					// filling in the popup DOM elements
					document.getElementById('operation').innerHTML = "Edit Node";
					document.getElementById('saveButton').onclick = saveData.bind(this, data, callback);
					document.getElementById('cancelButton').onclick = cancelEdit.bind(this,callback);
					document.getElementById('network-popUp').style.display = 'block';
				},
				addEdge: function (data, callback) {
					if (data.from == data.to) {
						var r = confirm("Do you want to connect the node to itself?");
						if (r == true) {
							callback(data);
						}
					}
					else {
						callback(data);
					}
				},
				editEdge: {
					editWithoutDrag : function (data, callback){
						edge_source_type = data.from.options.label.split(":")[0];
						edge_source_name = data.from.options.label.split(":")[1];
						$("#data-flow-filter-trigger-btn").click();

					}
				}
			}
		};
	network = new vis.Network(container, data, options);
}

function clearPopUp() {
	$("#network-popUp").css('z-index', 0);
	document.getElementById('saveButton').onclick = null;
	document.getElementById('cancelButton').onclick = null;
	document.getElementById('network-popUp').style.display = 'none';

	$("#data-flow-type").parent().find('.data-flow-type-btn').text("Type");
	$("#data-flow-name").parent().find('.data-flow-name-btn').text("Name");
}

function cancelEdit(callback) {
	clearPopUp();
	callback(null);
}

function saveData(data,callback) {
	/*data.id = document.getElementById('node-id').value;
	data.label = document.getElementById('node-label').value;*/
	var type = $("#data-flow-type").parent().find('.data-flow-type-btn').text();
	var name = $("#data-flow-name").parent().find('.data-flow-name-btn').text();

	if (type == 'Type' || name == 'Name'){
		window.alert("Please specify Type and Name");
		return;
	}

	data.label = type + ":" + name;
	clearPopUp();
	callback(data);
}

function init() {
	drawDataFlow();
}

function dataFlowFilterResourceBtnHandler(ele){
	var query = getResourceAndObjectPairsQuery(edge_source_type, edge_source_name);
	$.getJSON(
				'/getResourceAndObjectPairs',
				{arg: JSON.stringify({'query' : query})},
				function (response) {
					resource_and_object = response.elements;
					var code = "";
					for(resource in resource_and_object){
						code += "<li onclick='dataFlowResourceLiClickHandler(this);'><a href='#'>" + resource + "</a></li>";
					}
					$(".data-flow-filter-resource").first().html(code);
				}
	)
}

function dataFlowResourceLiClickHandler(ele){
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);

	$(".data-flow-filter-object-btn").first().text("Object");

	var objects = resource_and_object[selected];
	var code = "";
	for (object in objects){
		code += "<li onclick='dataFlowObjectLiClickHandler(this);'><a href='#'>" + object + "</a></li>";
	}	
	$(".data-flow-filter-object").first().html(code);

	$("#data-flow-filter-table").find('tbody').first().html(init_code);
}

function dataFlowObjectLiClickHandler(ele){
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);

	$("#data-flow-filter-table").find('tbody').first().html(init_code);
}



function dataFlowFilterPropertyBtnHandler(ele){
	var resource = $("#data-flow-filter").find(".data-flow-filter-resource-btn").first().text();
	var object = $("#data-flow-filter").find(".data-flow-filter-object-btn").first().text();
	if (resource == "Resource" || object == "Object"){
		window.alert("Please specify resource & object");
		return
	}

	var properties = resource_and_object[resource][object];
	var code = "";
	for (property in properties){
		code += "<li onclick='dataFlowFilterPropertyLiClickHandler(this);'><a href='#'>" + property + "</a></li>";
	}
	$(ele).parent().find('.data-flow-filter-property').first().html(code);
}

function dataFlowTypeLiClickHandler(ele){
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);

	$("#data-flow-name").parent().find('.data-flow-name-btn').text("Name");

	if (selected == 'Repository'){
		var code = "";
		repository_list.forEach(repository => {
			code += "<li onclick='dataFlowNameLiClickHandler(this);'><a href='#'>" + repository + "</a></li>"
		})
		$("#data-flow-name").html(code);
	}
	else{
		var code = "";
		dataset_list.forEach(dataset => {
			code += "<li onclick='dataFlowNameLiClickHandler(this);'><a href='#'>" + dataset + "</a></li>"
		})
		$("#data-flow-name").html(code);
	}
}

function dataFlowNameLiClickHandler(ele){
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);
}

function dataFlowFilterPropertyLiClickHandler(ele){
	var resource = $("#data-flow-filter").find(".data-flow-filter-resource-btn").first().text();
	var object = $("#data-flow-filter").find(".data-flow-filter-object-btn").first().text();

	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);

	$(ele).closest('tr').find('.data-flow-filter-boolean-btn').text('Boolean');
	$(ele).closest('tr').find('.data-flow-filter-operator-btn').text('Operator');
	$(ele).closest('tr').find('.btn-group').last().empty();

	var property_type = resource_and_object[resource][object][selected];

	var operators = [];
	if (property_type == 'String'){
		operators = ['STARTS WITH', 'ENDS WITH', 'CONTAINS', 'EQUALS'];
	}
	else if (property_type == 'Boolean'){
		operators = ['=', '!='];
	}
	else if (property_type.startsWith('LISTOF')){
		operators = [];
	}
	else{
		operators = ['=', '!=', '<', '>', '<=', '>='];
	}

	var code = "";
	operators.forEach(operator => {
		code += "<li onclick='dataFlowFilterOperatorLiClickHandler(this);'><a href='#'>" + operator + "</a></li>";
	})
		
	$(ele).closest('tr').find('.data-flow-filter-operator').first().html(code);

	if (property_type == 'Boolean'){
		var value_code = "<button type='button' class='btn btn-block btn-secondary data-flow-filter-value-btn' data-toggle='dropdown'>Value</button>" + 
							"<ul class='dropdown-menu data-flow-filter-value' role='menu'>" + 
								"<li onclick='dataFlowFilterValueLiClickHandler(this);'><a href='#'>true</a></li>" + 
								"<li onclick='dataFlowFilterValueLiClickHandler(this);'><a href='#'>false</a></li>" + 
							"</ul>";

		$(ele).closest('tr').find('.btn-group').last().html(value_code);
	}

	else{
		var value_code = "<input type='text' class='form-control data-flow-filter-value'/>";
		$(ele).closest('tr').find('.btn-group').last().html(value_code);
	}
}

function dataFlowFilterBooleanLiClickHandler(ele) {
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);
}

function dataFlowFilterOperatorLiClickHandler(ele){
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);
}

function dataFlowFilterValueLiClickHandler(ele){
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);
}

$("#data-flow-filter-add-row").click(function(){
	var curr_num = parseInt($("#data-flow-filter-table").find('tbody').find('tr').last().find('td').eq(0).text());
	var html_code = "<td style='text-align: center; vertical-align: middle;'>" + (curr_num + 1) + "</td>" + 
					"<td>" + 
						"<div class='btn-group' style='width : 100%'>" + 
							"<button type='button' class='btn btn-block btn-secondary data-flow-filter-property-btn' data-toggle='dropdown' onclick='dataFlowFilterPropertyBtnHandler(this);'>Property</button>" + 
							"<ul class='dropdown-menu data-flow-filter-property' role='menu'></ul>" + 
						"</div>" + 
					"</td>" + 
					"<td>" + 
						"<div class='btn-group' style='width : 100%'>" + 
							"<button type='button' class='btn btn-block btn-secondary data-flow-filter-boolean-btn' data-toggle='dropdown'>Boolean</button>" + 
							"<ul class='dropdown-menu data-flow-filter-boolean' role='menu'>" + 
								"<li onclick='dataFlowFilterBooleanLiClickHandler(this);'><a href='#'>IS</a></li>" + 
								"<li onclick='dataFlowFilterBooleanLiClickHandler(this);'><a href='#'>NOT</a></li>" + 
							"</ul>" + 
						"</div>" + 
					"</td>" + 
					"<td>" + 
						"<div class='btn-group' style='width : 100%'>" + 
							"<button type='button' class='btn btn-block btn-secondary data-flow-filter-operator-btn' data-toggle='dropdown'>Operator</button>" + 
							"<ul class='dropdown-menu data-flow-filter-operator' role='menu'></ul>" + 
						"</div>" + 
					"</td>" + 
					"<td>" + 
						"<div class='btn-group' style='width : 100%'>" + 
						"</div>" + 
					"</td>";

	$('#data-flow-filter-table').append('<tr id="data-flow-filter-table-addr' + (curr_num + 1) + '"></tr>');
	$('#data-flow-filter-table-addr' + (curr_num + 1)).html(html_code);
})

$("#data-flow-filter-delete-row").click(function(){
		var curr_num = parseInt($("#data-flow-filter-table").find('tbody').find('tr').last().find('td').eq(0).text());
		if(curr_num > 1){
			$("#data-flow-filter-table-addr"+ curr_num).remove();
		}
	});