$("#stats").click(function () {
	if (window.table.getSelected() == undefined){
		window.alert("Please select cells you want to add to plot");
		return;
	}
	var selected_coordinates = window.table.getSelected()[0];
	console.log(selected_coordinates);
	var top_left_cell_y = selected_coordinates[0];
	var top_left_cell_x = selected_coordinates[1];
	var	bottom_right_cell_y = selected_coordinates[2];
	var	bottom_right_cell_x = selected_coordinates[3];

	var data_type = window.table.getDataType(
							top_left_cell_y, 
							top_left_cell_x,
							bottom_right_cell_y,
							bottom_right_cell_x
						);
	
	if (data_type != 'numeric'){
		window.alert("Please select numeric data only");
		return;
	}

	$('#chart-modal').modal('show');

	var type = "bar";
	var values = [];
	var labels = [];
	var background_color = [];

	for (var y = top_left_cell_y; y <= bottom_right_cell_y; y ++) {
		for (var x = top_left_cell_x; x <= bottom_right_cell_x; x++) {
			var value = window.table.getDataAtCell(y, x);
			var label = "row: " + (y + 1).toString() + "\ncolumn: " + (x + 1).toString()
			values.push(value);
			labels.push(label);
			background_color.push("#3e95cd");
		}
	}

	var datasets = [{
		backgroundColor: background_color,
		data: values
	}];

	var options = {
		type: 'bar',
		data: {
			labels: labels,
			datasets: datasets
		},
		options: {
			legend: {display: false},
			scales: {
				yAxes: [{
					ticks: {
						reverse: false
					}
				}]
			}
		}
	}

	var ctx = document.querySelector('.chartJSContainer').getContext('2d');
	var myChart = new Chart(ctx, options);

	return;
})