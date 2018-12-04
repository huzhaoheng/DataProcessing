function initialization() {
	var args = location.search.replace('?','').split('&').reduce(function(s,c){var t=c.split('=');s[t[0]]=t[1];return s;},{});
	window.username = args['username'].replace("+", " ");
	$.getJSON(
		'/getFormulaList',
		{arg: JSON.stringify({"username" : window.username})},
		function (response){
			var result = response.elements;
			var status = result["status"];
			var formulaList = result["formulaList"];
			loadGrid(formulaList);
			loadDisplayFormulaArgumentsArea();
			loadDisplayFormulaCodeArea();
			loadSubmitButton();
			initIntro();
		}
	)
}

function initIntro() {
	var tour = introJs()
	tour.setOption('tooltipPosition', 'auto');
	tour.setOption('positionPrecedence', ['left', 'right', 'top', 'bottom']);
	tour.setOption('steps', [{
		'element': '#grid',
		'intro': `Here is a list of all formulas you have created.`
	}, {
		'element': '#formulaName',
		'intro': `To create a new formula, first enter the name of it here.`
	}, {
		'element': '#addArgument',
		'intro': `After entering the formula name, click 'Add Argument' button to add an argument for the formula.`
	}, {
		'element': '#assignArgument',
		'intro': `After adding all arguments, click 'Assign Arguments' button to assign them and generate corresponding signature.`
	}, {
		'element': '#howToUse',
		'intro': `Click here for more information.`
	}, {
		'element': '#formula-parameters',
		'intro': `Here is the list of all arguments you added.`
	}, {
		'element': '#code',
		'intro': `Formula signature will be generated here and you can wirte the code.`
	}]);
	tour.start();
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
			initialization();
		}
	)
}

function loadFormula(formulaID) {
	$.getJSON(
		'/loadFormulaByID',
		{arg: JSON.stringify({"formulaIDList" : [formulaID]})},
		function (response){
			var result = response.elements;
			var status = result["status"];
			var message = result["message"];
			var formula = result["formula"][0];
			updateFormulaArea(formula);
		}
	)	
}

function loadDisplayFormulaArgumentsArea() {
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

	$("#formula-parameters").empty();
	$("#formula-parameters").kendoGrid({
		dataSource: dataSource,
		height: 200,
		toolbar: [
			{
				template: `<input type="text" class="form-control" placeholder="Formula Name" id="formulaName"/>`
			},{
				template: `<a class="k-button" href="\\#" id="addArgument" onclick="return AddFormulaArgument()">Add Argument</a>`
			},{
				template: '<a class="k-button" href="\\#" id="assignArgument" onclick="return AssignArguments()">Assign Arguments</a>'
			},{
				template: '<a class="k-button" href="\\#" id="howToUse" onclick="return openHowToUseFormulaPage();">How To Use?</a>'
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
							"cell",
							"area",
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
						]
					}).appendTo(container);
				}
			},
			{ command: ["edit", "destroy"], title: "Action", width: "250px" }
		]
	});
}

function AddFormulaArgument() {
	var grid = $("#formula-parameters").data("kendoGrid");
	grid.addRow();
}

function loadDisplayFormulaCodeArea() {
	$("#code").empty();
	window.flask = new CodeFlask('#code', {
		language: 'js',
		lineNumbers: true,
		ariaLabelledby: 'header',
		handleTabs: true
	});
}

function loadSubmitButton() {
	$("#submit").kendoButton();
	return;
}

function updateFormulaArea(formula) {
	var formulaName = formula["formulaName"];
	var evalCode = formula["evalCode"];
	var writtenCode = formula["writtenCode"];
	var args = JSON.parse(formula["args"]);

	$("#formulaName").val(formulaName);
	window.flask.updateCode(writtenCode);

	var data = [];
	args.forEach(function (each){
		var argName = each[0];
		var argType = each[1];
		data.push({
			variableName : argName,
			variableType : argType
		});
	})
	var dataSource = {
			data : data,
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

	var grid = $("#formula-parameters").data("kendoGrid");
	grid.setDataSource(dataSource);
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

	window.flask.updateCode(signature);

	return false;
}

function submitFormula() {
	var value = window.flask.getCode();
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
	console.log(code);
	eval(code);
	console.log(formulaName);
	console.log(value);
	console.log(args_list);
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
			window.opener.sharedObjectToManageFormula['evalCode'] = evalCode;
			window.opener.loadNewFormula();
			initialization();
		}
	)
}

function openHowToUseFormulaPage() {
	var path = "/static/html/howToUseFormula.html";
	var name = "How To Use Customized Formula?";
	window.open(path, name);
}