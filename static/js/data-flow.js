$( "#data-flow" ).on('shown.bs.modal', function(){
	init();
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


var nodes = null;
var edges = null;
var network = null;

// randomly create some nodes and edges
/*var data = getScaleFreeNetwork(25);*/
var data = {
				'edges' : [
					{from: 1, to: 0, id: "ce07698a-f1ba-4955-b8a2-ffd08ea7fb19"},
					{from: 2, to: 1, id: "07b4a013-e906-42e0-8591-a73efbd79e57"}
				],
				'nodes' : [
					{id: 0, label: "0"},
					{id: 1, label: "1"},
					{id: 2, label: "2"}
				]
		};

var seed = 2;

function setDefaultLocale() {
	var defaultLocal = navigator.language;
	var select = document.getElementById('locale');
	select.selectedIndex = 0; // set fallback value
	for (var i = 0, j = select.options.length; i < j; ++i) {
		if (select.options[i].getAttribute('value') === defaultLocal) {
			select.selectedIndex = i;
			break;
		}
	}
}

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
			layout: {randomSeed:seed}, // just to make sure the layout is the same when the locale is changed
			/*locale: document.getElementById('locale').value,*/
			manipulation: {
				addNode: function (data, callback) {
					$("#network-popUp").css('z-index', 9999);
					// filling in the popup DOM elements
					document.getElementById('operation').innerHTML = "Add Node";
					document.getElementById('node-id').value = data.id;
					document.getElementById('node-label').value = data.label;
					document.getElementById('saveButton').onclick = saveData.bind(this, data, callback);
					document.getElementById('cancelButton').onclick = clearPopUp.bind();
					document.getElementById('network-popUp').style.display = 'block';
				},
				editNode: function (data, callback) {
					$("#network-popUp").css('z-index', 9999);
					// filling in the popup DOM elements
					document.getElementById('operation').innerHTML = "Edit Node";
					document.getElementById('node-id').value = data.id;
					document.getElementById('node-label').value = data.label;
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
}

function cancelEdit(callback) {
	clearPopUp();
	callback(null);
}

function saveData(data,callback) {
	data.id = document.getElementById('node-id').value;
	data.label = document.getElementById('node-label').value;
	clearPopUp();
	callback(data);
}

function init() {
	/*setDefaultLocale();*/
	draw();
}