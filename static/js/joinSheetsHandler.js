function initialization() {
	var args = location.search.replace('?','').split('&').reduce(function(s,c){var t=c.split('=');s[t[0]]=t[1];return s;},{});
	window.username = args['username'];
	var spreadsheet = $("#spreadsheet", window.opener.document);
	
	var sheets = window.opener.sharedObjectToJoinSheets['sheets'];
	var parsedSheets = parseSheets(sheets);
	console.log(sheets);
	//loadGrid(parameters);
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

function loadGrid(argument) {
	// body...
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

