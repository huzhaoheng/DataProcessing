function initialization(username) {
	window.username = username;
	//$(".navbar-brand").attr("href", "http://listen.online/home?username=" + username);
	$(".navbar-brand").attr("href", "http://127.0.0.1:1111/home?username=" + username);
	loadQueries(username);
	introJs().start();
}

function loadQueries(username) {
	$.getJSON(
		'/getQueries',
		{arg: JSON.stringify({"username" : username})},
		function (response){
			var queries = response.elements;
			loadGrid(queries);
		}
	)
}

function loadGrid(queries) {
	var data = [];
	for (var query_name in queries) {
		var query_id = queries[query_name]["ID"];
		var query_comment = queries[query_name]["comment"];
		data.push({
			ID : query_id,
			Query : query_name,
			Comment : query_comment
		});
	}

	var dataSource = {
						data : data,
						schema : {
							model : {
								id : "ID",
								fields: {
									ID: {type: "integer"},
									Query: { type: "string"},
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
				field: "Query",
				editable: function (dataItem) {
					return false;
				}
			},{ 
				field: "Comment",
			},{
				command : [{
					name : "Details",
					iconClass: "k-icon k-i-eye",
					click : function (e) {
						var tr = $(e.target).closest("tr");
						var data = this.dataItem(tr);
						var query_id = data["ID"];
						var query_name = data["Query"];
						viewQueryDetail(window.username, query_id, query_name);
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
		dataSource: dataSource,
		editable: {
			mode : "popup",
			window: {
				title: "Edit Query Comment",
				animation: false,
			}
		},
		filterable: true,
		pageable: {
			pageSize: 10
		},

		save: function(e) {
			var query_id = e.model["ID"];
			var comment = e.model["Comment"];
			$.getJSON(
				'/setNodeProperties',
				{arg: JSON.stringify({"id" : query_id, "key" : "comment", "value" : comment, "type" : "string"})},
				function (response){
					var result = response.elements;
					console.log(result);
				}
			)	
		}
	});
}

function viewQueryDetail(username, query_id, query_name) {
	var detailWindow = window.open("../static/html/queryDetail.html?username=" + username + "&query_id=" + query_id + "&query_name=" + query_name);
	// var detailWindow = window.open("../static/html/queryDetail.html");
	detailWindow.username = username;
	detailWindow.query_id = query_id;
	detailWindow.query_name = query_name;
	return;
}

function initIntroComponent() {
/*	document.getElementById('startButton').onclick = function() {
		introJs().setOption('doneLabel', 'Next page').start().oncomplete(function() {
			window.location.href = 'second.html?multipage=true';
		});
	};*/
	/*introJs().setOption('doneLabel', 'Next page').start().oncomplete(function() {
		window.location.href = 'second.html?multipage=true';
	});*/
	return;
}