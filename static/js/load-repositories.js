function loadRepository() {
	var query = loadRepositoryListQuery();
	$.getJSON(
		'/getRepositoryList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var repositoryList = result['repositoryList'];
			var queries = loadRepositoriesQuery(repositoryList);
			$.getJSON(
				'/getRepositoriesData',
				{arg: JSON.stringify({"queries" : queries})},
				function (response){
					var result = response.elements;
					
					$("#nav-tabs").empty();
					$("#tab-content").empty();
					
					repository_index = -1;
					for (repository in result){

						var stripped = repository.replace(/[^0-9a-zA-Z]/gi, '');

						repository_index += 1;
						var data = [];
						result[repository].forEach(each => {
							data.push({"data" : each});
						})

						var div = document.createElement("div");
						if (repository_index == 0){
							div.setAttribute("class", "tab-pane active");
						}
						else{
							div.setAttribute("class", "tab-pane");
						}
						div.setAttribute("id", stripped + "-div");

						var p = document.createElement("p");

						var new_table = document.createElement("table"); 
						new_table.setAttribute("data-classes", "table table-hover table-condensed");
						new_table.setAttribute("id", stripped);

						div.appendChild(p);
						p.appendChild(new_table);

						var li = document.createElement("li");
						li.setAttribute('id', stripped + '-li');
						if (repository_index == 0){
							li.setAttribute('class', 'active');
							window.source = 'Repository';
						}
						
									
						var a = document.createElement("a");
						a.setAttribute("href", "#" + stripped + "-div");
						a.setAttribute("data-toggle", "tab");
						a.innerHTML = repository;

						li.appendChild(a);

						document.getElementById("nav-tabs").appendChild(li);
						document.getElementById("tab-content").appendChild(div);

						$("#" + stripped + "-li").hoverTips();

						displayInTable(data, "data", "#" + stripped);
					}
				}
			)
		}
	);
}
