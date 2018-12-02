function submitForm() {
	var data = $("#Login").serializeArray();
	console.log(data);
	result = {}
	data.forEach(function (each) {
		var key = each['name'];
		var value = each['value'];
		result[key] = value;
	});
	console.log(result);
	return result;
}