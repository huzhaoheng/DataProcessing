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
	var args_list = [];
	args.forEach(function (each) {
		var name = each['variableName'];
		var type = each['variableType'];
		args_list.push([name, type]);
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

	return {"signature" : signature, "extra" : extra, "args_list" : args_list};
}

function AssignArguments() {
	var args = getArguments();
	var valid = argsValidation(args);
	if (valid == false) {
		return false;
	}

	var formulaName = $('#formulaName').val();
	if (formulaName.length == 0) {
		window.alert("Formula name cannot be null");
		return false;
	}

	var res = buildSignature(formulaName, args);
	var signature = res['signature'];
	var extra = res['extra'];

	openCodingArea(signature);
	return false;
}

function openCodingArea(signature) {
	window.sharedObject = {"signature" : signature};
	var URL_OF_POPUP_WINDOW = "/static/html/codingArea.html";
	var NAME_OF_POPUP_WINDOW = "codingArea";
	var POPUP_WINDOW_STYLE_PROPERTIES = null;
	window.open(URL_OF_POPUP_WINDOW, NAME_OF_POPUP_WINDOW, POPUP_WINDOW_STYLE_PROPERTIES);
}

function closeCodingArea() {
	var code = window.sharedObject['code'];
	if (code == null) {
		return;
	}
	submitFormula(code);
}

function submitFormula(value) {
	var formulaName = $('#formulaName').val();

	var args = getArguments();
	var res = buildSignature(formulaName, args);
	var extra = res['extra'];
	var args_list = res['args_list']
	var code = `kendo.spreadsheet.defineFunction("` + formulaName + `", ` + value + `).args([`;
	extra.forEach(function (each) {
		var name = each[0];
		var type = each[1];
		code += `["` + each.join('","') + `"],`;
	})
	code += `]);`
	eval(code);
	storeFormula(formulaName, code, value, args_list);
}

function storeFormula(formulaName, evalCode, writtenCode, args) {
	$.getJSON(
		'/storeFormula',
		{arg: JSON.stringify({
				"formulaName" : formulaName, 
				"evalCode" : evalCode, 
				"writtenCode" : writtenCode,
				"username" : window.username,
				"args" : JSON.stringify(args)
			})
		},
		function (response){
			var res = response.elements;
			var message = res["message"];
			var message_type = res["status"];
			// var args = res["args"];
			// console.log(JSON.parse(args));
			loadMessage(message, message_type);
		}
	)
}

function editFormula() {
	var path = "/static/html/viewFormula.html";
	var name = "viewFormula";
	var new_window = window.open(path, name);
	new_window.username = window.username;
}