function initialization() {
	setWindowParameters();
	loadToolBar();
	loadDatePicker();
	loadPanelBar();
	loadChartTypeList();
	loadTextFunctionList();
	loadFormula();
	$.getJSON(
		'/getParameters',
		{arg: JSON.stringify({"username" : window.username, "query_id" : window.query_id, "query_name" : window.query_name})},
		function (response){
			var parameters = response.elements;
			window.parameters = parameters;
			loadGrid(parameters);
			
		}
	)
	initIntro();
}

function initIntro() {
	var tour = introJs()
	tour.setOption('tooltipPosition', 'auto');
	tour.setOption('positionPrecedence', ['left', 'right', 'top', 'bottom']);
	tour.setOption('steps', [{
			'element': '#grid',
			'intro': `Here is a list of parameters for the same query.<br><br>Click 'View Parameter' to see paramter values.<br><br>
			Click 'View Structure' to see the structure of query below.<br><br>Click 'Edit' to write some comments.<br><br>
			To query data, please click 'View Structure' firstly`,
		}, {
			'element': '#expandBtn',
			'intro': `Once the structure of query has been loaded, click 'Expand' button to expand the treeview and 
			select the object you want to see.`
		}, {
			'element': '#startDate',
			'intro': "You can specify the staring point of a specific date range."
		}, {
			'element': '#endDate',
			'intro': "You can specify the ending point of a specific date range."
		}, {
			'element': '#viewDataBtn',
			'intro': "After selecting the objects you want to see, click 'View Data' to query and display the data."
		}, {
			'element': '#spreadsheet',
			'intro': "Data will be displayed in spreadsheet, you can use it like Excel, formulas, filtering, sorting are also supported."
		}, {
			'element': '#plot-li',
			'intro': "Select the data in spreadsheet and use plotting tools here, you can visualize your data."
		}, {
			'element': '#text-analysis-li',
			'intro': "Text analyzation tools are availiable here."
		}, {
			'element': '#manageFormula',
			'intro': "Redirect to another page so you can write your own code, define your own formulas and apply them to spreadsheet."
		}, {
			'element': '#manageSheets',
			'intro': "Redirect to another page so you can store your sheets in MySQL permanently and write SQL query to process them, which is powerful."
		}])
	tour.start();
}

function setWindowParameters() {
	window.chartCategories = [];
	window.chartSeriesName = null;
	window.sheets = [];

	var args = location.search.replace('?','').split('&').reduce(function(s,c){var t=c.split('=');s[t[0]]=t[1];return s;},{});
	window.username = args['username'].replace("+", " ").replace("%20", " ");
	window.query_name = args['query_name'];
	window.query_id = parseInt(args['query_id']);
}

function loadGrid(parameters) {
	var data = [];
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
				attributes: {
					"id": "viewDataBtn"
				},
				click: function(e) {
					viewData();
				}
			},{
				type: "button",
				text: "Expand",
				icon: "select-all",
				showIcon: "toolbar,",
				attributes: {
					"id": "expandBtn"
				},
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
	var panelBar = $("#panelbar").data("kendoPanelBar");
	panelBar.expand($("#others-li"), false);
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
	var sheets = prepareData(data);
	window.sheets = window.sheets.concat(sheets);
	//window.sharedObjectToJoinSheets = {'sheets' : window.sheets};
	if (spreadsheet != undefined) {
		$("#spreadsheet").empty();
	}
	$("#spreadsheet").kendoSpreadsheet({
		sheets: window.sheets
	});

	return;
}

function prepareData(data) {
	var dict = {};
	var fields_dict = {}
	for (var objectID in data) {
		var each = data[objectID];
		for (var property_alias in each) {
			var values = each[property_alias];
			var layer = property_alias.split('_')[0];
			var prefix = layer + "_"
			var property = property_alias.slice(prefix.length);
			//var property = property_alias.split('_')[1];

			if (!(layer in dict)) {
				dict[layer] = {};
				dict[layer][objectID] = {};
				dict[layer][objectID][property] = values;
			}
			else if (!(objectID in dict[layer])) {
				dict[layer][objectID] = {};	
				dict[layer][objectID][property] = values;
			}
			else {
				dict[layer][objectID][property] = values;
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
				if (Array.isArray(value)) {
					value = value.join();
				}

				row['cells'].push({value: value, textAlign: 'center'});
			});
			rows.push(row);
		}
		sheets.push({
			//name : "layer_" + layer.toString(),
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
	kendo.ui.progress($(document.body), true);
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
						e.preventDefault();                      
						var checkbox = $(e.node).find(":checkbox");
						var checked = checkbox.prop("checked");
						checkbox.prop("checked", !checked);          
					}
				});
			}
			kendo.ui.progress($(document.body), false);
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
		var paths = parseCheckedTreeViewCheckbox(checkedTreeViewCheckbox);
		$.getJSON(
			'/queryData',
			{arg: JSON.stringify({
				"paths" : paths, 
				"parameter_id" : parameter_id, 
				"dates" : dates})},
			function (response){
				var result = response.elements;
				var data = result["data"];
				console.log("Number of entities: " + Object.keys(data).length.toString())
				var queries = result["queries"];
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
	var treeview = $("#treeview").data("kendoTreeView");
	ret = [];
	checkedTreeViewCheckbox.each(function() {
		var path = [this.value];
		var layer = this.name;
		var parent = treeview.parent(this);

		for (var i = layer - 1; i >= 0; i --) {
			var name = treeview.text(parent);
			path.unshift(name);
			parent = treeview.parent(parent);

		}
		ret.push(path);
	})

	return ret;
}

function manageFormula() {
	window.sharedObjectToManageFormula = {"evalCode" : null};
	var path = "/static/html/viewFormula.html?username=" + window.username;
	var name = "viewFormula";
	var new_window = window.open(path, name);
	new_window.username = window.username;
}

function loadNewFormula() {
	var evalCode = window.sharedObjectToManageFormula['evalCode'];
	eval(evalCode);
}

function loadFormula() {
	$.getJSON(
		'/loadFormulaByUser',
		{arg: JSON.stringify({"username" : window.username})},
		function (response){
			var result = response.elements;
			var status = result["status"];
			var message = result["message"];
			var formulaList = result["formula"];
			formulaList.forEach(function (each) {
				var evalCode = each["evalCode"];
				eval(evalCode);
			})
		}
	)
}

function manageSheets() {
	//window.sharedObjectToJoinSheets = {"sheets" : window.sheets};
	var path = "/static/html/manageSheets.html?username=" + window.username;
	var name = "manageSheets";
	var new_window = window.open(path, name);
	updateSharedObjectToManageSheets();
	new_window.username = window.username;
}

function updateSharedObjectToManageSheets() {
	var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
	window.sharedObjectToManageSheets = {'sheets':null};
	if (spreadsheet != undefined) {
		var data = spreadsheet.toJSON();
		window.sharedObjectToManageSheets['sheets'] = data['sheets'];
	}
}