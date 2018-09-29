function loadCustomFormulaArea() {
	var dataSource = {
						data : [{variableName: "", variableType: ""}],
						schema : {
							model : {
								id : "variableName",
								fields: {
									variableName: {type: "string"},
									variableType: {type: "string"}
								}
							}
						}
					};

	$("#formula-parameters").kendoGrid({
		dataSource: dataSource,
		height: 200,
		toolbar: ["create"],
		editable: "inline",
		columns: [
			{ field: "variableName", title: "Variable Name"},
			{ 
				field: "variableType",
				title: "Variable Type",
				//template: "<strong>#: variableType # </strong>",
				//template: "#= displayVariableType(typeName) #",
				template: function(dataItem) {
					return kendo.htmlEncode(dataItem.variableType);
				},
				editor: function(container, options) {
					var input = $("<input id='variableTypeList'></input>");
					input.attr("name", options.field);
					input.appendTo(container);
					input.kendoDropDownList({
						dataSource: [
							"number",
							"number+", 
							"number++",
							"integer",
							"integer+",
							"integer++",
							"divisor",
							"string",
							"boolean",
							"logical",
							"date",
							"datetime",
							"anyvalue"
						]
					}).appendTo(container);
				}
			},
			{ command: ["edit", "destroy"], title: "Action", width: "250px" }
		]
	});
}


function displayVariableType(typeName) {
	console.log(typeName);
	return typeName;
}