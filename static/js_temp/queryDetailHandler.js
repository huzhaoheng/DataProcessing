function initialization(username, query_id, query_name) {
	window.username = username;
	window.query_id = query_id;
	window.query_name = query_name;
	loadToolBar();
	loadDatePicker();
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
	for (parameter_id in parameters) {
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
					console.log(e.target.text() + " is clicked");
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

function viewParameter(parameter_id) {
	var parameterDetail = window.parameters[parameter_id];
	$("#parameterDetailTable").empty();
	for (key in parameterDetail) {
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
			var dataSource = formatStructure(structure);
			var treeview = $("#treeview").data("kendoTreeView");
			if (treeview != undefined) {
				treeview.setDataSource(dataSource);
			}
			else {
				$("#treeview").kendoTreeView({
					dataSource: dataSource,
					checkboxes: true,
					select: function(e) {
						console.log("Selecting", e.node);
					}
				});
			}
			return;
		}
	)
}

function formatStructure(structure) {
	var ret = [];
	for (key in structure) {
		ret.push({
			text : key,
			items : formatStructure(structure[key])
		});
	}
	return ret;
}