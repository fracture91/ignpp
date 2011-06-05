
//this file only runs in gchrome in background.html


function vlog(t){ 
	console.log("IGN++: " + t);
	}
	
function GM_getValue(name, def) {
	var jsonValue = localStorage[name];
	if(typeof(jsonValue)!="undefined") {
		try {
			return JSON.parse(jsonValue);
			}
		catch(e) {
			vlog("GM_getValue - Error parsing value " + name + ", returning default.\n" + e);
			}
		}
	return def;
	}
	
function GM_setValue(name, value, sender) {
	var jsonValue = JSON.stringify(value);
	localStorage[name] = localStorageCopy[name] = jsonValue;
	for(var i in tabManager.tabs) {
		var managed = tabManager.tabs[i];
		if(sender && sender.tab.id==managed.id) continue;
		chrome.tabs.sendRequest(managed.id, {type: "setValue", name: name, jsonValue: jsonValue});
		}
	}
	
function copyLocalStorage() {
	
	var copy = {};
	
	for(var i in localStorage)
		copy[i] = localStorage[i];
		
	return copy;
	
	}
	
function copyFiles(files, callback) {
	
	if(typeof callback != "function") callback = function(){};
	
	var copy = [];
	
	files.forEach(function(el, i, arr) {
		vestitools_files.readFile(el, function(content){
			copy[i] = content;
			var done = true;
			files.forEach(function(ele, j, arra) {
				if(!copy[j]) done = false;
				});
			if(done) callback(copy);
			});
		});
	
	}
	
function getFileName(path) {
	
	return path.match(/\/([^\/]*)\..*$/)[1];
	
	}
	
function ping(tab) {
	
	var t1 = (new Date()).getTime();
	
	chrome.tabs.sendRequest(tab.id, {type: "ping"}, function(response) {
		
		var t2 = response.time;
		var t3 = (new Date()).getTime();
		vlog(
				"ping: " + (t3-t1) +
				"\nto there: " + (t2-t1) +
				"\nand back: " + (t3-t2)
				);
		
		});
	
	}
	
function injectScripts(tab) {
	
	for(var i=0, len=scripts.length; i<len; i++)
		chrome.tabs.executeScript(tab.id, {file: scripts[i]});
	
	}
	
function addStyle(tab, css) {
	
	chrome.tabs.insertCSS(tab.id, {code: css});
	
	}

window.onload = function(e) {

	window.localStorageCopy = copyLocalStorage();
	
	vestitools_files.chromeInit(function() {
		copyFiles(knownFiles, function(copy) {
			window.filesCopy = {};
			for(var i in knownFiles)
				window.filesCopy[getFileName(knownFiles[i])] = copy[i];
			});
		vestitools_style.init(true);
		});
	
	}


var knownFiles = [
	"extension://content/panel.html",
	"extension://content/wysiwyg.html",
	"extension://content/extra.html",
	"extension://content/controls.html"
	];

var scripts = [
	"content/util.js",
	"content/info.js",
	"content/console.js",
	"content/parse.js",
	"content/replies.js",
	"content/topics.js",
	"content/editors.js",
	"content/panels.js",
	"content/overlay.js",
	"content/message.js",
	"content/infopanels.js",
	"content/quickstats.js",
	"content/threadpreview.js",
	"content/autowul.js",
	"content/conditionalstyle.js",
	"content/integratedtools.js",
	"content/autorefresh.js",
	"content/kbonly.js"
	];
	
	
/*
Holds a chromeTab and its sentinel port.
onDisconnectFunc is called whenever the given tab is disconnected (closed, crashes, explodes, etc.)
*/
function Tab(chromeTab, onDisconnectFunc) {
	this.chromeTab = chromeTab;
	this.sentinel = null;
	this.onDisconnectFunc = onDisconnectFunc;
	this.connect();
	}
	
Tab.prototype = {
	
	/*
	Open connection to the tab if not already connected.
	*/
	connect: function() {
		if(this.sentinel != null) return false;
		this.sentinel = chrome.tabs.connect(this.id, {name: "sentinel"});
		var that = this;
		this.sentinel.onDisconnect.addListener(function(port){ that.onDisconnect(port) });
		},
		
	/*
	Disconnect from the tab if not already disconnected.
	*/
	disconnect: function() {
		if(this.sentinel == null) return false;
		this.sentinel.disconnect();
		},
		
	/*
	Disconnect listener that's always added to the sentinel port.
	Nullifies the port and calls this.onDisconnectFunc.
	*/
	onDisconnect: function(port) {
		this.sentinel = null;
		this.onDisconnectFunc(this, port);
		},
		
	get id() { return this.chromeTab.id; }
	
	}
	
/*
Manages tabs in a way such that all tabs are unique, exist in the browser,
and are running our scripts.
*/
function TabManager() {
	/*
	Tabs, indexed by chromeTab.id.
	*/
	this.tabs = {};
	}
	
TabManager.prototype = {
	
	/*
	Given a chromeTab, add a Tab for it to this manager.
	*/
	add: function(chromeTab) {
		if(!this.hasTab(chromeTab)) {
			var that = this;
			this.tabs[chromeTab.id] = new Tab(chromeTab, function(tab, port) {
				that.onDisconnect(tab, port);
				});
			}
		},
		
	/*
	Given a Tab or a chromeTab, disconnect remove the Tab from this manager.
	*/
	remove: function(tab) {
		if(this.hasTab(tab)) {
			this.tabs[tab.id].disconnect();
			delete this.tabs[tab.id];
			}
		},
		
	/*
	Given a Tab or chromeTab, return true if this manager has it, false otherwise.
	*/
	hasTab: function(tab) {
		return this.tabs[tab.id] instanceof Tab;
		},
		
	/*
	The disconnect listener added to all Tabs.
	Removes the disconnected Tab from this manager.
	*/
	onDisconnect: function(tab, port) {
		this.remove(tab);
		}
	
	}
	
/*
This will hold all tabs into which we have injected scripts that need to be alerted
about preference changes and potentially other things.
*/
var tabManager = new TabManager();


	
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	
	if(request.type === undefined) return;
	
	if(sender.tab) tabManager.add(sender.tab);
	
	switch(request.type.toLowerCase()) {
		
		case "localstorage":
			sendResponse(localStorageCopy);
			break;
			
		case "setvalue":
			GM_setValue(request.name, JSON.parse(request.jsonValue), sender);
			break;
			
		case "ping":
			sendResponse({time: (new Date()).getTime()});
			break;
			
		case "initialize":
			sendResponse({localStorage: localStorageCopy, files: filesCopy});
			injectScripts(sender.tab);
			break;
			
		case "addstyle":
			addStyle(sender.tab, request.css);
			break;
			
		case "usercolors":
			if(GM_getValue("applyUsercolors", true)) {
				chrome.tabs.sendRequest(sender.tab.id, {type: "registercolors", value: vestitools_style.getColorsData()});
				}
			break;
			
		case "checkin":
			//options page just checking in
			break;
			
		default:
			vlog("Unknown request: " + request.type);
			break;
		
		}
	
	});

//manages the port for the xmlhttprequester, get it?
//okay, so the dock hag only managed a single dock AFAIK, but you get it
function XHRDockHag(port) {
	
	this.port = port;
	this.requester = new vestitools_xmlhttpRequester(this.port, window, this.port.sender.tab.url);
	
	//object that contentStartRequest returns that lets us abort the request
	//(not implemented yet)
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
	
chrome.extension.onConnect.addListener(function(port) {
	
	switch(port.name.toLowerCase()) {
		
		case "xmlhttprequest":
			var aDockHag = new XHRDockHag(port);
			break;
			
		default:
			vlog("Unknown connection: " + port.name);
			break;
			
		}
		
	});