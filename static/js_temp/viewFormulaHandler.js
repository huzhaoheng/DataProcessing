function initialization() {
	$.getJSON(
		'/getFormulaList',
		{arg: JSON.stringify({"username" : window.username})},
		function (response){
			var result = response.elements;
			var status = result["status"];
			var formulaList = result["formulaList"];
			loadGrid(formulaList);
		}
	)
}

function loadGrid(formulaList) {
	var data = [];
	for (id in formulaList) {
		data.push({
			ID : id,
			Name : formulaList[id]
		});
	}
	var dataSource = {
			data : data,
			schema : {
				model : {
					id : "ID",
					fields: {
						ID: {type: "integer"},
						Name: {type: "string"}
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
				field: "Name" 
			},{
				command : [{
					name : "View Formula",
					iconClass: "k-icon k-i-eye",
					click : function (e) {
						e.preventDefault();
						var tr = $(e.target).closest("tr");
						var data = this.dataItem(tr);
						var formulaID = data["ID"];
						loadFormula(formulaID);
						return;
					}
				}, {
					name : "Delete Formula",
					iconClass: "k-icon k-i-trash",
					click : function (e) {
						//e.preventDefault();
						var tr = $(e.target).closest("tr");
						var data = this.dataItem(tr);
						var formulaID = data["ID"];
						deleteFormula(formulaID);
						return;
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

function deleteFormula(formulaID) {
	$.getJSON(
		'/deleteFormula',
		{arg: JSON.stringify({"formulaID" : formulaID})},
		function (response){
			var result = response.elements;
			var status = result["status"];
			var message = result["message"];
			console.log(status);
			initialization();
		}
	)
}

function loadFormula(formulaID) {
	console.log(formulaID);
	$.getJSON(
		'/loadFormula',
		{arg: JSON.stringify({"formulaID" : formulaID})},
		function (response){
			var result = response.elements;
			var status = result["status"];
			var message = result["message"];
			var formula = result["formula"];
			console.log(formula);
			//initialization();
		}
	)	
}