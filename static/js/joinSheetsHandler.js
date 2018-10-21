function initialization() {
	var args = location.search.replace('?','').split('&').reduce(function(s,c){var t=c.split('=');s[t[0]]=t[1];return s;},{});
	window.username = args['username'];
	window.opener.getSpreadSheetsData();	
	var sheets = window.opener.sharedObjectToJoinSheets['sheets'];
	console.log(sheets);
	loadGrid(sheets);
	var parsedSheets = parseSheets(sheets);
	$.getJSON(
		'/joinSheets',
		{arg: JSON.stringify({"sheets" : parsedSheets})},
		function (response){
			var result = response.elements;
			console.log(result);
			return;
		}
	)
}

function loadGrid(sheets) {
	$("#grid").kendoGrid({
		columns: [
			{ 
				field: "Left",
				filterable: false,
				/*editable: function (dataItem) {
					return false;
				}*/
			},{ 
				field: "Column" 
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

function parseSheets(sheets) {
	var parsedSheets = sheets.map(function(sheet) {
		var parsedSheet = []; 
		var rows = sheet['rows'];

		columns = [];
		rows[0]['cells'].forEach(function (each) {
			var column = each['value'];
			columns.push(column); 
		});
		for (var i = 1; i < rows.length; i ++) {
			var row = rows[i];
			var parsedRow = {};
			columns.forEach(function (column, index) {
				if (row['cells'][index]['value'] != undefined) {
					parsedRow[column] = row['cells'][index]['value'].join();	
				}
				else {
					parsedRow[column] = null;
				}
				
			})
			parsedSheet.push(parsedRow);
		}
		return parsedSheet;
	});

	console.log(parsedSheets);
	return parsedSheets;
}

