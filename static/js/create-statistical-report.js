$(document).ready(function(){
	$("#create-statistical-report-add-row").click(function(){
		var curr_num = parseInt($("#create-statistical-report-table").find('tbody').find('tr').last().find('td').eq(0).text());
		var html_code = "<td>" + (curr_num + 1) + "</td>" + 
						"<td>" + 
							"<div class='btn-group' style='width : 100%'>" + 
								"<button type='button' class='btn btn-block btn-secondary create-statistical-report-dataset-btn' data-toggle='dropdown' onclick='datasetBtnHandler(this);'>Dataset</button>" + 
								"<ul class='dropdown-menu create-statistical-report-dataset' role='menu'></ul>" + 
							"</div>" + 
						"</td>" + 
						"<td>" + 
							"<div class='btn-group' style='width : 100%'>" + 
								"<button type='button' class='btn btn-block btn-secondary create-statistical-report-function-btn' data-toggle='dropdown'>Function</button>" + 
								"<ul class='dropdown-menu create-statistical-report-function' role='menu'>" + 
									"<li onclick='functionLiClickHandler(this);'><a href='#'>COUNT</a></li>" + 
									"<li onclick='functionLiClickHandler(this);'><a href='#'>MAX</a></li>" + 
									"<li onclick='functionLiClickHandler(this);'><a href='#'>MIN</a></li>" + 
									"<li onclick='functionLiClickHandler(this);'><a href='#'>AVG</a></li>" + 
									"<li onclick='functionLiClickHandler(this);'><a href='#'>SUM</a></li>" + 
									"<li onclick='functionLiClickHandler(this);'><a href='#'>STDEV</a></li>" + 
									"<li onclick='functionLiClickHandler(this);'><a href='#'>WORD FREQ</a></li>" + 
								"</ul>" + 
							"</div>" + 
						"</td>" + 
						"<td style='text-align:center;'></td>" + 
						"<td>" + 
							"<div class='btn-group' style='width : 100%'>" + 
								"<button type='button' class='btn btn-block btn-secondary create-statistical-report-property-btn' data-toggle='dropdown' onclick='propertyBtnHandler(this);'>Property</button>" + 
								"<ul class='dropdown-menu create-statistical-report-property' role='menu'></ul>" + 
							"</div>" + 
						"</td>" + 
						"<td>" + 
							"<input type='text' name='values' class='form-control create-statistical-report-values' readonly='true'/>" + 
						"</td>" + 
						"<td>" + 
							"<input type='text' name='alias' class='form-control create-statistical-report-alias'/>" + 
						"</td>";

		$('#create-statistical-report-table').append('<tr id="addr' + (curr_num + 1) + '"></tr>');
		$('#addr' + (curr_num + 1)).html(html_code);
	});

	$("#create-statistical-report-delete-row").click(function(){
		var curr_num = parseInt($("#create-statistical-report-table").find('tbody').find('tr').last().find('td').eq(0).text());
		if(curr_num > 1){
			$("#addr"+ curr_num).remove();
		}
	});
});


function datasetBtnHandler(ele){
	var curr_datasetList = [];
	var a_s = $(ele).next().find("a");
	a_s.each(function() {
		curr_datasetList.push(this.innerText);
	})

	if (curr_datasetList.length == 0){
		var query = loadDatasetListQuery();
		$.getJSON(
			'/getDatasetList',
			{arg: JSON.stringify({"query" : query})},
			function (response){
				var result = response.elements;
				var datasetList = result['datasetList'];
				datasetList.forEach(dataset => {
					$(ele).next().append("<li onclick='datasetLiClickHandler(this);'><a href='#'>" + dataset + "</a></li>");
				})
			}
		)
	}
}

function datasetLiClickHandler(ele){
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);

	
	$(ele).closest('tr').find('.create-statistical-report-function-btn').text("Function");
	$(ele).closest('tr').find('td:eq(3)').empty();
	$(ele).closest('tr').find('.create-statistical-report-property-btn').text("Property");
	$(ele).closest('tr').find('.create-statistical-report-alias').val("");
}

function propertyBtnHandler(ele){
	//var special = ["resource", "object", "neo4j_id", "system_user_username", "system_user_hashkey", "internal_id"];
	var dataset = $(ele).closest('tr').find('.create-statistical-report-dataset-btn').text();
	var query = getDatasetPropertiesQuery(dataset);
	var code = "";
	$.getJSON(
		'/getDatasetProperties',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			for (key in result){
				var properties = result[key];
				for(property in properties){
					var type = properties[property];
					if (!(["system_user_username", "system_user_hashkey", "internal_id"].includes(property))){
						/*$(ele).next().append("<li onclick='propertyLiClickHandler(this);'><a href='#'>" + key + "->" + property + "(" + type + ")" + "</a></li>");*/
						code += "<li onclick='propertyLiClickHandler(this);'><a href='#'>" + key + "->" + property + "(" + type + ")" + "</a></li>";
					}
				}				
			}
			$(ele).next().html(code);
		}
	)
}

function propertyLiClickHandler(ele){
	var function_name = $(ele).closest('tr').find('.create-statistical-report-function-btn').text();
	var selected = $(ele).find('a')[0].innerText;
	var regExp = /\(([^)]+)\)/;
	var matches = regExp.exec(selected);
	var type = matches[1];

	if (function_name == 'Function'){
		$(ele).parent().prev().text(selected);
	}
	else if(function_name == 'WORD FREQ'){
		if (type != 'String'){
			window.alert('Cannot Apply ' + function_name + ' to a ' + type + ' type property');
			return;
		}
		$(ele).parent().prev().text(selected);
	}
	else if (function_name == 'COUNT'){
		$(ele).parent().prev().text(selected);
	}
	else{
		if (type != 'Int' && type != 'Float'){
			window.alert('Cannot Apply ' + function_name + ' to a ' + type + ' type property');
			return;
		}
		$(ele).parent().prev().text(selected);
	}
}

function functionLiClickHandler(ele){
	$(ele).closest('tr').find(".create-statistical-report-values").first().val("");
	$(ele).closest('tr').find(".create-statistical-report-values").first().prop("readonly", true);

	$(ele).closest('tr').find('.create-statistical-report-property').first().text('Property');

	var selected = $(ele).find('a')[0].innerText;
	if (selected == 'COUNT'){
		$(ele).closest('tr').find('td:eq(3)').html("<input type='checkbox'/>");
	}
	else if (selected == 'WORD FREQ'){
		var property = $(ele).closest('tr').find('.create-statistical-report-property-btn').text();
		var regExp = /\(([^)]+)\)/;
		var matches = regExp.exec(property);
		if (matches != null){
			var type = matches[1];
			if (type != 'String'){
				window.alert('Cannot Apply ' + selected + ' to a ' + type + ' type property!!!');
				return;
			}
		}
		$(ele).closest('tr').find('td:eq(3)').empty();
		$(ele).closest('tr').find(".create-statistical-report-values").first().prop("readonly", false);
	}
	else{
		var property = $(ele).closest('tr').find('.create-statistical-report-property-btn').text();
		var regExp = /\(([^)]+)\)/;
		var matches = regExp.exec(property);
		if (matches != null){
			var type = matches[1];
			if(type != "Int" && type != "Float"){
				window.alert('Cannot Apply ' + selected + ' to a ' + type + ' type property');
				return;
			}
		}
		$(ele).closest('tr').find('td:eq(3)').empty();
	}

	$(ele).parent().prev().text(selected);
}

function chartTypeLiClickHandler(ele) {
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);
}

/*$("#create-statistical-report-submit").on('click', function() {
	
	var data = {}
	var chartType = $("#create-statistical-report").find(".create-statistical-report-chart-type-btn").first().text();
	var valid = true;

	if (chartType == 'Chart Type'){
			window.alert('Please select chart type');
			valid = false;
			return;
		}

	$("#create-statistical-report-table").find('tbody').find('tr').each(function (i, el) {
		var $tds = $(this).find('td');
		var num = $tds.eq(0).text();
		var dataset = $tds.eq(1).find('.create-statistical-report-dataset-btn').text();
		var function_name = $tds.eq(2).find('.create-statistical-report-function-btn').text();
		var distinct = $tds.eq(3).find('input').prop('checked');
		var comb = $tds.eq(4).find('.create-statistical-report-property-btn').text();
		var values = $tds.eq(5).find('.create-statistical-report-values').val();
		var alias = $tds.eq(6).find('.create-statistical-report-alias').val();


		if (alias == ""){
			alias = "row" + num.toString();
		}

		if (distinct == undefined){
			distinct = false;
		}
		
		if (dataset == 'Dataset'){
			window.alert('Please select dataset for row #' + num);
			valid = false;
			return;
		}

		if (function_name == 'Function'){
			window.alert('Please select function for row #' + num);
			valid = false;
			return;
		}

		if (comb == 'Property'){
			window.alert('Please select property for row #' + num);
			valid = false;
			return;
		}

		var resource = comb.split('->')[0].split(':')[0];
		var object = comb.split('->')[0].split(':')[1];
		var property = null;

		var regExp = /\(([^)]+)\)/;
		var matches = regExp.exec(comb);
		var pure_property = comb.split('->')[1].split('(')[0];
		var type = matches[1];
		if (!(["resource", "object", "neo4j_id"].includes(pure_property))){
			property = pure_property + "_" + type;
		}
		else{
			property = pure_property;
		}

		data[num] = {
						'dataset' : dataset, 
						'function' : function_name, 
						'distinct' : distinct, 
						'resource' : resource, 
						'object' : object, 
						'property' : property,
						'alias' : alias
					}

	});

	if (!valid){
		return;
	}

	var query = statisticalFunctionQuery(data);

	$.getJSON(
		'/getValue',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var labels = [],
				data = [];

			result.forEach(each => {
				labels.push(each[0]);
				data.push(each[1]);
			})

			var ctx = document.getElementById("myChart");
			var myChart = new Chart(ctx, {
				type: chartType,
				data: {
					labels: labels,
					datasets: [{
						label: 'Result',
						data: data,
						backgroundColor: 'white',
						borderColor: 'red',
						borderWidth: 1
					}]
				},
				options: {
					scales: {
						yAxes: [{
							ticks: {
								beginAtZero:false
							}
						}]
					}
				}
			});

			$("#chart-trigger-btn").click();



		}
	)

	$("#create-statistical-report-close").click();

})*/

$("#create-statistical-report-submit").on('click', function() {
	
	var data = {}
	var valid = true;

	$("#create-statistical-report-table").find('tbody').find('tr').each(function (i, el) {
		var $tds = $(this).find('td');
		var num = $tds.eq(0).text();
		var dataset = $tds.eq(1).find('.create-statistical-report-dataset-btn').text();
		var function_name = $tds.eq(2).find('.create-statistical-report-function-btn').text();
		var distinct = $tds.eq(3).find('input').prop('checked');
		var comb = $tds.eq(4).find('.create-statistical-report-property-btn').text();
		var values = $tds.eq(5).find('.create-statistical-report-values').val();
		var alias = $tds.eq(6).find('.create-statistical-report-alias').val();


		if (alias == ""){
			alias = "row" + num.toString();
		}

		if (distinct == undefined){
			distinct = false;
		}
		
		if (dataset == 'Dataset'){
			window.alert('Please select dataset for row #' + num);
			valid = false;
			return;
		}

		if (function_name == 'Function'){
			window.alert('Please select function for row #' + num);
			valid = false;
			return;
		}

		if (comb == 'Property'){
			window.alert('Please select property for row #' + num);
			valid = false;
			return;
		}

		if (alias == ''){
			window.alert('Please select alias for row #' + num);
			valid = false;
			return;
		}

		var resource = comb.split('->')[0].split(':')[0];
		var object = comb.split('->')[0].split(':')[1];
		var property = null;

		var regExp = /\(([^)]+)\)/;
		var matches = regExp.exec(comb);
		var pure_property = comb.split('->')[1].split('(')[0];
		var type = matches[1];
		if (!(["resource", "object", "neo4j_id"].includes(pure_property))){
			property = pure_property + "_" + type;
		}
		else{
			property = pure_property;
		}

		data[num] = {
						'dataset' : dataset, 
						'function' : function_name, 
						'distinct' : distinct, 
						'resource' : resource, 
						'object' : object, 
						'property' : property,
						'alias' : alias
					}

	});

	if (!valid){
		return;
	}

	var report_name = prompt("Name your report");

	var query = statisticalFunctionQuery(data);

	var report_query = statisticalReportQuery(report_name, query);

	$.getJSON(
		'/writeOnlyQuery',
		{arg: JSON.stringify({"query" : report_query})},
		function (response){
			var message = response.message;
			console.log(message);
		}
	)

	/*$.getJSON(
		'/getValue',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			var labels = [],
				data = [];

			result.forEach(each => {
				labels.push(each[0]);
				data.push(each[1]);
			})

			var ctx = document.getElementById("myChart");
			var myChart = new Chart(ctx, {
				type: chartType,
				data: {
					labels: labels,
					datasets: [{
						label: 'Result',
						data: data,
						backgroundColor: 'white',
						borderColor: 'red',
						borderWidth: 1
					}]
				},
				options: {
					scales: {
						yAxes: [{
							ticks: {
								beginAtZero:false
							}
						}]
					}
				}
			});

			$("#chart-trigger-btn").click();



		}
	)*/

	$("#create-statistical-report-close").click();

})

$("#create-statistical-report-close").on('click', function () {
	var default_code = 	"<tr id='addr1'>" + 
							"<td>1</td>" + 
							"<td>" + 
								"<div class='btn-group' style='width : 100%'>" + 
									"<button type='button' class='btn btn-block btn-secondary create-statistical-report-dataset-btn' data-toggle='dropdown' onclick='datasetBtnHandler(this);'>Dataset</button>" + 
									"<ul class='dropdown-menu create-statistical-report-dataset' role='menu'></ul>" + 									
								"</div>" + 
							"</td>" + 
							"<td>" + 
								"<div class='btn-group' style='width : 100%'>" + 
									"<button type='button' class='btn btn-block btn-secondary create-statistical-report-function-btn' data-toggle='dropdown'>Function</button>" + 
									"<ul class='dropdown-menu create-statistical-report-function' role='menu'>" + 
										"<li onclick='functionLiClickHandler(this);'><a href='#'>COUNT</a></li>" + 
										"<li onclick='functionLiClickHandler(this);'><a href='#'>MAX</a></li>" + 
										"<li onclick='functionLiClickHandler(this);'><a href='#'>MIN</a></li>" + 
										"<li onclick='functionLiClickHandler(this);'><a href='#'>AVG</a></li>" + 
										"<li onclick='functionLiClickHandler(this);'><a href='#'>SUM</a></li>" + 
										"<li onclick='functionLiClickHandler(this);'><a href='#'>STDEV</a></li>" + 
									"</ul>" + 
								"</div>" + 
							"</td>" + 
							"<td style='text-align:center;'></td>" + 
							"<td>" + 
								"<div class='btn-group' style='width : 100%'>" + 
									"<button type='button' class='btn btn-block btn-secondary create-statistical-report-property-btn' data-toggle='dropdown' onclick='propertyBtnHandler(this);'>Property</button>" + 
									"<ul class='dropdown-menu create-statistical-report-property' role='menu'></ul>" + 
								"</div>" + 
							"</td>" + 
							"<td>" + 
								"<input type='text' name='alias' class='form-control create-statistical-report-alias'/>" + 
							"</td>" + 
						"</tr>";

	$("#create-statistical-report").find(".create-statistical-report-chart-type-btn").first().text("Chart Type");
	$("#create-statistical-report-table").find("tbody").first().html(default_code);
})

$("#create-statistical-report .close").click(function(){
	$("#create-statistical-report-close").click();
})

$("#chart-close").on('click', function () {
	$("#chart").find('.modal-body').first().html("<canvas id='myChart' width='800' height='800'></canvas>");
})

$("#chart .close").on('click', function () {
	$("#chart-close").click();
})