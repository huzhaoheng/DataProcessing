function initialization() {
	var args = location.search.replace('?','').split('&').reduce(function(s,c){var t=c.split('=');s[t[0]]=t[1];return s;},{});
	window.username = args['username'];
	initSpreadSheet();
	loadCurrentSheetsGrid();
	/*window.mapping = {'sheets':[], 'columns':[]};
	var sheets = window.opener.sharedObjectToJoinSheets['sheets'];
	console.log(sheets);
	generateSheetsAndColumnsMapping(sheets);*/
}

function initSpreadSheet() {
	$("#spreadsheet").kendoSpreadsheet();
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
	console.log(sheet);
	var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
    var data = spreadsheet.toJSON();
    if (sheetLoaded(data, sheet)) {

    }
    console.log(data);
}

function sheetLoaded(data, sheet) {
	var loaded = false;
	data['sheets'].forEach(function (each) {
		if (each['name'])
	})
}

function sheetName(sheetId) {
	var sheetsArr = window.mapping['sheets'];
	for (var i = 0; i < sheetsArr.length; i++) {
		if (sheetsArr[i].sheetId == sheetId) {
			return sheetsArr[i].name;
		}
	}
}

function columnName(columnId) {
	var columnsArr = window.mapping['columns'];
	for (var i = 0; i < columnsArr.length; i++) {
		if (columnsArr[i].columnId == columnId) {
			ret = columnsArr[i].name;
			return ret
		}
	}
}

function generateSheetsAndColumnsMapping(originSheets) {
	// array of all sheets
	window.mapping['sheets'] = originSheets.map(function (sheet, index) {
		return {
			'sheetId' : index, 
			'name' : sheet['name']
		};
	})
	var columnIndex = 0
	originSheets.forEach(function (sheet, index) {
		var sheetCols = sheet['rows'][0]['cells'];
		sheetCols.forEach(function (each) {
			window.mapping['columns'].push({
				'sheetId' : index,
				'name' : each['value'],
				'columnId' : columnIndex
				//'actualVal' : each['value']
			});
			columnIndex += 1;
		})
	})
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
	});

	return parsedSheets;
}

function submitHandler() {
	window.opener.updateSharedObjectToJoinSheets();
	var sheets = window.opener.sharedObjectToJoinSheets['sheets'];
	var joiningGroups = {};
	var grid = $("#grid").data("kendoGrid");
	var rowNum = grid.items().length;

	for (var i = 0; i < rowNum; i ++) {
		var dataItem = 	grid.dataItem("tbody tr:eq(" + i.toString() + ")");
		var joiningGroupId = dataItem['ID'];
		var leftSheetId = dataItem['LeftSheet'];
		var rightSheetId = dataItem['RightSheet'];
		var leftSheetColumnId = dataItem['LeftSheetColumn'];
		var rightSheetColumnId = dataItem['RightSheetColumn'];

		var leftSheet = findCorrespondingSheet(sheets, leftSheetId);
		var rightSheet = findCorrespondingSheet(sheets, rightSheetId);
		joiningGroups[joiningGroupId] = {
			'leftSheetName' : sheetName(leftSheetId),
			'rightSheetName' : sheetName(rightSheetId),
			'leftSheet' : parseSheets([leftSheet])[0],
			'rightSheet' : parseSheets([rightSheet])[0],
			'leftColumn' : columnName(leftSheetColumnId),
			'rightColumn' : columnName(rightSheetColumnId),
		};
	}

	console.log(joiningGroups);

	$.getJSON(
		'/joinSheets',
		{arg: JSON.stringify({"joiningGroups" : joiningGroups})},
		function (response){
			var result = response.elements;
			console.log(result);
			displayJoiningResult(result);
			return;
		}
	)
}

function findCorrespondingSheet(sheets, sheetId) {
	var ret = null;

	for (var i = 0; i < sheets.length; i ++) {
		var sheet = sheets[i];
		if (sheet['name'] == sheetName(sheetId)) {
			ret = sheet;
			break;
		}
	}

	return ret;
}

function displayJoiningResult(result) {
	var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
	if (spreadsheet != undefined) {
		$("#spreadsheet").empty();
	}
	$("#spreadsheet").kendoSpreadsheet({
		sheets: Object.values(result).map(function (sheet) {
			var ret = {
				'rows' : []
			};

			if (sheet.length == 0) {
				return ret;
			}

			ret['rows'].push({
				'cells' : Object.keys(sheet[0]).map(function (key) {
					return {
						value: key, 
						textAlign: 'center'
					};
				})
			});

			

			sheet.forEach(function (record) {
				ret['rows'].push({
					'cells' : Object.values(record).map(function (value) {
						return {
							value: value, 
							textAlign: 'center'
						};
					})
				});
			})

			return ret;
		})
	});
	loadFormula();
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