
/*
This file only runs in Google Chrome.
*/

/*
This singleton holds all of our GM_* API functions.
In order to expose this API to the world (stick functions onto the global object),
you must call the expose method.
*/
var GM_API = new function() {

	/*
	The object which globalMethods will be added to when this.expose is called.
	*/
	this.global = (function(){return this;}).call();

	/*
	Methods to expose.
	*/
	this.globalMethods = [
		"log",
		"getValue",
		"setValue",
		"getFile",
		"addStyle",
		"xmlhttpRequest",
		"time",
		"timeEnd"
		];

	/*
	A string to prefix globals with.
	*/
	this.prefix = "GM_";
	
	/*
	For each method listed in this.globalMethods, bind it to this.global
	with the name this.prefix + method_name.
	*/
	this.expose = function() {
		var that = this;
		for(var i=0, len=this.globalMethods.length; i<len; i++) {
			var globalMethod = this.globalMethods[i];
			this.global[this.prefix + globalMethod] = (function(name) {
				return function() {
					return that[name].apply(that, arguments);
					}
				})(globalMethod);
			}
		}

	/*
	If some method points to this, that indicates that it is unsupported.
	*/
	this.unsupported = function(){};

	/*
	Messages logged by this.log are prefixed with this string.
	*/
	this.logPrefix = "IGN++: ";

	/*
	Log some message to the error console if logMessages pref is true.
	If force is true, the message will always be logged, ignoring the logMessages pref.
	*/
	this.log = function(msg, force) {
		if(force || this.getValue("logMessages", false)) {
			console.log(this.logPrefix + msg);
			}
		}

	/*
	An object which holds preference values keyed by preference names.
	The client is responsible for setting it up.
	get/setValue uses this object.
	*/
	this.localStorage = {};

	/*
	Returns the value of the preference with the given name.
	If the preference has not been set, getValue returns def.
	*/
	this.getValue = function(name, def) {
		var jsonValue = this.localStorage[name];
		if(typeof(jsonValue)!="undefined") {
			try {
				 return JSON.parse(jsonValue);
				}
			catch(e) {
				this.log("GM_getValue - Error parsing value " + name + ", returning default.\n" + e);
				}
			}
		return def;
		}
	
	/*
	Set the value of the preference of the given name to the given value.
	Returns value.
	*/
	this.setValue = function(name, value) {
		var jsonValue = JSON.stringify(value);
		//set value of our copy
		this.localStorage[name] = jsonValue;
		/*set value of background localStorage, which should then alert other pages under its control
		that the setting has been changed, and they will change their copies*/
		chrome.extension.sendRequest({type: "setvalue", name: name, jsonValue: jsonValue});
		return value;
		}

	//timing functions that aren't implemented yet
	this.time = this.unsupported;
	this.timeEnd = this.unsupported;

	/*
	Given a file's path, return the name of the file.
	*/
	this.getFileName = function(path) {
		return path.match(/\/([^\/]*)\..*$/)[1];
		}
	
	/*
	An object that holds file contents keyed by file names (sans extension).
	The client is responsible for setting it up.
	*/
	this.files = {};
	
	/*
	Given a file path, return the file's contents.
	If the file does not exist, returns an empty string.
	Does not actually read the file, only a copy.
	*/
	this.getFile = function(path) {
		var file = this.files[this.getFileName(path)];
		return typeof file == "string" ? file : "";
		}

	/*
	Adds the given CSS to the page as a style.
	Asynchronous.
	*/
	this.addStyle = function(css) {
		chrome.extension.sendRequest({type: "addstyle", css: css});
		}


	/*
	An XHRDockHag is responsible for communicating with the background page
	to make a potentially cross-domain XMLHTTPRequest.
	this.xmlhttpRequest just wraps around this.
	*/
	this.XHRDockHag = function(details) {

		/*
		The details of the request, same as your standard GM_XHR.
		*/
		this.details = details;
		
		/*
		The port used to communicate with the background page.
		*/
		this.port = null;
		
		}
		
	this.XHRDockHag.prototype = {
		
		/*
		Talk with the background page to start this XHR.
		*/
		startRequest: function() {
			this.port = chrome.extension.connect({name: "xmlhttprequest"});
			//now the background page has a corresponding dock hag with a requester
			
			var that = this;
			//call this.onMessage whenever the XHR's corresponding events happen
			this.port.onMessage.addListener(function(msg) { that.onMessage(msg); });
			
			this.port.postMessage({details: this.copyDetailsSafely()});
			//now requester.contentStartRequest has been called and the XHR has begun
			},
			
		/*
		Returns a copy of this.details where all functions are converted to true.
		This is important for the event handlers (onload, etc).
		The background page can then tell from these true values about which events
		it needs to alert us about.
		JSON doesn't allow functions, so we can't send them to the background directly.
		*/
		copyDetailsSafely: function() {
			var copy = {};
			for(var i in this.details) {
				var detail = this.details[i];
				copy[i] = typeof detail == "function" ? true : detail;
				}
			return copy;
			},
			
		/*
		This is called when the XHR's events happen.
		msg.event will be the name of an event handler (onload, onerror, etc).
		msg.details is what should be passed to the event handler, contains details
		about the request's current state.
		*/
		onMessage: function(msg) {
			var handler = this.details[msg.event];
			if(typeof handler == "function") {
				handler(msg.details);
				}
			},
			
		/*
		Abort this request.
		Only works if the request has been started.
		*/
		abort: function() {
			if(this.port) this.port.disconnect();
			/*which will trigger the corresponding dock hag's disconnect listener,
			which will call gynecologist.abort*/
			}
		
		}
		
	/*
	Starts an XMLHTTPRequest with the given details (see Greasemonkey's API).
	Returns an object with a single method: abort.
	This method can be called to abort the request.
	*/
	this.xmlhttpRequest = function(details) {
		//must message background page to be able to do cross-domain requests
		var aDockHag = new this.XHRDockHag(details);
		aDockHag.startRequest();
		return {abort: function(){ aDockHag.abort() }};
		}

	
	}
