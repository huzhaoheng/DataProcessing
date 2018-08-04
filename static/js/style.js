var default_colors = {
	".panel-heading-custom" : '#343a40',
	".sidebar-btn" : '#343a40'
}

var highlight_colors = {
	".panel-heading-custom" : '#007bff',
	".sidebar-btn" : '#007bff'	
}

function highLight(id, highlight_class){
	for (class_selector in default_colors){
		$(class_selector).each(function () {
			$(this).css('background-color', default_colors[class_selector]);
		})
	}

	$(id).css('background-color', highlight_colors[highlight_class]);
	return;
}

function rgb2hex(rgb) {
	if (rgb.search("rgb") == -1 ) {
		return rgb;
	}
	else {
		rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
		function hex(x) {
			return ("0" + parseInt(x).toString(16)).slice(-2);
		}
		return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]); 
	}
}