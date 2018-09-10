$("#query-by-structure").click(function () {
	if (window.target_node == null){
		window.alert("Please select target node");
		return;
	}

	/*var root_node = $.grep($("g.node").toArray(), function(item){
        return item.__data__.name == window.username;
    })[0];*/

    var valid_path = constructValidPath();
    var processed_path = processPath(valid_path);
    $.getJSON(
        '/getDataByPath',
        {arg: JSON.stringify({"path" : processed_path})},
        function (response){
            var data = response.elements;
            //switchButtons();
            openNewWindow(data);
        }
    )
})

function constructValidPath(){
	var nodes = $("g.node").toArray();
	var nodes_obj = [];
	nodes.forEach(node => {
		nodes_obj.push(node.__data__);
	})
	var valid_path = [];
	nodes_obj.forEach(function(node){
		if(!('parent' in node)){
			constructValidPathHelper(node, valid_path);
		}
	})
    return valid_path.reverse();
}

function constructValidPathHelper(node, valid_path){
	if (node.id == window.target_node){
		valid_path.push(node);
		return valid_path;
	}
	else{
		if ('children' in node){
			node.children.forEach(child => {
				if (constructValidPathHelper(child, valid_path).length > 0){
					valid_path.push(node);
				}
			})
			return valid_path;
		}
		else{
			return [];
		}
	}
}

function processPath(path){
	var processed_path = [];
	path.forEach(function (node, i) {
		switch(i){
			case 0:
				processed_path.push({
					'label' : 'SystemUser',
					'identifier' : 'username',
					'username' : window.username
				});
				break;
			case 1:
				processed_path.push({
					'label' : 'Query',
					'identifier' : 'name',
					'name' : node.name
				});
				break;
			case 2:
				processed_path.push({
					'label' : 'QueryParameter',
					'identifier' : 'parameter_id',
					'parameter_id' : node.data.parameter_id
				});
				break;
			default:
				processed_path.push({
					'label' : 'QueryObject',
					'identifier' : 'name',
					'name' : node.name
				});
		}
	})
	return processed_path;
}

/*function displayData(data){
	var container = document.getElementById('main-area');
	var columns = [];
	if (data.length == 0){
		window.alert('empty result!');
		return;
	}
	var sample = data[0];
	var type_mapping = {
		'str' : 'text',
		'int' : 'numeric',
	};
	for (key in sample){
		if (!(['neo4j_id','system_user_username', 'system_user_hashkey'].includes(key)) && !(key.endsWith('_type'))){
			columns.push({
				data: key,
				type: type_mapping[sample[key + '_type']],
			});
		}
	}
	var colHeaders = [];
	columns.forEach(each => {
		colHeaders.push(each.data);
	})
	var setting = {
		data: data,
		columns: columns,
		outsideClickDeselects: false,
		stretchH: 'all',
		width: document.getElementById('main-area').offsetWidth,
		autoWrapRow: true,
		height: document.getElementById('main-area').offsetHeight,
		maxRows: data.length * 2,
		manualRowResize: true,
		manualColumnResize: true,
		rowHeaders: true,
		colHeaders: colHeaders,
		manualRowMove: true,
		manualColumnMove: true,
		contextMenu: true,
		filters: true,
		dropdownMenu: true,
		formulas: true,
	}
	window.table = new Handsontable(container, setting);

}*/

function openNewWindow(data){
	var new_window = window.open("../static/html/table.html");
	new_window.data = data;
}

$("#reset-structure").click(function () {
	//clearSVG();
	clean();
	displayDataStructure(window.username, window.hashkey);
})

function clean() {
	resetButtons();
	if (window.table != undefined){
		window.table.destroy();
	}
    $("#main-area").empty();
    window.target_node = null;
}

function resetButtons() {
	$('#query-by-structure').prop('disabled', false);
	$('#download').prop('disabled', true);
	$('#stats').prop('disabled', true);
}

function switchButtons() {
	console.log('switching buttons');
	$('#query-by-structure').prop('disabled', true);
	$('#download').prop('disabled', false);
	$('#stats').prop('disabled', false);
}

function clearSVG() {
	$("#main-area > svg").remove();
}