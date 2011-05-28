
var Condstyle = new function() {

	vlog("Initializing styles");

	var minHeightFix = "";
	if (I.url.pageType == "board") {
	
		minHeightFix +=
		'#boards_board_list_header {' +
		'height: auto !important;' +
		'min-height: ' + window.getComputedStyle(document.getElementById("boards_board_list_header"),null).getPropertyValue("height") + ' !important;' +
		'}' +
		'#boards_board_list_footer {' +
		'height: auto !important;' +
		'min-height: ' + window.getComputedStyle(document.getElementById("boards_board_list_footer"),null).getPropertyValue("height") + ' !important;' +
		'}';
		
		}
	
	else if (I.url.pageType == "topic") {
	
		if(I.layout.fresh) {
			minHeightFix +=
			'.boards_thread_links {' +
			'height: auto !important;' +
			'min-height: ' + window.getComputedStyle(document.getElementsByClassName("boards_thread_links")[0],null).getPropertyValue("height") + ' !important;' +
			'}'
			}
			
		minHeightFix +=
		'#boards_thread_header_links {' +
		'height: auto !important;' +
		'min-height: ' + window.getComputedStyle(document.getElementById("boards_thread_header_links"),null).getPropertyValue("height") + ' !important;' +
		'}';
		
		}
	
	
	var floatingPos = 
	'body > .panel {' +
	'left: ' + (I.url.pageType=="topic" ? GM_getValue("floatXT", 20) : GM_getValue("floatX", 20)) + 'px;' +
	'bottom: ' + (I.url.pageType=="topic" ? GM_getValue("floatYT", 10) : GM_getValue("floatY", 10)) + 'px;' +
	'}'
	
	//the following defaults to Classic's style if not included
	
	var freshFont =
	"font-family: Arial, Helvetica, sans-serif;" +
	"font-size: 13px;" +
	"letter-spacing: 0.25px;";
	
	var whiteBackground = "background-color: #FFFFFF;";
	var greyBackground = "background-color: #D9DAE0;";
	var wysiwygBackground = (I.layout.name=="grey" ? greyBackground : I.layout.name=="white" ? whiteBackground : "");
	
	var wysiwygStyle = "";
	if(I.layout.fresh)
		wysiwygStyle = 
		'.panel:not(.pm) .wysiwyg, .panel:not(.pm) .preview {' +
		freshFont +
		wysiwygBackground +
		'}' +
		'.panel:not(.pm) .previewButtons {' +
		wysiwygBackground +
		'}';
	
	
	var style =
		wysiwygStyle +
		floatingPos +
		minHeightFix;

	GM_addStyle(style);
	
	//for chrome, must also add usercolors

	vlog("Styles initialized");

	}
