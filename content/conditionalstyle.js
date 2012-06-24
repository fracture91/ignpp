
var ConditionalStyle = new function() {
	vlog("Initializing styles");
	var style = [];
	
	// if you need to add some style to the page that needs some info that can
	// only be found after the page loads, push it into style

	if(style.length > 0) {
		GM_addStyle(style.join(""));
	}
	
	vlog("Styles initialized");
	}
