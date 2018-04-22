function getRepositoryParameters(){
	var query = getRepositoryParametersQuery();
	$.getJSON(
		'/getRepositoryParameters',
		{arg: JSON.stringify({"query" : query})},
		function (response){
			var result = response.elements;
			window.parameters = result;
			console.log(result);
		}
	)
}

$.fn.extend({
	hoverTips : function (){
		var self = $(this);
		var repository = self.text();
		var repository_parameters = window.parameters[repository];
		console.log(repository_parameters);
		var content = "";
		for (key in repository_parameters){
			var value = repository_parameters[key];
			content += key + " : " + value + "<br/>";
		}

		var htmlDom = $("<div class='tooltips'>")
				.addClass("yellow")
				/*.html("<p class='content'></p>"
						+ "<p class='triangle-front'></p>"
						+ "<p class='triangle-back'></p>");*/
				.html("<p class='content'></p>"
						+ "<p class='triangle-front'></p>"
						+ "<p class='triangle-back'></p>");
		htmlDom.find("p.content").html( content );
			
		self.on("mouseover",function(){
			$("body").append( htmlDom );
			var left = self.offset().left - htmlDom.outerWidth()/2 + self.outerWidth()/2;
			var top = self.offset().top + self.height() +  parseInt(htmlDom.find(".triangle-front").css("border-width"));
			htmlDom.css({"left":left,"top":top - 10,"display":"block"});
			htmlDom.stop().animate({ "top" : top ,"opacity" : 1},300);
		});
		self.on("mouseout",function(){
			var top = parseInt(htmlDom.css("top"));
			htmlDom.stop().animate({ "top" : top - 10 ,"opacity" : 0},300,function(){
				htmlDom.remove();
			});
		});
	}
});