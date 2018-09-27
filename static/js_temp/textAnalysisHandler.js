function loadTextFunctionList() {
	$("#textFunctionsList").kendoDropDownList({
		dataSource: ['Concepts', 'Entities', 'Hashtags', 'Sentiment']
	});
	var textFunctionsList = $("#textFunctionsList").data("kendoDropDownList");
	textFunctionsList.trigger("change");
}

function runTextFunction() {
	var textFunctionNameList = $("#textFunctionsList").data("kendoDropDownList");
	var selectedIndex = textFunctionNameList.select();
	var textFunctionName = textFunctionNameList.dataSource.options.data[selectedIndex];

	var spreadsheet = $("#spreadsheet").data("kendoSpreadsheet");
	var sheet = spreadsheet.activeSheet();
	var selection = sheet.selection();
	var values = selection.values();
	var dataToSend = ([].concat.apply([], values)).join(" ");

	$.getJSON(
		'/textAnalysis',
		{arg: JSON.stringify({"data" : dataToSend, "textFunctionName" : textFunctionName})},
		function (response){
			var result = response.elements;
			$("#text-function-result").empty();
			switch (textFunctionName) {
				case "Concepts":
					var concepts = result['concepts'];
					showConcepts(concepts);
					break;
				case "Entities":
					var entities = result['entities'];
					showEntities(entities)
					break;
				case "Hashtags":
					var hashtags = result['hashtags'];
					showHashtags(hashtags);
					break;
				case "Sentiment":
					var polarity = result['polarity'];
					var subjectivity = result['subjectivity'];
					var polarity_confidence = result['polarity_confidence'];
					var subjectivity_confidence = result['subjectivity_confidence'];
					showSentiment(polarity, subjectivity, polarity_confidence, subjectivity_confidence);
					break;
				default:
					return;
			}
		}
	)
}

function showConcepts(concepts) {
	$("<div id='concepts-grid'></div>").appendTo("#text-function-result");
	var grid_content = {
			'columns' : [{
				'field' : 'concept', 
				'title' : 'Concept'
			}, {
				'field' : 'score', 
				'title' : 'Score'
			}, {
				'field' : 'link',
				'title' : 'Link'
			}], 

			'dataSource' : {'data' : []}
		};

	$.each(concepts, function(link, detail) {
		grid_content['dataSource']['data'].push({
			'concept' : detail['surfaceForms'][0]['string'], 
			'score' : detail['surfaceForms'][0]['score'], 
			'link' : link
		});
	})

	$("#concepts-grid").kendoGrid(grid_content);
}

function showEntities(entities) {
	$("<div id='entities-tabstrip'></div>").appendTo("#text-function-result");
	$("<ul></ul>").appendTo("#entities-tabstrip");
	
	$.each(entities, function(entities_category, entities_list) {
		$("<li id='" + entities_category + "_tab'>" + entities_category + "</li>").appendTo("#entities-tabstrip > ul");
		$("<div id='" + entities_category + "_grid'></div>").appendTo("#entities-tabstrip");
		var grid_content = {'columns' : [{'field' : 'entity', 'title' : 'Entity'}], 'dataSource' : {'data' : []}};
		entities_list.forEach(function(entity) {
			grid_content['dataSource']['data'].push({'entity' : entity});
		});
		$("#" + entities_category + "_grid").kendoGrid(grid_content);
	});
	$("#entities-tabstrip").kendoTabStrip();

	return;
}

function showHashtags(hashtags) {
	$("<div id='hashtags-grid'></div>").appendTo("#text-function-result");
	var grid_content = {
			'columns' : [{
				'field' : 'hashtag', 
				'title' : 'Hashtag'
			}], 

			'dataSource' : {'data' : []}
		};

	$.each(hashtags, function(index, hashtag) {
		grid_content['dataSource']['data'].push({
			'hashtag' : hashtag
		});
	})

	$("#hashtags-grid").kendoGrid(grid_content);
}

function showSentiment(polarity, subjectivity, polarity_confidence, subjectivity_confidence) {
	$("<div id='semtiment-grid'></div>").appendTo("#text-function-result");
	var grid_content = {
			'columns' : [{
				'field' : 'polarity', 
				'title' : 'Polarity'
			}, {
				'field' : 'subjectivity', 
				'title' : 'Subjectivity'
			}, {
				'field' : 'polarity_confidence', 
				'title' : 'Polarity Confidence'
			}, {
				'field' : 'subjectivity_confidence', 
				'title' : 'Subjectivity Confidence'
			}], 

			'dataSource' : {'data' : []}
		};

	grid_content['dataSource']['data'].push({
		'polarity' : polarity,
		'subjectivity' : subjectivity,
		'polarity_confidence' : polarity_confidence,
		'subjectivity_confidence' : subjectivity_confidence
	});

	$("#semtiment-grid").kendoGrid(grid_content);
}