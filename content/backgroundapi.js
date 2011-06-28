
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
	this.requester = new vestitools_xmlhttpRequester(undefined, window, this.port.sender.tab.url);
	
	/*
	Object that contentStartRequest returns that lets us abort the request.
	*/
	this.gynecologist = null;
	
	var that = this;
	this.port.onMessage.addListener(function(msg) { that.onMessage(msg) });
	this.port.onDisconnect.addListener(function() { that.onDisconnect() });
	
	}
	
GM_API.XHRDockHag.prototype = {
	
	/*
	This should be called for each event that happens on this.requester that
	the content page wants to listen to.
	It should ALWAYS be called for the readystatechange event so this dock hag
	can be properly destroyed when the request is finished.
	*/
	onEvent: function(event, hasCallback, responseState) {
		if(this.port) {
			if(hasCallback) {
				this.port.postMessage({event: event, details: responseState});
				}
			if(event == "onreadystatechange") {
				if(responseState.readyState == 4) {
					var that = this;
					/*
					If the request is done, call abort to disconnect the port.
					It is behind a setTimeout to make sure all other handlers are called first.
					This abort call is very important, otherwise you get a huge memory leak.
					*/
					setTimeout(function() {
						that.abort();
						}, 0);
					}
				}
			}
		},
	
	/*
	Should be called whenever this.port receives a message.
	The message should have a details property that contains your standard GM_xmlhttpRequest object,
	except all desired handlers are set to true rather than actual functions.
	Gets details ready and calls this.requester.contentStartRequest.
	this.gynecologist is set to a usable state.
	*/
	onMessage: function(msg) {
		//only one message is sent for this connection that has details
	
		var that = this;
		/*
		Make it so that, for each handler that is true in msg.details (or always for onreadystatechange),
		the handler is changed to a function that calls this.onEvent.
		*/
		vestitools_xmlhttpRequester.prototype.events.forEach(function(e, i, a) {
			if(msg.details[e] || e == "onreadystatechange") {
				msg.details[e] = (function(event) {
					return function(responseState){
						that.onEvent(event, msg.details[event], responseState);
						}
					})(e);
				}
			});
		
		this.gynecologist = this.requester.contentStartRequest(msg.details);
		},
		
	/*
	Should be called when port disconnects.
	Aborts any request in progress.
	*/
	onDisconnect: function() {
		if(this.gynecologist) this.gynecologist.abort();
		},
		
	/*
	Disconnect from the port, which will abort the XHR.
	*/
	abort: function() {
		this.port.disconnect();
		//port's onDisconnect event is only called if other side disconnects
		this.onDisconnect();
		}
	
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
	var gynecologist = null;
	if(detailsOrPort instanceof chrome.Port) {
		gynecologist = new this.XHRDockHag(detailsOrPort);
		}
	else {
		gynecologist = (new vestitools_xmlhttpRequester(undefined, window, window.location))
						.contentStartRequest(detailsOrPort);
		}
	rv.abort = function(){ gynecologist.abort() };
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
