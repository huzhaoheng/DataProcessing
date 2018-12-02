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
	verifyUser(result);
	return result;
}

function verifyUser(result) {
	var username = result['username'];
	var email = result['email'];
	$.getJSON(
		'/verifyUser',
		{arg: JSON.stringify({"username" : username, "email" : email})},
		function (response){
			var result = response.elements;
			var valid = result['valid'];
			console.log(valid);
			if (valid == true) {
				console.log('loginSuccess');
				var url = result['url']
				console.log(url);
				window.location.href = url;
				/*$.getJSON(
					'/loginSuccess',
					{arg: JSON.stringify({"username" : username})},
					function (response) {
						return;
					}
				)*/
			}
			else {
				$('#error-message').show();
				return;
			}
		}
	)
}