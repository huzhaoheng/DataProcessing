var report_and_query = null;


$( "#view-statistical-report").on('shown.bs.modal', function(){
	var query = getStatisticalReportListQuery();
	$.getJSON(
		'/getStatisticalReportList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			report_and_query = response.elements;
		}
	)
})


$("#view-statistical-report-submit").on('click', function(){
	var chartType = $("#view-statistical-report").find(".view-statistical-report-chart-type-btn").first().text();
	var report_name = $("#view-statistical-report").find(".view-statistical-report-select-report-btn").first().text();
	var query = report_and_query[report_name];
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

			$("#view-statistical-report-close").click();
			$("#chart-trigger-btn").click();
		}
	)	
})

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
	$("#chart").find('.modal-body').first().html("<canvas id='myChart' width='800' height='800'></canvas>");
})

$("#chart .close").on('click', function () {
	$("#chart-close").click();
})

function selectReportNameBtnHandler(ele){
	var names = Object.keys(report_and_query);
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