function displayInTable(result, type, container = '#table') {
	if (type == "data"){
		var formatted_data = [];
		for (var i = 0; i < result.length; i++) {
			formatted_data.push(formatData(result[i]["data"]));
		}
		var temp = pivot(formatted_data);
		//var columns = [{checkbox: true, visible: true}];
		var columns = [];
		temp[0].forEach(n => {
			columns.push({field : n, title : n});
		})

		$(container).bootstrapTable('destroy').bootstrapTable({
			columns: columns,
			data: formatted_data,
			sidePagination: "client",
			pageNumber: 1,
			pageSize: 10,
			pageList: [1, 10, 20, 30, 40], 
			clickToSelect: true,
			showToggle:true,
			cardView: true,
			pagination: true,
			search: true,
			striped: true,
			/*showFullscreen: true,*/
			/*detailView: true,*/
			formatLoadingMessage: function () {  
				return "Loading...";  
			},
			formatNoMatches: function () { 
				return 'No such record';  
			},  
			onLoadError: function (data) {
				$('#reportTable').bootstrapTable('removeAll');  
			},
		});	
	}

	else{
		var formatted_data = [];
		for (var i = 0; i < result.length; i++) {
			formatted_data.push(formatData(result[i]["data"]));
		}
		var temp = pivot(formatted_data);
		var columns = [{checkbox: true, visible: true}];
		temp[0].forEach(n => {
			columns.push({field : n, title : n});
		})

		$(container).bootstrapTable('destroy').bootstrapTable({
			columns: columns,
			data: formatted_data,
			sidePagination: "client",
			pageNumber: 1,
			pageSize: 10,
			pageList: [20, 30, 40], 
			clickToSelect: true,
			showToggle:true,
			cardView: true,
			pagination: true,
			search: true,
			formatLoadingMessage: function () {  
				return "Loading...";  
			},
			formatNoMatches: function () { 
				return 'No such record';  
			},  
			onLoadError: function (data) {  
				$('#reportTable').bootstrapTable('removeAll');  
			},
		});

		/*$('#table input[type=checkbox]').click(function(){
			console.log("here");
			console.log($(this));
		});*/
	}

	

	return;
}