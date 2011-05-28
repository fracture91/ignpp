//REQUIRES
//vestitools_xmlhttpRequester()		[xmlhttprequester.js]

// vestitools_PrefManager singleton
Components.utils.import("resource://vestitools/prefman.js");
// vestitools_style singleton
Components.utils.import("resource://vestitools/style.js");
// vestitools_files singleton
Components.utils.import("resource://vestitools/files.js");


var vestitools_gmCompiler={

includes: 	[
			/^http:\/\/((beta)?boards|forums)\.ign\.com\/.*/
			],

excludes: 	[
			/http:\/\/((beta)?boards|forums)\/QuickPost\/.*/
			],

scriptPrefix: "chrome://vestitools/content/",
			
//list of scripts to inject into sandbox in order
scriptList: [
				"util.js", "info.js", "console.js", "parse.js", 
				"replies.js", "topics.js", "editors.js", "panels.js", "overlay.js", "message.js",
				"infopanels.js", "quickstats.js", "threadpreview.js", "autowul.js",
				"conditionalstyle.js", "integratedtools.js", "autorefresh.js", "kbonly.js"
			],
			
imageCache: [],

// getUrlContents adapted from Greasemonkey Compiler
// http://www.letitblog.com/code/python/greasemonkey.py.txt
// used under GPL permission
//
// most everything else below based heavily off of Greasemonkey
// http://greasemonkey.devjavu.com/
// used under GPL permission

//note: as of making this vesti tools extension GM was licensed under MIT/X11
//Is this code GPL?  MIT?  Who knows.
// http://www.fsf.org/licensing/licenses/gpl.html
// http://www.opensource.org/licenses/mit-license.php

getUrlContents: function(aUrl){
	var	ioService=Components.classes["@mozilla.org/network/io-service;1"]
		.getService(Components.interfaces.nsIIOService);
	var	scriptableStream=Components
		.classes["@mozilla.org/scriptableinputstream;1"]
		.getService(Components.interfaces.nsIScriptableInputStream);
	var unicodeConverter=Components
		.classes["@mozilla.org/intl/scriptableunicodeconverter"]
		.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	unicodeConverter.charset="UTF-8";

	var	channel=ioService.newChannel(aUrl, null, null);
	var	input=channel.open();
	scriptableStream.init(input);
	var	str=scriptableStream.read(input.available());
	scriptableStream.close();
	input.close();

	try {
		return unicodeConverter.ConvertToUnicode(str);
	} catch (e) {
		return str;
	}
},

//it's beneficial to be able to store scripts separately, but merely including them
//in the overlay or something means they won't be in the sandbox, and therefore
//not visible to the main script
//this takes an array of script URIs and concatenates the scripts into one big string
//so you can use injectScript on it
getScripts: function(arr) {
	
	//since we'll be concatenating potentially humongous strings, we'll push each 
	//into an array and then use join() on it
	
	var buf=[];
	
	for(var i=0, len=arr.length; i<len; i++)
		buf.push(vestitools_gmCompiler.getUrlContents(vestitools_gmCompiler.scriptPrefix + arr[i]));
		
	return buf.join(' ');
	
	},

isGreasemonkeyable: function(url) {
	var scheme=Components.classes["@mozilla.org/network/io-service;1"]
		.getService(Components.interfaces.nsIIOService)
		.extractScheme(url);
	return (
		(scheme == "http" || scheme == "https" || scheme == "file") &&
		!/hiddenWindow\.html$/.test(url)
	);
},

//return true if testing the string with any of the given regexes passes
//false otherwise
testMultiple: function(str, arr) {

	for(var i=0, len=arr.length; i<len; i++)
		if(arr[i].test(str))
			return true;
		
	return false;

	},

contentLoad: function(e) {
	var unsafeWin=e.target.defaultView;
	if (unsafeWin.wrappedJSObject) unsafeWin=unsafeWin.wrappedJSObject;

	var unsafeLoc = new XPCNativeWrapper(unsafeWin, "location").location;
	var oldHref = new XPCNativeWrapper(unsafeLoc, "href").href;
	var unsafeDoc = new XPCNativeWrapper(unsafeWin, "document").document;
	var unsafeBody = new XPCNativeWrapper(unsafeDoc, "body").body;
	
	var href = e.target.documentURI;

	if (
		vestitools_gmCompiler.isGreasemonkeyable(href) 
		&& vestitools_gmCompiler.testMultiple(href, vestitools_gmCompiler.includes) 
		&& !vestitools_gmCompiler.testMultiple(href, vestitools_gmCompiler.excludes)
		) {

			
		if(unsafeBody==null) {
			vestitools_gmCompiler.log(null, "body is null, stopping");
			return;
			}
	
		//inject scripts into page
		var script = vestitools_gmCompiler.getScripts(vestitools_gmCompiler.scriptList);
		vestitools_gmCompiler.injectScript(script, href, unsafeWin);
		
		}
},

injectScript: function(script, url, unsafeContentWin) {
	var sandbox, script, logger, storage, xmlhttpRequester;
	var safeWin=new XPCNativeWrapper(unsafeContentWin);

	sandbox=new Components.utils.Sandbox(safeWin);

	var storage=new vestitools_ScriptStorage();
	xmlhttpRequester=new vestitools_xmlhttpRequester(
		unsafeContentWin, window, //appSvc.hiddenDOMWindow
		url
	);

	sandbox.window=safeWin;
	sandbox.document=sandbox.window.document;
	sandbox.unsafeWindow=unsafeContentWin;
	
	//don't inject into iframes
	if(sandbox.window.top!=sandbox.window) return;

	// patch missing properties on xpcnw
	sandbox.XPathResult=Components.interfaces.nsIDOMXPathResult;

	// add our own APIs
	sandbox.GM_addStyle=function(css) { vestitools_gmCompiler.addStyle(sandbox.document, css) };
	sandbox.GM_setValue=vestitools_gmCompiler.hitch(storage, "setValue");
	sandbox.GM_getValue=vestitools_gmCompiler.hitch(storage, "getValue");
	//not implemented in Firefox 3.6, will throw error
	sandbox.GM_resetValue=vestitools_gmCompiler.hitch(storage, "resetValue");
	sandbox.GM_deleteValue=vestitools_gmCompiler.hitch(storage, "deleteValue");
	sandbox.GM_showOptions=vestitools_gmCompiler.hitch(this, "showOptions", unsafeContentWin);
	
	//Security: This allows the content script to read text of all files in chrome://vestitools/ or ProfD/ign++
	//However, no sensitive info is stored there so anything an attacker could get is of no use
	sandbox.GM_getFile=vestitools_gmCompiler.hitch(this, "getFile", unsafeContentWin);
	sandbox.GM_openInTab=vestitools_gmCompiler.hitch(this, "openInTab", unsafeContentWin);
	sandbox.GM_xmlhttpRequest=vestitools_gmCompiler.hitch(
		xmlhttpRequester, "contentStartRequest"
	);
	sandbox.GM_log=vestitools_gmCompiler.hitch(this, "log", unsafeContentWin);
	sandbox.GM_time=vestitools_gmCompiler.hitch(this, "time", unsafeContentWin);
	sandbox.GM_timeEnd=vestitools_gmCompiler.hitch(this, "timeEnd", unsafeContentWin);
	
	//unsupported
	sandbox.GM_registerMenuCommand=function(){};
	sandbox.GM_getResourceURL=function(){};
	sandbox.GM_getResourceText=function(){};

	sandbox.__proto__=sandbox.window;

	//performance profiling stuff that needs to be added around everything
	var beforeScript = 'GM_time("overall");';
	var afterScript = 'GM_timeEnd("overall");';
	
	this.evalInSandbox(
		"(function(){" + beforeScript + " " + script + " " + afterScript + "})()",
		url,
		sandbox);
	
},

evalInSandbox: function(code, codebase, sandbox) {
	if (Components.utils && Components.utils.Sandbox) {
		// DP beta+
		Components.utils.evalInSandbox(code, sandbox);
	} else if (Components.utils && Components.utils.evalInSandbox) {
		// DP alphas
		Components.utils.evalInSandbox(code, codebase, sandbox);
	} else if (Sandbox) {
		// 1.0.x
		evalInSandbox(code, sandbox, codebase);
	} else {
		throw new Error("Could not create sandbox.");
	}
},

openInTab: function(unsafeContentWin, url) {
	var tabBrowser = getBrowser(), browser, isMyWindow = false;
	for (var i = 0; browser = tabBrowser.browsers[i]; i++)
		if (browser.contentWindow == unsafeContentWin) {
			isMyWindow = true;
			break;
		}
	if (!isMyWindow) return;
 
	var loadInBackground, sendReferrer, referrer = null;
	loadInBackground = tabBrowser.mPrefs.getBoolPref("browser.tabs.loadInBackground");
	sendReferrer = tabBrowser.mPrefs.getIntPref("network.http.sendRefererHeader");
	if (sendReferrer) {
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
							.getService(Components.interfaces.nsIIOService);
		referrer = ios.newURI(content.document.location.href, null, null);
	 }
	 tabBrowser.loadOneTab(url, referrer, null, null, loadInBackground);
 },
 
//API function GM_showOptions()
//shows the options menu
showOptions: function() {
	
	var win = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                      .getService(Components.interfaces.nsIWindowMediator)
                      .getMostRecentWindow("IGN++ Options");
					  
	if (win) win.focus();
	else {
		var parentWindow = (!window.opener || window.opener.closed) ? window : window.opener;
		parentWindow.openDialog("chrome://vestitools/content/options/options.xul", "_blank", "chrome=yes,centerscreen=yes");
		}
	
	},

defined: function(something) {
	
	return typeof something != "undefined";
	
	},
	
//function that will tell you if object.object.object.... exists
//used to replace something like
//	if(window && window.Firebug && window.Firebug.Console && window.Firebug.Console.log)
//all checks originate at window by default
//pass function a string like "Firebug.Console.log" for chain
objectCheck: function(chain, origin) {
	
	var lastObj;
	
	if(vestitools_gmCompiler.defined(origin))
		lastObj = origin;
	else if(!window) return false;
	else lastObj = window;
	
	chain = chain.split(".");
	
	for(var i=0, len=chain.length; i<len; i++)
		if(lastObj==null || !vestitools_gmCompiler.defined( lastObj = lastObj[ chain[i] ] ))
			return false;
			
	return true;
	
	},
	
//because these rely on Firebug, we need to make sure all necessary objects exist

log: function(win, text){
	if(vestitools_PrefManager.getValue("logMessages", false))
		if(vestitools_gmCompiler.objectCheck("Firebug.Console.log"))
			Firebug.Console.log("IGN++: " + text);
	},

//for some reason, these two functions aren't accessible from Firebug.Console
//nor from window.console within injected scripts
//nor unsafeWindow.console
time: function(win, name) {
	if(vestitools_PrefManager.getValue("performanceProfiling", false))
		if(vestitools_gmCompiler.objectCheck("console.time", win))
			win.console.time("IGN++_" + name);
	},
	
timeEnd: function(win, name) {
	if(vestitools_PrefManager.getValue("performanceProfiling", false))
		if(vestitools_gmCompiler.objectCheck("console.timeEnd", win))
			win.console.timeEnd("IGN++_" + name);
	},
	
getFile: function(win, uri) {
	
	return vestitools_files.readFile(uri);
	
	},
 
//not sure what this is for
hitch: function(obj, meth) {
	var unsafeTop = new XPCNativeWrapper(unsafeContentWin, "top").top;

	for (var i = 0; i < this.browserWindows.length; i++) {
		this.browserWindows[i].openInTab(unsafeTop, url);
	}
},

apiLeakCheck: function(allowedCaller) {
	var stack=Components.stack;

	var leaked=false;
	do {
		if (2==stack.language) {
			if ('chrome'!=stack.filename.substr(0, 6) &&
				allowedCaller!=stack.filename 
			) {
				leaked=true;
				break;
			}
		}

		stack=stack.caller;
	} while (stack);

	return leaked;
},

hitch: function(obj, meth) {
	if (!obj[meth]) {
		throw "method '" + meth + "' does not exist on object '" + obj + "'";
	}

	var hitchCaller=Components.stack.caller.filename;
	//this gets flagged in the Firefox addon validator, 
	//but it doesn't actually change the splice function, only calls it
	var staticArgs = Array.prototype.splice.call(arguments, 2, arguments.length);

	return function() {
		if (vestitools_gmCompiler.apiLeakCheck(hitchCaller)) {
			return;
		}
		
		// make a copy of staticArgs (don't modify it because it gets reused for
		// every invocation).
		var args = staticArgs.concat();

		// add all the new arguments
		for (var i = 0; i < arguments.length; i++) {
			args.push(arguments[i]);
		}

		// invoke the original function with the correct this obj and the combined
		// list of static and dynamic arguments.
		return obj[meth].apply(obj, args);
	};
},

addStyle:function(doc, css) {
	var head, style;
	head = doc.getElementsByTagName('head')[0];
	if (!head) { return; }
	style = doc.createElement('style');
	style.type = 'text/css';
	style.innerHTML = css;
	head.appendChild(style);
},

setUpColorInterval: function() {

	setInterval(function(){ 
		vestitools_style.checkColorsAndApply(true)
		}, vestitools_style.updateFrequency * 3600000);

},

onLoad: function() {
	var	appcontent=window.document.getElementById("appcontent");
	if (appcontent && !appcontent.greased_vestitools_gmCompiler) {
		appcontent.greased_vestitools_gmCompiler=true;
		appcontent.addEventListener("DOMContentLoaded", vestitools_gmCompiler.contentLoad, true);
		//for the true there, see this:
		//http://github.com/greasemonkey/greasemonkey/issues/closed#issue/1082
		}
	//apply the main stylesheet to userChrome
	vestitools_style.applyMain();
	//apply usercolors, update if necessary
	var updated = vestitools_style.checkColorsAndApply();
	
	//update colors every x hours while the browser is open
	if(!updated) {
		
		var currentTime = Math.floor((new Date()).getTime() / 3600000);
		
		setTimeout(
			function(){
				vestitools_style.checkColorsAndApply(true);
				vestitools_gmCompiler.setUpColorInterval();
				},
			((vestitools_style.updateFrequency + vestitools_PrefManager.getValue("lastUsercolorCheck", 0) - currentTime) * 3600000)
			);
			
		}
	else vestitools_gmCompiler.setUpColorInterval();
	
},

onUnLoad: function() {
	//remove now unnecessary listeners
	window.removeEventListener('load', vestitools_gmCompiler.onLoad, false);
	window.removeEventListener('unload', vestitools_gmCompiler.onUnLoad, false);
	window.document.getElementById("appcontent")
		.removeEventListener("DOMContentLoaded", vestitools_gmCompiler.contentLoad, true);
},

}; //object vestitools_gmCompiler


function vestitools_ScriptStorage() {
	this.prefMan = vestitools_PrefManager;
}
vestitools_ScriptStorage.prototype.setValue = function(name, val) {
	this.prefMan.setValue(name, val);
}
vestitools_ScriptStorage.prototype.getValue = function(name, defVal) {
	return this.prefMan.getValue(name, defVal);
}
vestitools_ScriptStorage.prototype.resetValue = function(name) {
	return this.prefMan.reset(name);
}
vestitools_ScriptStorage.prototype.deleteValue = function(name) {
	return this.prefMan.remove(name);
}


window.addEventListener('load', vestitools_gmCompiler.onLoad, false);
window.addEventListener('unload', vestitools_gmCompiler.onUnLoad, false);