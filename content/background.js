
/*
This file only runs in Google Chrome in background.html
*/


/*
Responsible for injecting content scripts and hooking up all the API functions for them.
*/
var Background = new function() {
	
	/*
	Add the onLoad, onRequest, and onConnect listeners.
	*/
	this.init = function() {
		var that = this;
		window.addEventListener("load", function(e){ that.onLoad(e) }, true);
		chrome.extension.onRequest.addListener(function(r,s,sr){ that.onRequest(r,s,sr) });
		chrome.extension.onConnect.addListener(function(p){ that.onConnect(p) });
		}
	
	/*
	Given an array of filenames, get a new array where
	each corresponding element has the contents of the file.
	*/
	this.getFilesCopy = function(files, callback) {
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
	
	/*
	Ping the given tab - that is, log how long it takes to get a response from sendRequest.
	*/
	this.ping = function(tab) {
		var t1 = (new Date()).getTime();
		chrome.tabs.sendRequest(tab.id, {type: "ping"}, function(response) {
			var t2 = response.time;
			var t3 = (new Date()).getTime();
			GM_log(
					"ping: " + (t3-t1) +
					"\nto there: " + (t2-t1) +
					"\nand back: " + (t3-t2)
					);
			});
		}
	
	/*
	Rate to poll for idle state at, in milliseconds.
	*/
	this.idlePollInterval = 1000;
	
	/*
	Inject all scripts listed in this.scripts into the given tab.
	*/
	this.injectScripts = function(tab) {
		for(var i=0, len=this.scripts.length; i<len; i++) {
			chrome.tabs.executeScript(tab.id, {file: this.scripts[i]});
			}
		}
		
	/*
	Files which will be copied to GM_API.files onload.
	*/
	this.knownFiles = [
		"extension://content/wysiwyg.html"
		];
		
	/*
	Scripts which will be injected with this.injectScripts.
	*/
	this.scripts = [
		"content/inheritance.js",
		"content/util.js",
		"content/console.js",
		"content/employee.js",
		"content/observable.js",
		"content/trackable.js",
		"content/view.js",
		"content/model.js",
		"content/controller.js",
		"content/info.js",
		"content/parse.js",
		"content/replies.js",
		"content/topics.js",
		"content/editors.js",
		"content/panels.js",
		"content/messenger.js",
		"content/conditionalstyle.js",
		"content/integratedtools.js",
		"content/autorefresh.js"
		];
		
	/*
	Listener for when the window loads, set up by this.init.
	Initializes idle polling, vestitools_files, vestitools_style, and copies over known files.
	*/
	this.onLoad = function(e) {
		var that = this;
		setInterval(function() {
			chrome.idle.queryState(15, function(newState) {
				GM_API.onIdleStateUpdate(newState);
				});
			}, this.idlePollInterval);
		vestitools_files.chromeInit(function() {
			that.getFilesCopy(that.knownFiles, function(copy) {
				for(var i in that.knownFiles)
					GM_API.files[GM_API.getFileName(that.knownFiles[i])] = copy[i];
				});
			vestitools_style.init(true);
			});
		}
		
	/*
	Listener for extension requests, set up by this.init.
	*/
	this.onRequest = function(request, sender, sendResponse) {
		if(request.type === undefined) return;
		if(sender.tab) this.tabManager.add(sender.tab);
		
		switch(request.type.toLowerCase()) {
			case "localstorage":
				sendResponse(GM_API.localStorageCopy);
				break;
			case "setvalue":
				GM_setValue(request.name, JSON.parse(request.jsonValue), sender);
				break;
			case "ping":
				sendResponse({time: (new Date()).getTime()});
				break;
			case "initialize":
				sendResponse({localStorage: GM_API.localStorageCopy, files: GM_API.files, 
					currentlyActive: GM_API.currentlyActive});
				this.injectScripts(sender.tab);
				break;
			case "addstyle":
				GM_addStyle(sender.tab, request.css);
				break;
			case "usercolors":
				if(GM_getValue("applyUsercolors", true)) {
					chrome.tabs.sendRequest(sender.tab.id, {type: "registercolors", value: vestitools_style.getColorsData()});
					}
				break;
			case "showoptions":
				GM_showOptions(sender.tab);
				break;
			case "remotecall":
				GM_API.remoteCall(request.name, request.arguments, sendResponse);
				break;
			case "checkin":
				//options page just checking in
				break;
			default:
				GM_log("Unknown request: " + request.type);
				break;
			}
		
		}
		
	/*
	Listener for extension connections, set up by this.init.
	*/
	this.onConnect = function(port) {
		switch(port.name.toLowerCase()) {
			case "xmlhttprequest":
				GM_xmlhttpRequest(port);
				break;
			default:
				GM_log("Unknown connection: " + port.name);
				break;
			}
		}
		
	}
	

	
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
		},
		
	/*
	Should be called when GM_setValue is called.
	Alerts all tabs of the value change, except for the origin tab (if provided).
	*/
	onSetValue: function(name, jsonValue, origin) {
		for(var i in this.tabs) {
			var tab = this.tabs[i];
			if(origin && origin.id==tab.id) continue;
			chrome.tabs.sendRequest(tab.id, {type: "setValue", name: name, jsonValue: jsonValue});
			}
		}
	
	}
	
/*
This will hold all tabs into which we have injected scripts that need to be alerted
about preference changes and potentially other things.
*/
Background.tabManager = GM_API.tabManager = new TabManager();
Background.init();

