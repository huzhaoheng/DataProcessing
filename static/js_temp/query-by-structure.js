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


function openNewWindow(data){
	var new_window = window.open("../static/html/table.html");
	new_window.data = data;
}

$("#reset-structure").click(function () {
	clean();
	displayDataStructure(window.username, window.hashkey);
})

function clean() {
    $("#main-area").empty();
    window.target_node = null;
}