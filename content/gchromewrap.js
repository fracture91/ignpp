
//This file only run in Google Chrome
//Defines GM_* functions

GM_unsupported = function(){};
 
GM_log = function(t){ 
	if(GM_getValue("logMessages", false)) console.log("IGN++: " + t);
	}

//copy of background page's localStorage, gotten by gchromeinitialize.js
//can use this to get settings synchronously
GM_localStorage = undefined;

GM_getValue = function(name, def) {
	
	var jsonValue = GM_localStorage[name];
	if(typeof(jsonValue)!="undefined") return JSON.parse(jsonValue);
	
	return def;
	
	}
	
GM_setValue = function(name, value) {

	var jsonValue = JSON.stringify(value);

	//set value of our copy
	GM_localStorage[name] = jsonValue;
	
	//set value of background localStorage, which will then alert other pages under its control
	//that the setting has been changed, and they will change their copies
	chrome.extension.sendRequest({type: "setvalue", name: name, jsonValue: jsonValue});
	
	return value;
	
	}

GM_time = GM_unsupported;
GM_timeEnd = GM_unsupported;

GM_files = undefined;
GM_getFile = function(path) {
	
	//maybe an xhr from the background page must be used?
	//iframes?
	//construct all possible DOM elements beforehand in background page?
	var name = path.match(/\/([^\/]*)\..*$/)[1];
	return GM_files[name];
	
	}

GM_addStyle = function(css) {
	
	chrome.extension.sendRequest({type: "addstyle", css: css});
	
	}

function XHRDockHag(details) {
	
	this.details = details;
	this.port = chrome.extension.connect({name: "xmlhttprequest"});
	//now the background page has a dock hag with a requester
	
	//since messages must be encoded in JSON, functions won't go through
	//make a copy of details, but set on[event]s to true or false
	this.detailsCopy = {};
	for(var i in this.details) {
		switch(i) {
			case "onload":
			case "onerror":
			case "onreadystatechange":
				this.detailsCopy[i] = !!this.details[i];
				break;
			default:
				this.detailsCopy[i] = this.details[i];
				break;
			}
		}
	
	
	this.port.postMessage({details: this.detailsCopy});
	//now requester.contentStartRequest has been called and the XHR has begun
	
	var that = this;
	
	//this will be called whenever the XHR's corresponding events happen
	this.port.onMessage.addListener(function(msg) {
		
		if(that.details[msg.event]) {
			
			that.details[msg.event](msg.details);
			
			}
			
		//vlog("xhr event: " + msg.event + ", " + inspect(msg.details));
		
		});
		
	this.abort = function() {
		this.port.disconnect();
		//which will trigger the corresponding dock hag's disconnect listener,
		//which will call gynecologist.abort
		}
	
	}
	
GM_xmlhttpRequest = function(details) {
	
	//must message background page to be able to do cross-domain requests
	//if that's too hard, could settle with not being able to do that since
	//i don't think i have any cross-domain requests
	
	return new XHRDockHag(details);
	
	
	}
