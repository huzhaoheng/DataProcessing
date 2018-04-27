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
	hoverTips : function (repository, parameter_id){
		var self = $(this);
		/*var repository = self.attr('id').split('-').slice(0, -1).join('-');
		var parameter_id = self.attr('id').split('-').slice(-1)[0];*/
		var repository_parameters = window.parameters[repository][parameter_id];
		var content = "";
		for (key in repository_parameters){
			var value = repository_parameters[key];
			content += key + " : " + value + "<br/>";
		}

		var htmlDom = $("<div class='tooltips'>")
				.addClass("yellow")
				.html("<p class='content'></p>"
						+ "<p class='triangle-front'></p>"
						+ "<p class='triangle-back'></p>");
		htmlDom.find("p.content").html( content );
			
		self.on("mouseover",function(){
			$("body").append( htmlDom );
			var left = self.offset().left - htmlDom.outerWidth()/2 + self.outerWidth()/2;
			var top = self.offset().top + self.height() +  parseInt(htmlDom.find(".triangle-front").css("border-width"));
			console.log(left, top);
			//$('body').append("<h3 style='z-index='9999>Fuck This</h3>")
			htmlDom.css({"left":left,"top":top - 10,"display":"block", 'z-index': 9999});
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