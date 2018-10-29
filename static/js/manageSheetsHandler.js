function initialization() {
	var args = location.search.replace('?','').split('&').reduce(function(s,c){var t=c.split('=');s[t[0]]=t[1];return s;},{});
	window.username = args['username'];
	initSpreadSheet();
	initCodingArea();
	loadCurrentSheetsGrid();
	loadStoredSheetsGrid();
	loadFormula();
}

function initSpreadSheet() {
	$("#spreadsheet").kendoSpreadsheet();
	return;
}

function initCodingArea() {
	window.editor = CodeMirror.fromTextArea(document.getElementById('code'), {
		indentWithTabs: true,
		smartIndent: true,
		lineNumbers: true,
		matchBrackets : true,
		autofocus: true,
		mode: 'text/x-mysql'
	});
}

function loadCurrentSheetsGrid() {
	var sheets = window.opener.sharedObjectToManageSheets['sheets'];
	var data = sheets.map(function (sheet, index) {
		return {
			"ID" : index,
			"Name" : sheet['name']
		};
	})
	$("#currentSheetsGrid").kendoGrid({
		columns: [{
			field: "ID"
		},{
			field: "Name"
		},{
			command : [{
				name : "View Sheet",
				iconClass: "k-icon k-i-eye",
				click : function (e) {
					e.preventDefault();
					var tr = $(e.target).closest("tr");
					var data = this.dataItem(tr);
					loadCurrentSheet(data["ID"]);
					return;
				}
			}]
		}],
		dataSource: {
			data: data,
			schema : {
				model : {
					id : "ID",
					fields: {
						Name: {type: "string"},
						ID: {type: "integer"}
					}
				}
			} 
		}
	})
}

function loadCurrentSheet(ID) {
	var sheets = window.window.opener.sharedObjectToManageSheets['sheets'];
	var sheet = sheets[ID];
	var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
	var data = spreadsheet.toJSON();
	var check = sheetLoaded(data, sheet);
	var activateID = -1;
	if (check["loaded"]) {
		var index = check["index"];
		data['sheets'][index] = sheet;
		activateID = index
	}
	else {
		data['sheets'].push(sheet);
		activateID = data['sheets'].length - 1;
	}
	spreadsheet.fromJSON(data);
	spreadsheet.activeSheet(spreadsheet.sheets()[activateID]);
}

function sheetLoaded(data, sheet) {
	var loaded = false;
	var index = -1;
	data['sheets'].forEach(function (each, i) {
		if (each['name'] == sheet['name']) {
			loaded = true;
			index = i;
		}
	})
	return {"loaded" : loaded, "index" : index};
}

function loadStoredSheetsGrid() {
	$.getJSON(
		'/getStoredTables',
		{arg: JSON.stringify({"username" : window.username})},
		function (response){
			var result = response.elements;
			var originalTableNameList = result['originalTableNameList'];
			var derivedTableNameList = result['derivedTableNameList'];
			var data = originalTableNameList.map(function (originalTableName, index) {
				return {
					"ID" : index,
					"originalTableName" : originalTableName,
					"derivedTableName" : derivedTableNameList[index]
				};
			})
			$("#StoredSheetsGrid").kendoGrid({
				columns: [{
					field: "ID"
				},{
					field: "originalTableName"
				},{
					field: "derivedTableName"
				},{
					command : [{
						name : "View Sheet",
						iconClass: "k-icon k-i-eye",
						click : function (e) {
							e.preventDefault();
							var tr = $(e.target).closest("tr");
							var data = this.dataItem(tr);
							loadStoredTable(data["originalTableName"]);
							return;
						}
					}]
				}],
				dataSource: {
					data: data,
					schema : {
						model : {
							id : "ID",
							fields: {
								originalTableName: {type: "string"},
								derivedTableName : {type: "string"},
								ID: {type: "integer"}
							}
						}
					} 
				}
			})
			return;
		}
	)
}

function loadStoredTable(table) {
	$.getJSON(
		'/loadTable',
		{arg: JSON.stringify({"table" : table, "username" : window.username})},
		function (response){
			var result = response.elements;
			var tableData = result['data'];
			var columns = result['columns'];
			var sheet = convertTableToSheet(table, tableData, columns);
			var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
			var data = spreadsheet.toJSON();
			var check = sheetLoaded(data, sheet);
			var activateID = -1;
			if (check["loaded"]) {
				var index = check["index"];
				data['sheets'][index] = sheet;
				activateID = index
			}
			else {
				data['sheets'].push(sheet);
				activateID = data['sheets'].length - 1;
			}
			spreadsheet.fromJSON(data);
			spreadsheet.activeSheet(spreadsheet.sheets()[activateID]);
			return;
		}
	)
}

function convertTableToSheet(tableName, tableData, columns) {
	var rows = [];

	var fields = [];
	columns.forEach(function (column) {
		fields.push({
			value: column, 
			bold: "true", 
			color: "black", 
			textAlign: "center"
		});
	});
	rows.push({cells: fields});

	tableData.forEach(function (each) {
		var row = {cells: []};
		columns.forEach(function (column) {
			var value = each[column];
			row['cells'].push({value: value, textAlign: 'center'});
		});
		rows.push(row);
	});
	var sheet = {"name" : tableName, "rows" : rows};
	return sheet;
}

function saveSheet() {
	var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
	var data = spreadsheet.toJSON();
	var activeSheetName = data['activeSheet'];
	var activeSheet = null;
	var sheets = data['sheets'];
	for (var i = 0; i < sheets.length; i ++) {
		if (sheets[i]['name'] == activeSheetName) {
			activeSheet = sheets[i];
			break;
		}
	}
	var result = parseSheet(activeSheet);
	parsedSheet = result["parsedSheet"];
	columns = result["columns"];

	promptFunction("Please enter a name:", activeSheetName).then(function (data) {
		$.getJSON(
			'/saveSheets',
			{arg: JSON.stringify({"name" : data, "data" : parsedSheet, "columns" : columns, "username" : window.username})},
			function (response){
				var result = response.elements;
				loadStoredSheetsGrid();
				loadMessage("Sheet Saved.", "success");
				return;
			}
		)
	}, function () {
		return;
	})
	return;
}

function promptFunction(content, defaultValue){
	return $("<div></div>").kendoPrompt({
		title: "My Title",
		value: defaultValue,
		content: content
	}).data("kendoPrompt").open().result;
}

function parseSheet(sheet) {
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
				var value = row['cells'][index]['value'];
				if (Array.isArray(value)) {
					parsedRow[column] = row['cells'][index]['value'].join();
				}
				else {
					parsedRow[column] = row['cells'][index]['value'];
				}
				
			}
			else {
				parsedRow[column] = null;
			}
			
		})
		parsedSheet.push(parsedRow);
	}
	return {"parsedSheet" : parsedSheet, "columns" : columns};
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