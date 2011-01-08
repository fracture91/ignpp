
//the localStorage on the options page is the same as on the background page
GM_localStorage = localStorage;

//just checking in with the background page to make sure we receive setvalue updates
chrome.extension.sendRequest({type: "checkin"});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	
	if(request.type === undefined) return;

	switch(request.type.toLowerCase()) {
		
		case "setvalue":
			//change value of respective input if not already changed by user
			break;
			
		case "ping":
			sendResponse({time: (new Date()).getTime()});
			break;
			
		default:
			GM_log("Unknown request to options: " + request.type);
			break;
		
		}
	
	});

	
	
PreferenceView = function(model) {
	
	this.model = model;
	this.make();
	
	}
	
PreferenceView.prototype = {
	
	masterContainer: null,
	
	make: function() {
		
		this.listItem = document.createElement("li");
		this.listItem.textContent = this.model.name + ", " + this.model.def;
		
		this.masterContainer.appendChild(this.listItem);
		
		}
	
	}

Preference = function(name, def) {
	
	this.name = name;
	this.def = def;
	this.view = new PreferenceView(this);
	
	}
	
Preference.prototype = {
	
	validate: function() {
		
		var val = this.view.value;
		
		if(typeof this.def == "number") {
			return val/1 === val;
			}
		if(typeof this.def == "boolean") {
			return !!val === val;
			}
		if(typeof this.def == "string") {
			return val+"" === val;
			}
		
		return true;
		
		},
	
	get: function() {
		
		},
	
	//assumes that validation has occurred
	save: function() {
		
		
		
		}
	
	}

Preferences = new function() {
	
	this.prefs = {};
	
	this.addFromObject = function(obj) {
		for(var i in obj) this.add(i, obj[i]);
		}
	
	this.add = function(name, def) {
		
		if(!this.prefs[name]) {
			this.prefs[name] = new Preference(name, def);
			}
		
		}
	
	}

	
prefsCatcher = {};

//catch calls to this previously imaginary function from defaults.js for use later
function pref(name, def) {
	prefsCatcher[name.substring(name.lastIndexOf(".")+1)] = def;
	}

	
window.onload = function(e) {
	
	PreferenceView.prototype.masterContainer = document.getElementById("generatedPrefs");
	
	Preferences.addFromObject(prefsCatcher);
		
	}
