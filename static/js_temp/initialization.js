function initialization(username) {
	window.username = username;
	//$(".navbar-brand").attr("href", "http://listen.online/home?username=" + username);
	$(".navbar-brand").attr("href", "http://127.0.0.1:1111/home?username=" + username);
	loadQueries(username);
}

function loadQueries(username) {
	$.getJSON(
		'/getQueries',
		{arg: JSON.stringify({"username" : username})},
		function (response){
			var queries = response.elements;
			console.log(queries);
			loadGrid(queries);
		}
	)
}

function loadGrid(queries) {
	var dataSource = [];
	for (query_name in queries) {
		var query_id = queries[query_name]["ID"];
		var query_comment = queries[query_name]["comment"];
		dataSource.push({
			ID : query_id,
			Query : query_name,
			Comment : query_comment
		});
	}

	$("#grid").kendoGrid({
		columns: [
			{ 
				field: "ID",
				filterable: false
			},{ 
				field: "Query" 
			},{ 
				field: "Comment" 
			},{
				command : [{
					name : "Details",
					iconClass: "k-icon k-i-eye",
					click : function (e) {
						var query_id = this["columns"][0]["field"];
						var query_name = this["columns"][1]["field"];
						viewQueryDetail(window.username, query_id, query_name);
					}
				}, {
					name : "Edit",
					iconClass: "k-icon k-i-edit",
					click : function (e) {
						var tr = $(e.target).closest("tr");
						var data = this.dataItem(tr);
						var query_id = data["ID"];
						var query_name = data["Query"];
						var query_comment = data["Comment"];
						editQueryComment(window.username, query_id, query_name, query_comment);
					}
				}]
			}
		],
		filterable: true,
		dataSource: dataSource,
		pageable: {
			pageSize: 10
		}
	});
}

function viewQueryDetail(username, query_id, query_name) {
	return;
}

function editQueryComment(username, query_id, query_name, query_comment) {
	$("#dialog").kendoWindow({
		modal: true,
		draggable: true,
		height: "40%",
		width: "50%",
		scrollable: true,
		resizable: true,
		position: {
			top: "30%",
			left: "25%"
		},
		content: "/static/html/queryDetail.html",
		open: function(e) {
			window.query_id = query_id;
			window.query_name = query_name;
			window.query_comment = query_comment;
		},
		close: function(e) {
			window.query_id = undefined;
			window.query_name = undefined;
			window.query_comment = undefined;
		}
	});
	$("#dialog").data("kendoWindow").open();
	return;
}