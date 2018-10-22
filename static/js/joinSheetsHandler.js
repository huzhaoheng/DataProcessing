function initialization() {
	var args = location.search.replace('?','').split('&').reduce(function(s,c){var t=c.split('=');s[t[0]]=t[1];return s;},{});
	window.username = args['username'];
	window.mapping = {'sheets':[], 'columns':[]};
	var sheets = window.opener.sharedObjectToJoinSheets['sheets'];
	generateSheetsAndColumnsMapping(sheets);
	/*var parsedSheets = parseSheets(sheets);*/
	/*$.getJSON(
		'/joinSheets',
		{arg: JSON.stringify({"sheets" : parsedSheets})},
		function (response){
			var result = response.elements;
			console.log(result);
			return;
		}
	)*/
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

function submitHandler() {
	console.log('submit');
}