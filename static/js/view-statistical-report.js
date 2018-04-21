/*var report_and_query = null;*/
var reports_info = null


$( "#view-statistical-report").on('shown.bs.modal', function(){
	var query = getStatisticalReportListQuery();
	$.getJSON(
		'/getStatisticalReportList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			reports_info = response.elements;
		}
	)
})


$("#view-statistical-report-submit").on('click', function(){
	var chartType = $("#view-statistical-report").find(".view-statistical-report-chart-type-btn").first().text();
	var report_name = $("#view-statistical-report").find(".view-statistical-report-select-report-btn").first().text();
	if (chartType == 'Chart Type'){
		window.alert('Please selecte chart type');
		return;
	}
	if (report_name == 'Report Name'){
		window.alert('Please selecte report');
		return;	
	}

	/*var query = report_and_query[report_name];*/
	console.log(reports_info);
	var data_selection_queries = reports_info[report_name][0], 
		functions = reports_info[report_name][1], 
		names = reports_info[report_name][2],
		values = reports_info[report_name][3];

	$.getJSON(
		'/getStatisticalReportResult',
		{arg: JSON.stringify({"queries" : data_selection_queries, "functions" : functions, "names" : names, "values" : values})},
		function (response){
			var result = response.elements;
			console.log(result);
			displayStatisticalReportInChart(result, chartType)
			displayStatisticalReportInTable(result)
			$("#view-statistical-report-close").click();
			$("#chart-trigger-btn").click();
		}
	)	
})

function displayStatisticalReportInChart(result, chartType){
	var labels = [],
		data = [];

	for (key in result){
		labels.push(key);
		data.push(result[key])
	}
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
}

function displayStatisticalReportInTable(result) {
	curr_num = $("#view-statistical-report-table").find('tbody').first().find('tr').length;
	var code = "";


	for (key in result){
		curr_num += 1;
		var alias = key;
			value = result[key];
		code += "<tr id='view-statistical-report-addr" + curr_num + "'>" + 
					"<td style='text-align: center; vertical-align: middle;'>" + curr_num + "</td>" +
					"<td style='text-align: center; vertical-align: middle;'>" + alias + "</td>" +
					"<td style='text-align: center; vertical-align: middle;'>" + value + "</td>" + 
				"</tr>";
	}

	$("#view-statistical-report-table").find('tbody').first().html(code);
}

$("view-statistical-report .close").on('click', function(){
	$("#view-statistical-report-close").click();
})

$("#view-statistical-report-close").on('click', function() {
	$("#view-statistical-report").find(".view-statistical-report-chart-type-btn").first().text("Chart Type");
	$("#view-statistical-report").find(".view-statistical-report-select-report-btn").first().text("Report Name");
	$("#view-statistical-report").find(".view-statistical-report-select-report").first().empty();
})



$("#chart-close").on('click', function () {
	$("#view-statistical-report").find(".view-statistical-report-chart-type-btn").first().text("Chart Type");
	var init_code = "<table class='table table-bordered table-hover' id='view-statistical-report-table'>" + 
						"<thead>" + 
							"<tr>" + 
								"<th class='text-center'>" + 
									"#" + 
								"</th>" + 
								"<th class='text-center'>" + 
									"Alias" + 
								"</th>" + 
								"<th class='text-center'>" + 
									"Value" + 
								"</th>" + 
							"</tr>" + 
						"</thead>" + 
						"<tbody></tbody>" + 
					"</table>" + 
					"<canvas id='myChart' width='800' height='800'></canvas>";


	$("#chart").find('.modal-body').first().html(init_code);
})

$("#chart .close").on('click', function () {
	$("#chart-close").click();
})

function selectReportNameBtnHandler(ele){
	var names = Object.keys(reports_info);
	var code = "";
	names.forEach(name => {
		code += "<li onclick='selectReportNameLiClickHandler(this);'><a href='#'>" + name + "</a></li>";
	})
	$("#view-statistical-report").find(".view-statistical-report-select-report").first().html(code);
}

function selectReportNameLiClickHandler(ele){
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);
	return;
}

function chartTypeLiClickHandler(ele) {
	var selected = $(ele).find('a')[0].innerText;
	$(ele).parent().prev().text(selected);
	return;
}