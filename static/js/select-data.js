$("#select-data-btn").on('click', function (e) {
	e.preventDefault();
	var source = window.source;
	if (source == "Repository") {
		$("#select-data").modal("show");
	}
	else if (source == "Dataset"){
		$("#select-data").modal("show");
	}
	else {
		window.alert('Please select a repository/dataset as context');
	}
});




$( "#select-data" ).on('shown.bs.modal', function(){
	var graph = null;
	window.names = [];
	window.path = [];
	window.name = $("ul#nav-tabs li.active").first().find('a').first().text();
	var query = getGraphStructureQuery(window.source, window.name);
	$.getJSON(
				'/getGraphStructure',
				{arg: JSON.stringify({"query" : query, "name" : window.name})},
				function (response) {
					graph = response.elements;
					draw(graph);
				}
	)
});


function draw(graph) {
	window.graph = graph
	var source = Object.keys(graph)[0];
	var treeData = {"name" : source, "parent" : null, "children" : []};

	/*var treeData = {
			"name": "Top Level",
			"parent": "null",
			"children": [
				{
					"name": "Level 2: A",
					"parent": "Top Level",
					"children": [
						{
							"name": "Son of A",
							"parent": "Level 2: A"
						},

						{
							"name": "Daughter of A",
							"parent": "Level 2: A",
							"children" : [
								{
									"name" : "aaa",
									"parent" : "Daughter of A",
									"children" : [
										{
											"name" : "bbb",
											"parent" : "aaa",
											"children" : [
												{
													"name" : "ccc",
													"parent" : "bbb"
												}
											]
										}
									]
								}
							]
						}
					]
				},

				{
					"name": "Level 2: B",
					"parent": "Top Level",
					"children" : [
						{
							"name" : "ddd",
							"parent" : "Level 2: B"
						},

						{
							"name" : "eee",
							"parent" : "Level 2: B"
						}
					]
				}
			]
		}*/


	var margin = {top: 20, right: 120, bottom: 20, left: 120},
		width = $("#select-data-graph").width() - margin.right - margin.left,
		height = $("#select-data-graph").height() - margin.top - margin.bottom;

	window.i = 0;
	var duration = 750,
		root;

	var tree = d3.layout.tree()
		.size([height, width]);

	var diagonal = d3.svg.diagonal()
		.projection(function(d) { return [d.y, d.x]; });

	var svg = d3.select("#select-data-graph").append("svg")
		.attr("width", width + margin.right + margin.left)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	root = treeData;
	root.x0 = height / 2;
	root.y0 = 0;



	//------------------------------------------------
	window.root = root;
	window.diagonal = diagonal;
	window.svg = svg;
	window.duration = duration;
	window.tree = tree;
	//------------------------------------------------

	update(root);

	d3.select(self.frameElement).style("height", "500px");
}


function update(source) {

	var root = window.root;
	var diagonal = window.diagonal;
	var svg = window.svg;
	var duration = window.duration;
	var tree = window.tree;

	// Compute the new tree layout.
	var nodes = tree.nodes(root).reverse(),
		links = tree.links(nodes);
	
	// Normalize for fixed-depth.
	nodes.forEach(function(d) { d.y = d.depth * 180; });
	
	// Update the nodes…
	var node = svg.selectAll("g.node")
		.data(nodes, function(d) { return d.id || (d.id = ++window.i); });
	
	// Enter any new nodes at the parent's previous position.
	var nodeEnter = node.enter().append("g")
		.attr("class", "node")
		.attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
		.on("click", click);

	nodeEnter.append("circle")
		.attr("r", 1e-6)

	nodeEnter.append("text")
		.attr("dx", "-3em")
		.attr("dy", "1.5em")
		/*.attr("x", function(d) { return d.children || d._children ? -10 : 10; })
		.attr("dy", ".35em")*/
		.attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
		.text(function(d) { return d.name; })
		.style("fill-opacity", 1e-6);

	// Transition nodes to their new position.
	var nodeUpdate = node.transition()
		.duration(duration)
		.attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

	nodeUpdate.select("circle")
		.attr("r", 9);

	nodeUpdate.select("text")
		.style("fill-opacity", 1);

	// Transition exiting nodes to the parent's new position.
	var nodeExit = node.exit().transition()
		.duration(duration)
		.attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
		.remove();

	nodeExit.select("circle")
		.attr("r", 1e-6);

	nodeExit.select("text")
		.style("fill-opacity", 1e-6);

	// Update the links…
	var link = svg.selectAll("path.link")
		.data(links, function (d) {
		return d.target.id;
	});

	// Enter any new links at the parent's previous position.
	link.enter().insert("path", "g")
		.attr("class", "link")
		.attr("d", function (d) {
			var o = {
				x: source.x0,
				y: source.y0
			};
			return diagonal({
				source: o,
				target: o
			});
		});

	// Transition links to their new position.
	link.transition()
		.duration(duration)
		.attr("d", diagonal);

	// Transition exiting nodes to the parent's new position.
	link.exit().transition()
		.duration(duration)
		.attr("d", function (d) {
			var o = {
			    x: source.x,
			    y: source.y
			};
			return diagonal({
			    source: o,
			    target: o
			});
		})
		.remove();

	// Update the link text
	var linktext = svg.selectAll("g.link")
		.data(links, function (d) {
			return d.target.id;
		});

	linktext.enter()
		.insert("g")
		.attr("class", "link")
		.append("text")
		.attr("dy", ".35em")
		.attr("text-anchor", "middle")
		.text(function (d) {
			return d.target.upper_relation;
		});

	linktext.transition()
		.duration(duration)
		.attr("transform", function (d) {
		return "translate(" + ((d.source.y + d.target.y) / 2) + "," + ((d.source.x + d.target.x) / 2) + ")";
	})

	//Transition exiting link text to the parent's new position.
	linktext.exit().transition().remove();

	// Stash the old positions for transition.
	nodes.forEach(function(d) {
		d.x0 = d.x;
		d.y0 = d.y;
	});

}

function click(d) {
	window.clicked_node_element = this;
	window.clicked_node = d;
	//expanding
	if (d.children == null || d.children.length == 0) {
		/*d3.select(this).style("fill", 'red');*/
		if (d._children == null || d._children.length == 0){
			d._children = [];
		}
		var curr_children = [];
		d._children.forEach(child => {
			curr_children.push(child.name);
		})

		var path = [],
		curr_node = d;
		
		while (curr_node != null){
			path.push(curr_node.name);
			curr_node = curr_node.parent;
		}

		path = path.reverse();
		var new_children = [];

		var source = path[0];
		if (path.length == 1){
			Object.keys(window.graph[source]["relation->has"]).forEach(new_child => {
				if (!curr_children.includes(new_child)){
					new_children.push({"name" : new_child, "parent" : d.name, "children" : [], "upper_relation" : 'has'});
				}
			})
		}

		else{
			var sub_graph = window.graph[source]["relation->has"][d.name];
			if (sub_graph.length != 0){
				var relations = Object.keys(sub_graph);
				relations.forEach(relation => {
					Object.keys(sub_graph[relation]).forEach(new_child => {
						if (!curr_children.includes(new_child)){
							new_children.push({"name" : new_child, "parent" : d.name, "children" : [], "upper_relation" : relation.split('->')[1]});
						}
					})
				})
			}
		}

		d.children = d._children.concat(new_children);
		d._children = [];

		//---------------form section---------------------
		var curr = $(this).find('text').first().text();
		if (d.parent != null){
			var resource = curr.split(":")[0];
			var object = curr.split(":")[1];
			if (d.upper_relation != 'has'){
				createForm(resource, object, d.upper_relation);	
			}
			else{
				createForm(resource, object, null);
			}
			
			$("#filter-trigger-btn").click();

			d.parent.children = [d];
			update(d.parent);
			return;	
		}		
	}

	//otherwise
	else{
		d._children = [];
		d.children = [];
		d3.select(this).style("fill", 'black');
		var depth = d.depth;
		//console.log(depth);
		cancel(depth);
	}

	update(d);
}

function cancel(depth){
	if (depth == 0 || depth == 1){
		window.path = [];
		window.names = [];
	}
	else{
		var remove_start_from = (depth - 1) * 2 - 1;
		/*window.path.forEach(each => {
			if (each instanceof Array){
				var node_name = each[0];
				
				window.names
			}
		})*/

		var node_name = window.path[remove_start_from + 1][0];
		var index = $.inArray(node_name, window.names);
		window.names = window.names.slice(0, index);
		window.path = window.path.slice(0, remove_start_from);
	}
	return;
}

function createForm(resource, object, upper_relation) {
	$("#filter-form").empty();

	//--------------------------------------------------------
	var form_group = document.createElement('div');
	form_group.setAttribute('style', 'display : none;');
	
	var label = document.createElement('label');
	label.setAttribute('id', 'upper_relation');
	if (upper_relation != null){
		label.innerText = upper_relation;	
	}
	else{
		label.innerText = "";
	}
	form_group.appendChild(label);

	var label = document.createElement('label');
	label.setAttribute('id', 'resource');
	label.innerText = resource;
	form_group.appendChild(label);

	var label = document.createElement('label');
	label.setAttribute('id', 'object');
	label.innerText = object;
	form_group.appendChild(label);

	var form = document.getElementById('filter-form');
	form.appendChild(form_group);
	//--------------------------------------------------------

	//---------------------------------------------------------------
	var form_group = document.createElement('div');
	form_group.setAttribute('class', 'form-group col-md-12');

	var label = document.createElement('label');
	label.setAttribute('class', 'col-sm-6 control-label');
	label.setAttribute('for', 'node_name');
	label.innerText = 'Alias for this node (required)';

	
	var input = document.createElement('input');
	input.setAttribute('type', 'text');
	input.setAttribute('class', 'form-control');
	input.setAttribute('id', 'node_name');
	input.setAttribute('name', 'node_name');
	input.setAttribute('placeholder', 'Name');

	var div = document.createElement('div');
	div.setAttribute('class', 'col-sm-6');
	div.appendChild(input);


	var form = document.getElementById('filter-form');
	form_group.appendChild(label);
	form_group.appendChild(div);
	form.appendChild(form_group);
	/*form.appendChild(label);
	form.appendChild(div);*/
	//---------------------------------------------------------------

	var query = getPropertiesOfObjectQuery(window.source, window.name, resource, object);
	$.getJSON(
				'/getPropertiesOfObject',
				{arg: JSON.stringify({'query' : query, 'resource' : resource, 'object' : object})},
				function (response) {
					var result = response.elements;
					for(property in result){
						var type = result[property];
						appendProperty(property, type);
					}
				}
	)
}

function appendProperty(property, type) {
	//4-2-3-3

	var form = document.getElementById('filter-form');

	var form_group = document.createElement('div');
	form_group.setAttribute('class', 'form-group col-md-12');

	//-----------label for property---------------------------
	var label = document.createElement('label');
	label.setAttribute('class', 'col-sm-4 control-label');
	label.setAttribute('name', property + "_" + type);
	label.innerText = property;
	form_group.appendChild(label);

	//-----------logical operator for property---------------------------
	var not_dropdown_div = document.createElement('div');
	not_dropdown_div.setAttribute('class', 'dropdown col-sm-2');
	not_dropdown_div.setAttribute('style', 'padding: 0;');

	var not_dropdown_btn = document.createElement('button');
	not_dropdown_btn.setAttribute('type', 'button');
	not_dropdown_btn.setAttribute('id', property + '_not_dropdown_btn');
	not_dropdown_btn.setAttribute('class', 'btn btn-block btn-secondary dropdown-toggle');
	not_dropdown_btn.setAttribute('data-toggle', 'dropdown');
	not_dropdown_btn.setAttribute('style', 'width: 100%;');
	not_dropdown_btn.innerHTML = "IS/NOT";

	var not_dropdown = document.createElement('ul');
	not_dropdown.setAttribute('class', 'dropdown-menu');
	not_dropdown.setAttribute('aria-labelledby', property + '_not_dropdown_btn');
	not_dropdown.setAttribute('role', 'menu');
	not_dropdown.setAttribute('style', 'min-width: 0; width: 100%;');

	var is_li = document.createElement('li');
	var is_a = document.createElement('a');
	is_a.setAttribute('href', '#');
	is_a.innerHTML = 'IS';
	is_a.setAttribute('style', 'text-align: center; padding: 0;');
	is_a.addEventListener('click', function() {
		document.getElementById(property + '_not_dropdown_btn').innerHTML = 'IS'; 
	});
	is_li.appendChild(is_a);

	var not_li = document.createElement('li');
	var not_a = document.createElement('a');
	not_a.setAttribute('href', '#');
	not_a.innerHTML = 'NOT';
	not_a.setAttribute('style', 'text-align: center; padding: 0;');
	not_a.addEventListener('click', function() {
		document.getElementById(property + '_not_dropdown_btn').innerHTML = 'NOT';
	});
	not_li.appendChild(not_a);

	not_dropdown.appendChild(is_li);
	not_dropdown.appendChild(not_li);

	not_dropdown_div.appendChild(not_dropdown_btn);
	not_dropdown_div.appendChild(not_dropdown);
	form_group.appendChild(not_dropdown_div);

	//---------------operator for property-------------------------------
	var operators = null;
	if (type.startsWith("LISTOF")){
		type = "List";
	}
	switch(type){
		case 'String':
			var operators = ['STARTS WITH', 'ENDS WITH', 'CONTAINS'];
			break;

		case 'Boolean':
			var operators = ['='];
			break;

		case 'List':
			var operators = ['CONTAINS'];
			break;

		default:
			var operators = ['>', '<', '>=', '<=', '!=', '='];
	}

	var operator_div = document.createElement('div');
	operator_div.setAttribute('class', 'dropdown col-sm-2');
	operator_div.setAttribute('style', 'padding: 0;');

	var operator_dropdown_btn = document.createElement('button');
	operator_dropdown_btn.setAttribute('type', 'button');
	operator_dropdown_btn.setAttribute('id', property + '_operator_dropdown_btn');
	operator_dropdown_btn.setAttribute('class', 'btn btn-block btn-secondary dropdown-toggle');
	operator_dropdown_btn.setAttribute('data-toggle', 'dropdown');
	operator_dropdown_btn.setAttribute('style', 'width: 100%;');
	operator_dropdown_btn.innerHTML = "Operator";


	var operator_dropdown = document.createElement('ul');
	operator_dropdown.setAttribute('class', 'dropdown-menu');
	operator_dropdown.setAttribute('aria-labelledby', property + '_operator_dropdown_btn');
	operator_dropdown.setAttribute('role', 'menu');
	operator_dropdown.setAttribute('style', 'min-width: 0; width: 100%;');


	operators.forEach(operator => {
		var li = document.createElement('li');
		var a = document.createElement('a');
		a.setAttribute('href', '#');
		a.innerHTML = operator;
		//console.log(operator);
		a.setAttribute('style', 'text-align: center; padding: 0;');
		a.addEventListener('click', function() {
			document.getElementById(property + '_operator_dropdown_btn').innerHTML = operator;
		});
		li.appendChild(a);
		operator_dropdown.appendChild(li);
	})

	operator_div.appendChild(operator_dropdown_btn);
	operator_div.appendChild(operator_dropdown);
	form_group.appendChild(operator_div);

	//---------------value for property-------------------------------
	var value_div = document.createElement('div');
	value_div.setAttribute('class', 'dropdown col-sm-4');
	value_div.setAttribute('style', 'padding: 0;');

	var input = document.createElement('input');
	input.setAttribute('type', 'text');
	input.setAttribute('class', 'form-control');
	input.setAttribute('id', property + '_value');
	input.setAttribute('class', 'form-control');
	input.setAttribute('name', property + '_value,' + type);

	value_div.appendChild(input);
	form_group.appendChild(value_div);

	/*switch(type){
		case 'Date':
			var value_div = document.createElement('div');
			value_div.setAttribute('class', 'dropdown col-sm-4');
			value_div.setAttribute('style', 'padding: 0;');

			var input = document.createElement('input');
			input.setAttribute('type', 'date');
			input.setAttribute('class', 'form-control');
			input.setAttribute('id', property + '_value');
			input.setAttribute('class', 'form-control');
			input.setAttribute('name', property + '_value,' + type);

			value_div.appendChild(input);
			form_group.appendChild(value_div);
			break;

		default:
			var value_div = document.createElement('div');
			value_div.setAttribute('class', 'dropdown col-sm-4');
			value_div.setAttribute('style', 'padding: 0;');

			var input = document.createElement('input');
			input.setAttribute('type', 'text');
			input.setAttribute('class', 'form-control');
			input.setAttribute('id', property + '_value');
			input.setAttribute('class', 'form-control');
			input.setAttribute('name', property + '_value,' + type);

			value_div.appendChild(input);
			form_group.appendChild(value_div);
	}*/
	
	form.appendChild(form_group);
}

function updatePath(node_name, constrain, upper_relation, resource, object) {

	if (window.path.length > 0)
	{
		window.path.push(upper_relation);
	}
	window.path.push([node_name, constrain, resource, object]);
	return;
}

function parseConstrain() {
	var form = $('#filter-form');
	var lines = form.find('.form-group');
	var alias = form.find('input')[0].value;
	var ret = {'node_name' : alias};
	var flag = true;
	if (alias == ""){
		window.alert('Please enter alias for current node');
		flag = false;
	}
	
	var upper_relation = form.find("#upper_relation")[0].innerText;
	if (upper_relation == ""){
		upper_relation = null;
	}
	var resource = form.find("#resource")[0].innerText;
	var object = form.find("#object")[0].innerText;

	lines.slice(1).each(function(){
		var label_without_type = $(this).find('label')[0].innerText;
		var label_with_type = $($(this).find('label')[0]).attr('name');
		var logical = $(this).find('button')[0].innerText,
			operator = $(this).find('button')[1].innerText,
			value = $(this).find('input')[0].value,
			type = $(this).find('input')[0].name.split(',')[1];

		if (logical != "IS/NOT" || operator != "Operator" || value != ""){
			if (logical == "IS/NOT"){
				window.alert("Please select IS/NOT for " + label_without_type);
				flag = false;
			}
			if (operator == "Operator"){
				window.alert("Please select operator for " + label_without_type);
				flag = false;
			}
			if (value == ""){
				window.alert("Please enter value for " + label_without_type);
				flag = false;
			}
		}

		if(value != ""){
			switch(type){
				case 'String':
					var condition = "(" + alias + "." + label_with_type + " " + operator + " '" + value + "'" + ")";
					if(logical == 'NOT'){
						condition = 'NOT ' + condition;
					}
					ret[label_with_type] = condition;
					break;

				case 'Date':
					var timestamp = (new Date(value)).getTime() / 1000;
					var condition = null;
					switch(operator){
						case 'BEFORE':
							condition = "(toInteger(" + alias + "." + label_with_type + ") < " + timestamp.toString() + ")";
							break;

						case 'AFTER':
							condition = "(toInteger(" + alias + "." + label_with_type + ") >= " + (timestamp + 86400).toString() + ")";
							break;

						case 'EQUALS':
							var start_timestamp = timestamp;
							var end_timestamp = timestamp + 86400;
							condition = "(toInteger(" + alias + "." + label_with_type + ") >= " + (start_timestamp).toString() + " AND toInteger(" + alias + "." + label_with_type + ") <= " + end_timestamp.toString() + ")";
							break;

						default:
							break;
					}
					if (logical == 'NOT'){
						condition = "NOT " + condition;
					}
					ret[label_with_type] = condition;
					break;

				case 'List':
					var value_type = label_with_type.split('LISTOF')[1];
					var condition = null;
					switch(operator){
						case 'CONTAINS':
							switch(value_type){
								case 'String':
									condition = "(" + "ANY(x IN " + alias + "." + label_with_type + " WHERE x = '" + value + "'))";
									break;
								case 'Int':
									condition = "(" + "ANY(x IN " + alias + "." + label_with_type + " WHERE x = " + value + "))";
									break;
								case 'Float':
									condition = "(" + "ANY(x IN " + alias + "." + label_with_type + " WHERE x = " + value + "))";	
									break;
								default:
									break;
							}
							break;

						default:
							break
					}

					if(logical == 'NOT'){
						condition = 'NOT' + condition;
					}

					ret[label_with_type] = condition;
					break;


				case 'Boolean':
					var condition = "(" + alias + "." + label_with_type + " " + operator + " " + value + ")";
					if(logical == 'NOT'){
						condition = 'NOT' + condition;
					}
					ret[label_with_type] = condition;
					break;

				default:
					var condition = "(" + alias + "." + label_with_type + " " + operator + " " + value + ")";
					if(logical == 'NOT'){
						condition = 'NOT' + condition;
					}
					ret[label_with_type] = condition;
					break;
			}
		}
	})

	return [flag, ret, upper_relation, resource, object];
}


$("#select-data-submit").click(function () {
	var res = selectDatatQuery(window.path, window.source, window.name);
	var query = res[0],
		names = res[1];

	console.log(res);

	$.getJSON(
				'/getPath',
				{arg: JSON.stringify({"query" : query, "names" : names})},
				function (response) 
				{
					var result = response.elements;
					$("#nav-tabs").empty();
					$("#tab-content").empty();
					
					var tab_index = -1;
					for (name in result){

						var stripped = name.replace(/[^0-9a-zA-Z]/gi, '')

						tab_index += 1;
						var data = [];
						Object.values(result[name]).forEach(each => {
							each['alias'] = name;
							data.push({"data" : each});
						})

						var div = document.createElement("div");
						if (tab_index == 0){
							div.setAttribute("class", "tab-pane active");
						}
						else{
							div.setAttribute("class", "tab-pane");
						}
						div.setAttribute("id", stripped + "-div");

						var p = document.createElement("p");

						var new_table = document.createElement("table"); 
						new_table.setAttribute("data-classes", "table table-hover table-condensed");
						new_table.setAttribute("id", stripped);

						div.appendChild(p);
						p.appendChild(new_table);

						var li = document.createElement("li");
						if (tab_index == 0){
							li.setAttribute('class', 'active');
						}
						
						var a = document.createElement("a");
						a.setAttribute("href", "#" + stripped + "-div");
						a.setAttribute("data-toggle", "tab");
						a.innerHTML = name;

						li.appendChild(a);

						document.getElementById("nav-tabs").appendChild(li);
						document.getElementById("tab-content").appendChild(div);

						displayInTable(data, "data", "#" + stripped);
					}

					window.source = null;
					window.name = null;
				}
	)

	$("#select-data-close").click();
})

$("#select-data-close").click(function(){
	$("#select-data-graph").empty();
})

$("#select-data .close").click(function(){
	$("#select-data-graph").empty();	
})

$("#filter-submit").click(function (e) {
	var res = parseConstrain();
	var flag = res[0], 
		constrain = res[1],
		upper_relation = res[2],
		resource = res[3],
		object = res[4];

	if (!flag){
		return;
	}
	nodeActionHandler(constrain['node_name'], constrain, upper_relation, resource, object);
	$("#filter-close").click();
})

$("#filter-close").click(function () {
	$("#filter-form").empty();
	var node_color = rgb2hex(d3.select(window.clicked_node_element).style('fill'));
	if (node_color != "#ff0000"){
		window.clicked_node.children = [];
		update(window.clicked_node);
	}
})

$("#filter .close").click(function (){
	$("#filter-close").click();
})

function nodeActionHandler(node_name, constrain, upper_relation, resource, object) {
	if (!node_name){
		window.clicked_node.children = [];
		update(window.clicked_node);
		window.alert("Name cannot be empty.");
		return;
	}
	if (window.names.includes(node_name)){
		window.clicked_node.children = [];
		update(window.clicked_node);
		window.alert("Name already exists.");
		return;	
	}

	d3.select(window.clicked_node_element).style("fill", 'red');
	update(window.clicked_node);

	window.names.push(node_name);
	updatePath(node_name, constrain, upper_relation, resource, object);
}