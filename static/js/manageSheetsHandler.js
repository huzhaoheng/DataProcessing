function initialization() {
	var args = location.search.replace('?','').split('&').reduce(function(s,c){var t=c.split('=');s[t[0]]=t[1];return s;},{});
	window.username = args['username'].replace("+", " ").replace("%20", " ");
	initSpreadSheet();
	initCodingArea();
	loadCurrentSheetsGrid();
	loadStoredSheetsGrid();
	loadFormula();
	initIntro();
}

function initSpreadSheet() {
	$("#spreadsheet").kendoSpreadsheet();
	return;
}

function initIntro() {
	var tour = introJs()
	tour.setOption('tooltipPosition', 'auto');
	tour.setOption('positionPrecedence', ['left', 'right', 'top', 'bottom']);
	tour.setOption('steps', [{
		'element': '#currentSheetsGrid',
		'intro': `These are the sheets from original page, you can load them here to process them.`
	}, {
		'element': '#StoredSheetsGrid',
		'intro': `These are the tables you stored in MySQL database.`
	}, {
		'element': '#spreadsheet',
		'intro': `The data from sheets in original pages or table from MySQL or result of query will be displayed here.`
	}, {
		'element': '#saveSheetBtn',
		'intro': `Save the table displayed in above spreadsheet into MySQL.<br/>NOTICE: rows without 'SystemID' column will be treated as new record when you store the data to existing table.`
	}, {
		'element': '#runQueryBtn',
		'intro': `Click 'Run Query' button to execute the your query.`
	}]);
	tour.start();
}

function initCodingArea() {
	window.editor = CodeMirror.fromTextArea(document.getElementById('code'), {
		indentWithTabs: true,
		smartIndent: true,
		lineNumbers: true,
		matchBrackets : true,
		autofocus: true,
		mode: 'text/x-mysql'
	}).setValue("# NOTE: All values stored in tables are in STRING type, so if you want to use them as other any type, such as integer, please do CAST(value AS UNSIGNED/...)");
}

function loadCurrentSheetsGrid() {
	var sheets = window.opener.sharedObjectToManageSheets['sheets'];
	if (sheets == undefined) {
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
			dataSource: null
		})
		return;
	}
	else {
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
			var sizeList = result['sizeList'];
			var data = originalTableNameList.map(function (originalTableName, index) {
				return {
					"ID" : index,
					"originalTableName" : originalTableName,
					"derivedTableName" : derivedTableNameList[index],
					"size" : sizeList[index]
				};
			})

			var dataSource = {
					data: data,
					schema : {
						model : {
							id : "ID",
							fields: {
								originalTableName: {type: "string"},
								derivedTableName : {type: "string"},
								sizeList: {type: "integer"},
								ID: {type: "integer"}
							}
						}
					} 
				};

			var grid = $("#StoredSheetsGrid").data("kendoGrid");
			if (grid != undefined) {
				grid.setDataSource(dataSource);
			}
			else {
				$("#StoredSheetsGrid").kendoGrid({
					columns: [{
						field: "ID"
					},{
						field: "originalTableName"
					},{
						field: "derivedTableName"
					},{
						field: "size",
						title: "Size (KB)"
					},{
						command : [{
							name : "View Table",
							iconClass: "k-icon k-i-eye",
							click : function (e) {
								e.preventDefault();
								var tr = $(e.target).closest("tr");
								var data = this.dataItem(tr);
								loadStoredTable(data["originalTableName"]);
								return;
							}
						},{
							name : "Delete Table",
							iconClass: "k-icon k-i-delete",
							click : function (e) {
								e.preventDefault();
								var tr = $(e.target).closest("tr");
								var data = this.dataItem(tr);
								deleteStoredTable(data["originalTableName"], data["derivedTableName"]);
								return;
							}
						}]
					}],
					dataSource: dataSource
				})
			}

			return;
		}
	)
}

function loadStoredTable(table) {
	console.log(table);
	$.getJSON(
		'/loadTable',
		{arg: JSON.stringify({"table" : table, "username" : window.username})},
		function (response){
			var result = response.elements;
			var data = result['data'];
			var columns = result['columns'];
			// var sheet = convertTableToSheet(table, data, columns);
			var sheet = convertTableToSheet(table, data);
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

function deleteStoredTable(originalTableName, derivedTableName) {
	$.getJSON(
		'/deleteTable',
		{
			arg: JSON.stringify({
				"originalTableName" : originalTableName, 
				"derivedTableName" : derivedTableName,
				"username" : window.username
			})
		},
		function (response){
			var result = response.elements;
			var status = result['status'];
			var message = result['message'];
			loadMessage(message, status);
			if (status == "success") {
				loadStoredSheetsGrid();
				var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
				var data = spreadsheet.toJSON();
				var check = sheetLoaded(data, {"name" : originalTableName});
				if (check["loaded"]) {
					var index = check["index"];
					data['sheets'].splice(index, 1);
					activateID = 0;
					spreadsheet.fromJSON(data);
					spreadsheet.activeSheet(spreadsheet.sheets()[activateID]);
				}
			}
			return;
		}
	)
}

/*function convertTableToSheet(tableName, tableData, columns) {
	var rows = [];
	var fields = [];

	if (columns.length > 0) {
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
	}

	else {
		var columnNumer = 0;
		var columnCounted = false;
		tableData.forEach(function (record) {
			var row = {cells: []};
			record.forEach(function (value) {
				row['cells'].push({value: value, textAlign: 'center'});
				if (!columnCounted) {
					columnNumer += 1;
				}
			})
			rows.push(row);
			columnCounted = true;
		})

		for (var i = 0; i < columnNumer; i ++) {
			fields.push({
				value: "ENTER COLUMN NAME HERE BEFORE STORING !", 
				bold: "true", 
				color: "red", 
				textAlign: "center"
			})
		}
		rows.unshift({cells: fields});
	}
	
	var sheet = {"name" : tableName, "rows" : rows};
	return sheet;
}*/

function convertTableToSheet(tableName, data) {
	var rows = [];
	var fields = [];

	if (data.length > 0) {
		var columns = Object.keys(data[0]);
		console.log(columns);
		columns.forEach(function (column) {
			fields.push({
				value: column, 
				bold: "true", 
				color: "black", 
				textAlign: "center"
			});
		});
		rows.push({cells: fields});
		data.forEach(function (each) {
			var row = {cells: []};
			for (col in each) {
				var value = each[col];
				row['cells'].push({value: value, textAlign: 'center'});
			}
			rows.push(row);
		})
	}


/*	else {
		var columnNumer = 0;
		var columnCounted = false;
		tableData.forEach(function (record) {
			var row = {cells: []};
			record.forEach(function (value) {
				row['cells'].push({value: value, textAlign: 'center'});
				if (!columnCounted) {
					columnNumer += 1;
				}
			})
			rows.push(row);
			columnCounted = true;
		})

		for (var i = 0; i < columnNumer; i ++) {
			fields.push({
				value: "ENTER COLUMN NAME HERE BEFORE STORING !", 
				bold: "true", 
				color: "red", 
				textAlign: "center"
			})
		}
		rows.unshift({cells: fields});
	}*/
	
	var sheet = {"name" : tableName, "rows" : rows};
	return sheet;
}

function toColumnName(num) {
	for (var ret = '', a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
		ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret;
	}
	return ret;
}

function saveSheet() {
	var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
	var sheets = spreadsheet.toJSON();
	var activeSheetName = sheets['activeSheet'];
	var activeSheet = null;
	var sheets = sheets['sheets'];
	for (var i = 0; i < sheets.length; i ++) {
		if (sheets[i]['name'] == activeSheetName) {
			activeSheet = sheets[i];
			break;
		}
	}

	var rows = activeSheet['rows'];
	var cols = rows[0]['cells'].map(function (cell) {
		return cell['value'];
	});

	rowNum = rows.length;
	colNum = cols.length;

	var range = spreadsheet.activeSheet().range("A2:" + toColumnName(colNum) + rowNum.toString());
	var data = range.values();
	var parsedSheet = parseSheet(data, cols);

	promptFunction("Please enter a name:", activeSheetName).then(function (name) {
		console.log(parsedSheet);
		$.getJSON(
			'/saveSheets',
			{arg: JSON.stringify({"name" : name, "data" : parsedSheet, "columns" : cols, "username" : window.username})},
			function (response){
				var result = response.elements;
				loadStoredSheetsGrid();
				var status = result['status'];
				var message = result['message'];
				loadMessage(message, status);
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
		title: "Options",
		value: defaultValue,
		content: content
	}).data("kendoPrompt").open().result;
}

function parseSheet(data, cols) {
	var parsedSheet = []; 
	for (var i = 0; i < data.length; i ++) {
		var row = data[i];
		var parsedRow = {};
		cols.forEach(function (column, index) {
			var value = row[index];
			if (column == "SystemID") {
				parsedRow[column] = parseInt(value);
			}
			else if (value != null) {
				parsedRow[column] = value.toString();
			} 
			else {
				parsedRow[column] = null;
			}
		})
		parsedSheet.push(parsedRow);
	}
	return parsedSheet;
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

function runQuery() {
	var query = window.editor.getValue();
	$.getJSON(
		'/runQuery',
		{arg: JSON.stringify({"query" : query, "username" : window.username})},
		function (response){
			var result = response.elements;
			var message = result["message"];
			if (message == "Done") {
				loadMessage("Query Executed", "success");
			}
			else {
				loadMessage(message, "failure");
			}
			var data = result["data"];
			console.log(data);
			// var sheet = convertTableToSheet("QueryResult", data, []);
			var sheet = convertTableToSheet("QueryResult", data);
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