
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
		"idle",
		"addStyle",
		"xmlhttpRequest",
		"time",
		"timeEnd",
		"showOptions"
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
	The date when the browser was last active (not idle).
	*/
	this.lastActivity = new Date();
	
	/*
	True if active, turns false once non-active state is received.
	*/
	this.currentlyActive = true;
	
	/*
	Updates this.lastActivity according to the new idle state provided.
	Client is responsible for calling this when idle state changes.
	*/
	this.onIdleStateUpdate = function(newState) {
		if(newState == "active") {
			//the user could have just been active or was active 14 seconds ago - assume just active
			this.currentlyActive = true;
			}
		else {
			/*
			minimum queryState threshold is 15 seconds, so we know the last time
			the user was possibly active was 15 seconds ago.
			*/
			this.currentlyActive = false;
			this.lastActivity = new Date(new Date() - 15000);
			}
		}
	
	/*
	Given a threshold in milliseconds, return true if the browser has been idle for that long.
	On Chrome, only thresholds above 15000 are accurate (within about 3 seconds).
	*/
	this.idle = function(threshold) {
		if(this.currentlyActive) return false;
		return new Date() - this.lastActivity > threshold;
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
		
	/*
	Open the options tab, or focus if it already exists.
	*/
	this.showOptions = function() {
		chrome.extension.sendRequest({type: "showOptions"});
		}
	
	/*
	Given a string that points to some method, return an array where the first element points
	to the penultimate object in that string, and the second element is a string naming the last object.
	For example, "view.model.rules.init" would give you [window.view.model.rules, "init"].
	*/
	this.walkName = function(name) {
		var chain = name.split(".");
		var root = window;
		for(var i=0, len=chain.length-1; i<len; i++) {
			root = root[chain[i]];
			}
		/*
		At this point, root points at the object at the second last point in the chain,
		and i=chain.length-1, so we can obtain the method from here.
		In the above example, root would point to rules and chain[i] is "init".
		*/
		return [root, chain[i]];
		}
	
	/*
	Given a string that points to some method (e.g. "view.model.rules.init"),
	override that method so that it uses remoteCall instead.
	*/
	this.remoteOverride = function(name) {
		var walk = this.walkName(name);
		walk[0][walk[1]] = this.remoteHelper(name);
		}
		
	/*
	Given a name, return a function that, when called, calls remoteCall with that name
	along with any additional arguments.
	*/
	this.remoteHelper = function(name) {
		var that = this;
		return function() {
			var args = Array.prototype.slice.call(arguments);
			args.unshift(name);
			return that.remoteCall.apply(that, args);
			}
		}
	
	this.remoteCallFuncId = "__REMOTECALLFUNCTIONARGUMENT__";
	
	/*
	This function will perform a remote call for some method indicated by name,
	and pass along any additional arguments it gets.
	That is, it will call the function of the given name on the background page.
	If any arguments are functions, they will be called on _this_ page.
	*/
	this.remoteCall = function(name/*, other arguments to be passed through...*/) {
		var args = Array.prototype.slice.call(arguments, 1);
		
		/*
		The background page will call callbacks by responding with their position
		in the args array and arguments to be passed to the callback.
		*/
		var callback = function(response){
			if(typeof args[response.position] == "function") {
				args[response.position].apply(window, response.arguments);
				}
			}
			
		/*
		Since functions get JSON'd to null, we need to set those arguments to something else
		so the background page can identify them as functions to call back.
		*/
		var remoteArgs = args.slice();
		for(var i=0, len=remoteArgs.length; i<len; i++) {
			if(typeof remoteArgs[i] == "function") {
				remoteArgs[i] = this.remoteCallFuncId;
				}
			}
		
		chrome.extension.sendRequest({type:"remoteCall", name: name, arguments: remoteArgs}, callback);
		}

	
	}
