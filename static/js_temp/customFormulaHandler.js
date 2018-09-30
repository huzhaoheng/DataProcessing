function loadCustomFormulaArea() {
	var dataSource = {
						data : null,
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
		toolbar: [
			"create", 
			{template: '<a class="k-button" href="\\#" onclick="return AssignArguments()">Assign Arguments</a>'}
		],
		editable: "inline",
		columns: [
			{ field: "variableName", title: "Variable Name"},
			{ 
				field: "variableType",
				title: "Variable Type",
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
							"anyvalue",
							"cell",
							"area",

						]
					}).appendTo(container);
				}
			},
			{ command: ["edit", "destroy"], title: "Action", width: "250px" }
		]
	});
}

function getArguments() {
	var ret = []
	var grid = $("#formula-parameters").data("kendoGrid");
	var data = grid.dataSource.data();
	data.forEach(function (each) {
		ret.push({
			'variableName' : each['variableName'],
			'variableType' : each['variableType']
		})
	});
	return ret;
}

function argsValidation(args) {
	var dict = {};
	args.forEach(function (each) {
		var name = each['variableName'];
		var type = each['variableType'];
		if (name == null || type == null) {
			window.alert('Name/Type of argument cannot be null');
			return false;
		}
		else if (name in dict) {
			window.alert('Duplilcate argument name');
			return false;
		}
		else {
			true;
		}
	})

	return true;
}
function AssignArguments() {
	var args = getArguments();
	var res = argsValidation(args);
	if (res == false) {
		return false;
	}

	var signature = `
		function 
	`

	$('#custom-formula .inner').eq(1).append(`
		<textarea id="formula-coding-area" rows="10" cols="30"></textarea>
		<script>
			$("#formula-coding-area").kendoEditor({
				tools: [
					"bold",
					"fontSize"
				]
			});
		</script>
	`);
	return false;
}
