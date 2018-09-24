$( document ).ready(function() {
	$("#queryName").text(window.query_name);
	if (window.query_comment != null){
		$("#queryComment").text(window.query_comment);	
	}
});

$("#submitComment").click(function() {
	var comment = $("#queryComment").val();
	$.getJSON(
		'/setNodeProperties',
		{arg: JSON.stringify({"id" : window.query_id, "key" : "comment", "value" : comment, "type" : "string"})},
		function (response){
			var result = response.elements;
			console.log(result);
			location.reload();
		}
	)	
})