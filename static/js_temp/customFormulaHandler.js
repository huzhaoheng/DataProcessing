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
			{
				template: `
					<input type="text" class="form-control" placeholder="Formula Name" id="formulaName"/>
				`
			},
			"create", 
			{
				template: '<a class="k-button" href="\\#" onclick="return AssignArguments()">Assign Arguments</a>'
			},
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
		if (name.length == 0 || type.length == 0) {
			window.alert('Name/Type of argument cannot be null');
			return false;
		}
		else if (name in dict) {
			window.alert('Argument names cannot be the same');
			return false;
		}
		else {
			dict[name] = type;
			true;
		}
	})

	return true;
}

function buildSignature(formulaName, args) {
	var signature = "function " + formulaName + "(";
	var extra = [];
	args.forEach(function (each) {
		var name = each['variableName'];
		var type = each['variableType'];
		signature += (name + ",");
		if (["area", "cell"].includes(type)) {
			extra.push(["reference", type]);
		}
		else {
			extra.push([name, type]);
		}
	})
	if (signature.endsWith(',')) {
		signature = signature.slice(0, -1)
	}
	signature += ") {\n\n\n\n\n\n\n\n}";

	return {"signature" : signature, "extra" : extra};
}

function AssignArguments() {
	var args = getArguments();
	var valid = argsValidation(args);
	if (valid == false) {
		return false;
	}

	var formulaName = $('#formulaName').val();
	console.log(formulaName);
	if (formulaName.length == 0) {
		window.alert("Formula name cannot be null");
		return false;
	}

	var res = buildSignature(formulaName, args);
	var signature = res['signature'];
	var extra = res['extra'];

	$("#formulaTextArea").empty();
	/*$("#formulaTextArea").append(`
		<textarea id="formula-coding-area" rows="10" cols="30">` + signature + `</textarea>
		<script>
			$("#formula-coding-area").kendoEditor({
				tools: [
					"bold",
					"fontSize"
				]
			});
		</script>
	`);*/
	$("#formulaTextArea").append(`<textarea id="formula-coding-area" rows="10" cols="30">` + signature + `</textarea>`);
	return false;
}

function submitFormula() {
	var formulaName = $('#formulaName').val();

	var args = getArguments();
	var res = buildSignature(formulaName, args);
	var extra = res['extra'];

	/*var editor = $("#formula-coding-area").data("kendoEditor");
	var value = editor.value();*/
	var value = $("#formula-coding-area").val();
	
	var code = `kendo.spreadsheet.defineFunction("` + formulaName + `", ` + value + `).args([`;
	extra.forEach(function (each) {
		var name = each[0];
		var type = each[1];
		code += `["` + each.join('","') + `"],`;
	});
	code += `]);`
	console.log(code);
	eval(code);


}