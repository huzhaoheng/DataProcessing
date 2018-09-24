function initialization(username, query_id, query_name) {
	$.getJSON(
		'/getParameters',
		{arg: JSON.stringify({"username" : username, "query_id" : query_id, "query_name" : query_name})},
		function (response){
			var parameters = response.elements;
			console.log(parameters);
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
			},/*{ 
				field: "Number",
				filterable: false,
				editable: function (dataItem) {
					return false;
				}
			},*/{ 
				field: "Comment" 
			},{
				command : [{
					name : "View Parameter",
					iconClass: "k-icon k-i-eye",
					click : function (e) {
						// prevent page scroll position change
						e.preventDefault();
						// e.target is the DOM element representing the button
						var tr = $(e.target).closest("tr"); // get the current table row (tr)
						// get the data bound to the current table row
						var data = this.dataItem(tr);
						var parameter_id = data["ID"];
						viewParameter(parameter_id);
						return;
					}
				}, {
					name : "View Structure",
					iconClass: "k-icon k-i-eye",
					click : function (e) {
						/*var tr = $(e.target).closest("tr");
						var data = this.dataItem(tr);
						var query_id = data["ID"];
						var query_name = data["Query"];
						var query_comment = data["Comment"];
						editQueryComment(window.username, query_id, query_name, query_comment);*/
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
					console.log(result);
				}
			)	
		}
	});
}

function viewParameter(parameter_id) {
	var parameterDetail = window.parameters[parameter_id];
	console.log(parameterDetail);
	$("#dialog").kendoWindow({
		modal: true,
		title: "Parameter Details",
		height: "50%",
		width: "50%",
		position: {
			top: "25%",
			left: "25%"
		}
	});
}