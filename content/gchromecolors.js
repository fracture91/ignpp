
/*
This file should be injected as early as possible.
It will add usercolors to the page ASAP and listen for any usercolor changes.
*/

var usercolorId = "ignpp-usercolors";

function registerColors(css) {
	if(!css) return;
	var style = document.createElement("style");
	style.type = "text/css";
	style.id = usercolorId;
	style.textContent = css;
	document.documentElement.appendChild(style);
	}
	
function unregisterColors() {
	var style = document.getElementById(usercolorId);
	if(!style) return;
	style.parentNode.removeChild(style);
	}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	
	if(request.type === undefined) return;

	switch(request.type.toLowerCase()) {
		case "registercolors":
			registerColors(request.value);
			break;
		case "unregistercolors":
			unregisterColors();
			break;
		}
	
	});
	
//this should just send back a registercolors request if applyUsercolors pref is true
chrome.extension.sendRequest({type: "usercolors"});
