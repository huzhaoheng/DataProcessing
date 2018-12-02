$("#submitBtn").click(function () {
	console.log('here');
	var data = $("#Login").serializeArray();
	console.log(data);
	return;
});