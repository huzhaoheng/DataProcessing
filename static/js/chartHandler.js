function loadChartTypeList() {
	$("#chartTypeList").kendoDropDownList({
		dataSource: ["column", "bar", "pie", "line"]
	});
	var chartTypeList = $("#chartTypeList").data("kendoDropDownList");
	chartTypeList.trigger("change");
}

function drawChart() {
	var chartTypeList = $("#chartTypeList").data("kendoDropDownList");
	var selectedIndex = chartTypeList.select();
	var chartType = chartTypeList.dataSource.options.data[selectedIndex];

	var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
	var sheet = spreadsheet.activeSheet();

	var selection = sheet.selection();
	//var range = sheet.range("A2:A100");
	var values = selection.values();
	var result = [].concat.apply([], [].concat.apply([], values));
	var categories = window.chartCategories;
	var seriesName = window.chartSeriesName;

	if (['column', 'bar', 'line'].includes(chartType)){
		$("#chart").kendoChart({
			title: {
				text: "Chart"
			},

			series: [{
				type: chartType,
				name: seriesName,
				data: result
			}],

			categoryAxis: {
				categories: categories
			}
		});
	}
	else {
		if (categories.length == 0){
			var data = [];
			for (var i = 0 ; i < result.length ; i ++) {
				var value = result[i];
				data.push({value : value});
			}
			$("#chart").kendoChart({
				title: {
					text: "Chart"
				},

				series: [{
					type: chartType,
					data: data
				}]
			});
		}
		else if (categories.length != result.length) {
			window.alert('Make sure the numbers of categories and values are the same!');
		}
		else{
			var data = [];
			for (var i = 0 ; i < categories.length ; i ++) {
				var category = categories[i];
				var value = result[i];
				data.push({category : category, value : value});
			}
			$("#chart").kendoChart({
				title: {
					text: "Chart"
				},

				series: [{
					type: chartType,
					data: data
				}]
			});
		}
		return;
	}
}

function saveChartSetting() {
	var chartSeriesName = $('#chartSeries').val();
	var chartCategories = $('#chartCategories').val().split(',').map(s => s.trim());
	window.chartSeriesName = chartSeriesName;
	window.chartCategories = chartCategories;
	return;
}

function downloadChart() {
	var fileType = $('#fileType').val();
	var chart = $("#chart").getKendoChart();
	switch(fileType) {
		case "PDF":
			var chart = $("#chart").getKendoChart();
            chart.exportPDF({ paperSize: "auto", margin: { left: "1cm", top: "1cm", right: "1cm", bottom: "1cm" } }).done(function(data) {
                kendo.saveAs({
                    dataURI: data,
                    fileName: "chart.pdf",
                });
            });
			break;

		case "Image":
			chart.exportImage().done(function(data) {
                kendo.saveAs({
                    dataURI: data,
                    fileName: "chart.png",
                });
            });
			break;

		case "SVG":
			chart.exportSVG().done(function(data) {
                kendo.saveAs({
                    dataURI: data,
                    fileName: "chart.svg",
                });
            });
			break;

		default:
			return;
	}
}