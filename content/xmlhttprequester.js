////from the Greasemonkey Compiler, updated to include features in newer GM versions
////also updated for usage in Google Chrome in background page
////my comments have 2x slashes for clarification, GM devs' have normal amount

////in Chrome, unsafeContentWin should be undefined
function vestitools_xmlhttpRequester(unsafeContentWin, chromeWindow, originUrl) {
	this.unsafeContentWin = unsafeContentWin;
	this.chromeWindow = chromeWindow;
	this.originUrl = originUrl;
	this.aborted = false;
}

// this function gets called by user scripts in content security scope to
// start a cross-domain xmlhttp request.
//
// details should look like:
// {method,url,onload,onerror,onreadystatechange,headers,data}
// headers should be in the form {name:value,name:value,etc}
// can't support mimetype because i think it's only used for forcing
// text/xml and we can't support that

////in Chrome, this is called from background when Port connection is started from content
vestitools_xmlhttpRequester.prototype.contentStartRequest = function(details) {
	// important to store this locally so that content cannot trick us up with
	// a fancy getter that checks the number of times it has been accessed,
	// returning a dangerous URL the time that we actually use it.
	var url = details.url;

	// make sure that we have an actual string so that we can't be fooled with
	// tricky toString() implementations.
	if (typeof url != "string") {
		throw new Error("Invalid url: url must be of type string");
	}

	////Only check the scheme in Firefox.  Dangerous for Chrome?  Maybe.
	////Might want to also use this for reading files in Chrome later on, anyway.
	////http://code.google.com/p/chromium/issues/detail?id=41024
	if(window.Components && window.Components.classes) {
	
		var ioService=Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
		var scheme = ioService.extractScheme(url);

		// This is important - without it, GM_xmlhttpRequest can be used to get
		// access to things like files and chrome. Careful.
		switch (scheme) {
			case "http":
			case "https":
			case "ftp":
				var req = new this.chromeWindow.XMLHttpRequest();
				this.chromeWindow.setTimeout(
					vestitools_gmCompiler.hitch(this, "chromeStartRequest", url, details, req), 0);
				break;
			default:
				throw new Error("Invalid url: " + url);
			}
		
		}
		
	////Chrome will just call chromeStartRequest directly
	else {
		var req = new this.chromeWindow.XMLHttpRequest();
		this.chromeStartRequest(url, details, req);
		}
	
	var that = this;
	
	return {
		abort: function() {
			that.aborted = true;
			req.abort();
		}
	};
	
}

/*
All supported XHR events.
setupRequestEvent is called for each one.
*/
vestitools_xmlhttpRequester.prototype.events =
	["onload", "onerror", "onreadystatechange"];

// this function is intended to be called in chrome's security context, so
// that it can access other domains without security warning
vestitools_xmlhttpRequester.prototype.chromeStartRequest=function(safeUrl, details, req) {

	this.events.forEach(function(e, i, a) {
		this.setupRequestEvent(this.unsafeContentWin, req, e, details);
		}, this);

	req.open(details.method, safeUrl);

	if (details.overrideMimeType) {
		req.overrideMimeType(details.overrideMimeType);
	}
	
	if (details.headers) {
		for (var prop in details.headers) {
			req.setRequestHeader(prop, details.headers[prop]);
		}
	}
	
	var body = details.data ? details.data : null;
	if (details.binary) {
		// xhr supports binary?
		if (!req.sendAsBinary) {
			var err = new Error("Unavailable feature: " +
				"This version of Firefox does not support sending binary data " +
				"(you should consider upgrading to version 3 or newer.)");
			//GM_logError(err);
			throw err;
		}
		req.sendAsBinary(body);
	} else {
		req.send(body);
	}
	
	if(this.aborted) {
		//abort has already been called, but it was called before the request was sent
		//abort the request now
		req.abort();
		}

}

// arranges for the specified 'event' on xmlhttprequest 'req' to call the
// method by the same name which is a property of 'details' in the content
// window's security context.
vestitools_xmlhttpRequester.prototype.setupRequestEvent =
function(unsafeContentWin, req, event, details) {

	if (details[event]) {
		req[event] = function() {
		
			var responseState = {
				// can't support responseXML because security won't
				// let the browser call properties on it
				responseText: req.responseText,
				readyState: req.readyState,
				responseHeaders: null,
				status: null,
				statusText: null,
				finalUrl: null
			};
			if (4 == req.readyState && 'onerror' != event) {
				responseState.responseHeaders = req.getAllResponseHeaders();
				responseState.status = req.status;
				responseState.statusText = req.statusText;
				////Chrome does not support this
				var finalURLSupported = req.channel && req.channel.URI && req.channel.URI.spec;
				responseState.finalUrl = finalURLSupported ? req.channel.URI.spec : null;
			}
		
			function callback(){
				details[event](responseState);
				}
		
			////if Firefox...
			if(window.XPCNativeWrapper) {
				// Pop back onto browser thread and call event handler.
				// Have to use nested function here instead of GM_hitch because
				// otherwise details[event].apply can point to window.setTimeout, which
				// can be abused to get increased priveledges.
				new XPCNativeWrapper(unsafeContentWin, "setTimeout()").setTimeout(callback, 0);
				}
			else {
				////Chrome just calls it directly
				callback();
				}
		} 
	}
}