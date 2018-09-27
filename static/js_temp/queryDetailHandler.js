function initialization(username, query_id, query_name) {
	window.username = username;
	window.query_id = query_id;
	window.query_name = query_name;

	window.chartCategories = [];
	window.chartSeriesName = null;

	loadToolBar();
	loadDatePicker();
	loadPanelBar();
	loadChartTypeList();
	$.getJSON(
		'/getParameters',
		{arg: JSON.stringify({"username" : username, "query_id" : query_id, "query_name" : query_name})},
		function (response){
			var parameters = response.elements;
			window.parameters = parameters;
			loadGrid(parameters);
			
		}
	)	
}

function loadGrid(parameters) {
	var data = [];
	//var i = 0;
	for (var parameter_id in parameters) {
		var parameter_group = parameters[parameter_id];
		var comment = null;
		if ("comment" in parameter_group) {
			comment = parameter_group["comment"]
		}
		data.push({
			ID : parameter_id,
			//Parameter_Group_Num : i,
			Comment : comment
		});
	}

	var dataSource = {
						data : data,
						schema : {
							model : {
								id : "ID",
								fields: {
									ID: {type: "integer"},
									//Parameter_Group_Num: { type: "integer"},
									Comment: { type: "string"}
								}
							}
						} 
					};

	$("#grid").kendoGrid({
		columns: [
			{ 
				field: "ID",
				filterable: false,
				editable: function (dataItem) {
					return false;
				}
			},{ 
				field: "Comment" 
			},{
				command : [{
					name : "View Parameter",
					iconClass: "k-icon k-i-eye",
					click : function (e) {
						e.preventDefault();
						var tr = $(e.target).closest("tr");
						var data = this.dataItem(tr);
						var parameter_id = data["ID"];
						viewParameter(parameter_id);
						return;
					}
				}, {
					name : "View Structure",
					iconClass: "k-icon k-i-eye",
					click : function (e) {
						//e.preventDefault();
						var tr = $(e.target).closest("tr");
						var data = this.dataItem(tr);
						var parameter_id = data["ID"];
						window.selected_parameter = parameter_id;
						viewStructure(parameter_id);
						return;
					}
				}, { 
					name: "edit",
					text: { 
						edit: "Edit", 
						cancel: "Cancel", 
						update: "Update"
					},
				}]
			}
		],
		filterable: true,
		editable: {
			mode : "popup",
			window: {
				title: "Edit Parameter Comment",
				animation: false,
			}
		},
		dataSource: dataSource,
		pageable: {
			pageSize: 10
		},

		save: function(e) {
			var parameter_id = e.model["ID"];
			var comment = e.model["Comment"];
			$.getJSON(
				'/setNodeProperties',
				{arg: JSON.stringify({"id" : parameter_id, "key" : "comment", "value" : comment, "type" : "string"})},
				function (response){
					var result = response.elements;
					//console.log(result);
				}
			)	
		}
	});
}

function loadToolBar() {
	$("#toolbar").kendoToolBar({
		items: [
			{
				type: "button",
				text: "View Data",
				icon: "arrow-60-right",
				showIcon: "toolbar",
				click: function(e) {
					viewData();
				}
			},{
				type: "button",
				text: "Expand",
				icon: "select-all",
				showIcon: "toolbar,",
				click: function(e) {
					var treeview = $("#treeview").data("kendoTreeView");
					if (treeview != undefined) {
						treeview.expand(".k-item");
					}
				}
			},{
				type: "separator"
			},{
				template: "<label>From: <input id='startDate'/></label>",
				overflowTemplate: "<span></span>"
			},{
				template: "<label>To: <input id='endDate'/></label>",
				overflowTemplate: "<span></span>"
			},{
				type: "button",
				text: "Clear Date",
				icon: "reset",
				showIcon: "toolbar",
				click: function(e) {
					var startDatePicker = $("#startDate").data("kendoDatePicker");
					startDatePicker.value(null);
					startDatePicker.trigger("change");
					var endDatePicker = $("#endDate").data("kendoDatePicker");
					endDatePicker.value(null);
					endDatePicker.trigger("change");
				}
			},
		]
	});
}

function loadDatePicker() {
	$("#startDate").kendoDatePicker();
	$("#endDate").kendoDatePicker();
}

function loadPanelBar() {
	$("#panelbar").kendoPanelBar();
	return;
}

function loadMessage(message, message_type) {
	$("#message").empty();
	switch (message_type) {
		case "success" :
			var code = `
				<div class="alert alert-success alert-dismissable">		 
					<button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>
					<strong>` + message + `</strong>
				</div>
			`;
			$("#message").append(code);
			break;
		case "failure" : 
			var code = `
				<div class="alert alert-dismissable alert-danger">
				 
				<button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>
				<strong>` + message + `</strong>
			</div>
			`;
			$("#message").append(code);
			break;
		default:
			return;
	}
}

function loadSpreadSheet(data) {
	var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
	if (spreadsheet != undefined) {
		$("#spreadsheet").empty();
	}
	var sheets = prepareData(data);
	//console.log(sheets);
	$("#spreadsheet").kendoSpreadsheet({
		sheets: sheets
	});
	return;
}

function prepareData(data) {
	var dict = {};
	var fields_dict = {}
	for (var obj_id in data) {
		var each = data[obj_id];
		for (var property_alias in each) {
			var values = each[property_alias];
			var layer = parseInt(property_alias.split('_')[1]);
			var prefix = "layer_" + layer.toString() + "_"
			var property = property_alias.slice(prefix.length);

			if (!(layer in dict)) {
				dict[layer] = {};
				dict[layer][obj_id] = {};
				dict[layer][obj_id][property] = values;
			}
			else if (!(obj_id in dict[layer])) {
				dict[layer][obj_id] = {};	
				dict[layer][obj_id][property] = values;
			}
			else {
				dict[layer][obj_id][property] = values;
			}

			if (!(layer in fields_dict)) {
				fields_dict[layer] = {};
				fields_dict[layer][property] = true;
			}
			else if (!(property in fields_dict[layer])) {
				fields_dict[layer][property] = true;
			}
			else {
				true;
			}
		}
	}

	var sheets = [];
	for (var layer in dict) {
		var properties = Object.keys(fields_dict[layer]);
		var rows = [];
		var fields = [];
		//fields.push({value: "Neo4j ID", bold: "true", color: "black", textAlign: "center"});
		properties.forEach(function (property) {
			fields.push({
				value: property, 
				bold: "true", 
				color: "black", 
				textAlign: "center"
			});
		});
		rows.push({cells: fields});

		for (var id in dict[layer]) {
			var raw_row = dict[layer][id];
			var row = {cells: []};
			properties.forEach(function (property) {
				var value = raw_row[property];
				row['cells'].push({value: value, textAlign: 'center'});
			});
			rows.push(row);
		}
		sheets.push({
			name : "layer_" + layer.toString(),
			rows : rows
		});
	}

	return sheets;
}

function viewParameter(parameter_id) {
	var parameterDetail = window.parameters[parameter_id];
	$("#parameterDetailTable").empty();
	for (var key in parameterDetail) {
		var value = parameterDetail[key];
		$("#parameterDetailTable").append("<tr><td>" + key + "</td><td>" + value + "</td></tr>");
	}
	$('#parameterDetail').modal('show'); 
}

function viewStructure(parameter_id) {
	$.getJSON(
		'/getStructure',
		{arg: JSON.stringify({"parameter_id" : parameter_id})},
		function (response){
			var structure = response.elements;
			window.structure = structure;
			var message = "Cool! The query structure has been successfully loaded!";
			var message_type = "success";
			loadMessage(message, message_type);
			var dataSource = formatStructure(structure, 0);
			var treeview = $("#treeview").data("kendoTreeView");
			if (treeview != undefined) {
				treeview.setDataSource(dataSource);
			}
			else {
				$("#treeview").kendoTreeView({
					dataSource: dataSource,
					checkboxes: {
						template: "<input type='checkbox' class = 'treeview-checkbox' name='#= item.layer #' value='#= item.text #' />"
					},
					select: function(e) {
						console.log("Selecting", e.node);
					}
				});
			}
			return;
		}
	)
}

function formatStructure(structure, curr_layer) {
	var ret = [];
	for (var key in structure) {
		ret.push({
			text : key,
			layer: curr_layer,
			items : formatStructure(structure[key], curr_layer + 1)
		});
	}
	return ret;
}

function viewData() {
	if (window.structure == undefined) {
		var message_type = "failure";
		var message = "Please select the structure you want to query about."
		loadMessage(message, message_type);
		return;
	}

	var datepicker = $("#startDate").data("kendoDatePicker");
	var startDate = datepicker.value();
	var datepicker = $("#endDate").data("kendoDatePicker");
	var endDate = datepicker.value();
	var dates = validateDates(startDate, endDate);
	if (dates == null) {
		return;
	}
	else {
		var parameter_id = window.selected_parameter;
		var checkedTreeViewCheckbox = $(".treeview-checkbox:checkbox:checked");
		var parsed = parseCheckedTreeViewCheckbox(checkedTreeViewCheckbox);
		$.getJSON(
			'/queryData',
			{arg: JSON.stringify({
				"structure" : parsed, 
				"parameter_id" : parameter_id, 
				"dates" : dates})},
			function (response){
				var data = response.elements;
				var message_type = "success";
				var message = "Great! Successfully loaded your data!";
				loadMessage(message, message_type);
				loadSpreadSheet(data);
			}
		)	
	}
}

function validateDates(startDate, endDate) {
	var parsedStartDate = null;
	var parsedendDate = null;
	if (startDate != null && endDate != null) {
		var x = new Date(startDate);
		var y = new Date(endDate);
		if (x > y) {
			var message_type = "failure";
			var message = "Please select valid date range."
			loadMessage(message, message_type);
			return null;
		}
	}
	if (startDate != null) {
		var parsedStartDate = startDate.getFullYear() + "-" + (startDate.getMonth() + 1) + "-" + startDate.getDate();
	}
	if (endDate != null) {
		var parsedendDate = endDate.getFullYear() + "-" + (endDate.getMonth() + 1) + "-" + endDate.getDate();
	}
	return {"startDate" : parsedStartDate, "endDate" : parsedendDate};
}

function parseCheckedTreeViewCheckbox(checkedTreeViewCheckbox) {
	var nodesToQuery = {};
	checkedTreeViewCheckbox.each(function() {
		var layer = this.name;
		var name = this.value;
		if (layer in nodesToQuery) {
			nodesToQuery[layer][name] = true;
		}
		else {
			nodesToQuery[layer] = {};
			nodesToQuery[layer][name] = true;
		}
	})

	var ret = parseTreeViewCheckboxHelper(0, window.structure, nodesToQuery);
	return ret;
}

function parseTreeViewCheckboxHelper(curr_layer, curr_structure, nodesToQuery) {
	var ret = {};
	for (var key in curr_structure) {
		var checked = (curr_layer in nodesToQuery) && (key in nodesToQuery[curr_layer]);
		ret[key] = {"checked" : checked, "children" : null, "layer" : curr_layer};
		var res = parseTreeViewCheckboxHelper(curr_layer + 1, curr_structure[key], nodesToQuery);
		ret[key]["children"] = res;
	}
	return ret;
}