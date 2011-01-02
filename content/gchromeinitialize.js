
//This file only run in Google Chrome
//Gets some necessary data from background page, adds listeners,
//requests rest of scripts to be run

//sending an initialize request will make background page send all relevant data
//in response, and inject necessary scripts
chrome.extension.sendRequest({type: "initialize"}, function(response) {
	
	GM_localStorage = response.localStorage;
	GM_files = response.files;
	
	});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	
	if(request.type === undefined) return;

	switch(request.type.toLowerCase()) {
		
		case "setvalue":
			var name = request.name, jsonValue = request.jsonValue;
			GM_localStorage[name] = jsonValue;
			break;
			
		case "ping":
			sendResponse({time: (new Date()).getTime()});
			break;
			
		default:
			GM_log("Unknown request to content: " + request.type);
			break;
		
		}
	
	});
	
/*chrome.extension.sendRequest({type: "localstorage"}, function(response) {
	
	GM_localStorage = response;
	var str = "";
	for(var i in response) str += i + ": " + response[i];
	alert(str);
	
	});*/
