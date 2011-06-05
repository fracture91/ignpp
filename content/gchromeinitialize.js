
/*
This file only runs in Google Chrome.
Gets some necessary data from background page, adds listeners,
requests rest of scripts to be run.
*/

GM_API.expose();

/*
Sending an initialize request will make background page send all relevant data
in response, and inject necessary scripts.
*/
chrome.extension.sendRequest({type: "initialize"}, function(response) {
	
	GM_API.localStorage = response.localStorage;
	GM_API.files = response.files;
	
	});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	
	if(request.type === undefined) return;

	switch(request.type.toLowerCase()) {
		
		case "setvalue":
			//A setting has been changed elsewhere, so we should change our local copy
			var name = request.name, jsonValue = request.jsonValue;
			GM_API.localStorage[name] = jsonValue;
			break;
			
		case "registercolors":
			//should be handled in gchromecolors.js
			break;
			
		case "unregistercolors":
			//ditto
			break;
			
		case "ping":
			sendResponse({time: (new Date()).getTime()});
			break;
			
		default:
			GM_log("Unknown request to content: " + request.type);
			break;
		
		}
	
	});
