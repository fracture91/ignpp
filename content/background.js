
//this file only runs in gchrome in background.html


function vlog(t){ 
	console.log("IGN++: " + t);
	}

function openFile(path, callback) {
	
	if(typeof callback != "function") callback = function(){};
	
	var url = chrome.extension.getURL(path);
	
	var iframe = document.createElement("iframe");
	iframe.src = url;
	iframe.onload = callback;
	document.body.appendChild(iframe);
	
	}
	
function readFile(path, callback) {
	
	if(typeof callback != "function") callback = function(){};
	
	openFile(path, function(e){
		callback(e.target.contentDocument.body.innerHTML);
		});
	
	}
	
function otherReadFileTest(path) {
	
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function(){
		if (xhr.readyState == 4) {
            if (xhr.status == 200) {
				vlog("XHR file protocol NOT broken!? Response: " + xhr.responseText);
				}
			else vlog("XHR file protocol still broken, status: " + xhr.status);
			}
		}
	xhr.open("GET", chrome.extension.getURL(path), true);
	xhr.send();
	
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
		readFile(el, function(content){
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

window.onload = function(e){

	window.localStorageCopy = copyLocalStorage();
	
	copyFiles(knownFiles, function(copy) {
	
		window.filesCopy = {};
		for(var i in knownFiles)
			window.filesCopy[getFileName(knownFiles[i])] = copy[i];
		
		
		});
	
	//test to see if this works yet
	otherReadFileTest('/content/panel.html');
	
	}

var managedTabs = [];

var knownFiles = [
	"content/panel.html",
	"content/wysiwyg.html",
	"content/extra.html",
	"content/controls.html"
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
	
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	
	if(request.type === undefined) return;
	
	if(sender.tab && managedTabs.indexOf(sender.tab)==-1) managedTabs.push(sender.tab);
	
	switch(request.type.toLowerCase()) {
		
		case "localstorage":
			sendResponse(localStorageCopy);
			break;
			
		case "setvalue":
			var name = request.name, value = request.value;
			localStorage[name] = localStorageCopy[name] = value;
			managedTabs.forEach(function(el, i, arr) {
				if(sender.tab.id==el.id) return;
				chrome.tabs.sendRequest(el.id, {type: "setValue", name: name, value: value});
				});
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
	
		case "getfile":
			//doesn't work
			readFile(port.path);
			break;
		
		case "xmlhttprequest":
			var aDockHag = new XHRDockHag(port);
			break;
			
		default:
			vlog("Unknown connection: " + port.name);
			break;
			
		}
		
	});