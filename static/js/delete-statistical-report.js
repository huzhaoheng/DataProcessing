var reports_info = null

$( "#delete-statistical-report").on('shown.bs.modal', function(){
	var query = getStatisticalReportListQuery();
	$.getJSON(
		'/getStatisticalReportList',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			reports_info = response.elements;
		}
	)
})

function selectDeleteReportNameBtnHandler(ele){
	var names = Object.keys(reports_info);
	var code = "";
	names.forEach(name => {
		code += "<li onclick='selectReportNameLiClickHandler(this);'><a href='#'>" + name + "</a></li>";
	})
	$("#delete-statistical-report").find(".delete-statistical-report-select-report").first().html(code);
}


$("#delete-statistical-report-submit").on('click', function(){
	var report_name = $("#delete-statistical-report").find(".delete-statistical-report-select-report-btn").first().text();
	if (report_name == 'Report Name'){
		window.alert('Please selecte report');
		return;	
	}

	var query = deleteStatisticalReportQuery(report_name);

	$.getJSON(
		'/writeOnlyQuery',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.message;
			console.log(result);
			$("#delete-statistical-report-close").click();
		}
	)	
})


$("delete-statistical-report .close").on('click', function(){
	$("#delete-statistical-report-close").click();
})

$("#delete-statistical-report-close").on('click', function() {
	$("#delete-statistical-report").find(".delete-statistical-report-select-report-btn").first().text("Report Name");
	$("#delete-statistical-report").find(".delete-statistical-report-select-report").first().empty();
})