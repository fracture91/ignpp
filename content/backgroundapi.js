
/*
This file only runs in Google Chrome in background.html
*/

/*
We need to override some functionality in GM_API for the background page.
setValue needs to maintain a copy of localStorage and alert managed tabs of changes.
addStyle needs to apply a style to a certain tab, rather than message background about it.
*/
(function(){

GM_API.localStorage = localStorage;

/*
A copy of localStorage which Background can send to tabs that request it.
*/
GM_API.localStorageCopy = {};
for(var i in localStorage)
	GM_API.localStorageCopy[i] = localStorage[i];

GM_API.oldSetValue = GM_API.setValue;
//tabManager should be set properly later on
GM_API.tabManager = null;

/*
Like the regular setValue, except this will also maintain this.localStorageCopy
and call this.tabManager.onSetValue.
*/
GM_API.setValue = function(name, value, sender) {
	var jsonValue = JSON.stringify(value);
	this.localStorage[name] = this.localStorageCopy[name] = jsonValue;
	if(this.tabManager) {
		this.tabManager.onSetValue(name, jsonValue, sender ? sender.tab : undefined);
		}
	return value;
	}

GM_API.oldAddStyle = GM_API.addStyle;

/*
Like the regular addStyle, except this requires a tab to add the style to.
*/
GM_API.addStyle = function(tab, css) {
	chrome.tabs.insertCSS(tab.id, {code: css});
	}
	
/*
If the Options tab is already open in the given tab's window, then focus it.
Otherwise, open the Options tab at tab.index + 1.
This behavior seems identical to the behavior of the Options link in the extensions management page,
which calls chrome.send('options', [extensionId])
*/
GM_API.showOptions = function(tab) {
	var windowId = tab ? tab.windowId : undefined;
	var index = tab ? tab.index + 1 : undefined;
	chrome.tabs.getAllInWindow(windowId, function(tabs){
		var url = chrome.extension.getURL("content/options/gchromeoptions.html");
		var exists = false;
		tabs.forEach(function(e,i,a){
			if(!exists) {
				if(e.url == url) {
					exists = true;
					chrome.tabs.update(e.id, {selected: true});
					}
				}
			});
		if(!exists) {
			chrome.tabs.create({windowId: windowId, url: url, index: index});
			}
		});
	}
	
	
GM_API.oldXHRDockHag = GM_API.XHRDockHag;

/*
Manages an xmlhttpRequester and its port, facilitating communication with the content
script that made a GM_xmlhttpRequest call.
*/
GM_API.XHRDockHag = function (port) {
	
	/*
	The port which made the xmlhttpRequest call.
	*/
	this.port = port;
	
	/*
	This dock hag's xmlhttpRequester, which handles all the actual network communication.
	*/
	this.requester = new vestitools_xmlhttpRequester(this.port, window, this.port.sender.tab.url);
	
	/*
	Object that contentStartRequest returns that lets us abort the request.
	*/
	this.gynecologist = null;
	
	var that = this;
	
	this.port.onMessage.addListener(function(msg) {
		//only one message is sent for this connection that has details
		that.gynecologist = that.requester.contentStartRequest(msg.details);
		});
		
	this.port.onDisconnect.addListener(function(msg) {
		if(that.gynecologist) that.gynecologist.abort();
		});
	
	}

GM_API.oldXmlhttpRequest = GM_API.xmlhttpRequest;
	
/*
The background version of xmlhttpRequest can take the standard details object or a Port.

If given a Port, the method assumes that this request is being made through that Port
and will communicate through it (wait for details message, send messages for xhr events).

If the argument isn't a Port, the method acts just like you would expect it to work
if you were calling it from a content script.
*/
GM_API.xmlhttpRequest = function(detailsOrPort) {
	var rv = {abort: this.unsupported};
	if(detailsOrPort instanceof chrome.Port) {
		var aDockHag = new this.XHRDockHag(detailsOrPort);
		rv.abort = function(){ aDockHag.port.disconnect() };
		}
	else {
		var xhr = new vestitools_xmlhttpRequester(null, window, window.location);
		var gynecologist = xhr.contentStartRequest(detailsOrPort);
		rv.abort = function(){ gynecologist.abort() };
		}
	return rv;
	}
	
GM_API.oldRemoteCall = GM_API.remoteCall;
GM_API.remoteCall = function(name, args, sendResponse) {
	
	//make sure callback arguments get remotely called
	for(var i=0, len=args.length; i<len; i++) {
		if(args[i] == this.remoteCallFuncId) {
			args[i] = (function(position) {
				return function() {
					sendResponse({position: position,
								arguments: Array.prototype.slice.call(arguments)});
					}
				})(i);
			}
		}
		
	var walk = this.walkName(name);
	walk[0][walk[1]].apply(walk[0], args);
	
	}
	

GM_API.expose();

})();
