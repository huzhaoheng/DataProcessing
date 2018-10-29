function initialization() {
	var args = location.search.replace('?','').split('&').reduce(function(s,c){var t=c.split('=');s[t[0]]=t[1];return s;},{});
	window.username = args['username'];
	initSpreadSheet();
	initCodingArea();
	loadCurrentSheetsGrid();
	/*window.mapping = {'sheets':[], 'columns':[]};
	var sheets = window.opener.sharedObjectToJoinSheets['sheets'];
	console.log(sheets);
	generateSheetsAndColumnsMapping(sheets);*/
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
	console.log(activeSheet);
	var parsedSheet = parseSheet(activeSheet);
	console.log(parsedSheet);

	$.getJSON(
		'/saveSheets',
		{arg: JSON.stringify({"name" : activeSheetName, "data" : parsedSheet})},
		function (response){
			var result = response.elements;
			console.log(result);
			return;
		}
	)
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