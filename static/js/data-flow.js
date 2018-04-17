var nodes = null;
var edges = null;
var network = null;

var repository_list = null;
var dataset_list = null;

$( "#data-flow" ).on('shown.bs.modal', function(){
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

function draw() {
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

				/*aaa: function(data, callback){
					return;
				}*/
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
	draw();
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