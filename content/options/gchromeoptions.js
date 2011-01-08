
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
	this.multiline = this.model.name.indexOf("pretext") != -1;
	this.make();
	this.load();
	
	}
	
PreferenceView.prototype = {
	
	masterContainer: null,
	
	get value() {
		if(this.model.type=="boolean") {
			return this.input.checked;
			}
		return this.input.value;
		},
		
	set value(v) {
		v = this.model.clean(v);
		if(this.model.type=="boolean") {
			return this.input.checked = v;
			}
		return this.input.value = v;
		},
		
	get clean() {
		return this.model.clean(this.value);
		},
		
	validate: function() {
		return this.clean == this.value;
		},
		
	save: function() {
		this.model.set(this.value);
		},
		
	load: function() {
		this.value = this.model.get;
		},
		
	get changed() {
		return this.model.get != this.clean;
		},
		
	
	make: function() {
		
		this.container = document.createElement("li");
		this.name = document.createElement("h6");
		this.name.textContent = this.model.name;
		
		if(!this.multiline) {
			this.input = document.createElement("input");
			if(this.model.type == "boolean") {
				this.input.type = "checkbox";
				}
			else {
				this.input.type = "text";
				}
			}
		else {
			this.input = document.createElement("textarea");
			}
		
		this.container.appendChild(this.name);
		this.container.appendChild(this.input);
		
		this.masterContainer.appendChild(this.container);
		
		}
	
	}

Preference = function(name, def) {
	
	this.name = name;
	this.def = def;
	this.type = typeof this.def;
	
	}
	
Preference.prototype = {
	
	clean: function(val, type) {
		
		if(typeof(type)=="undefined") type = this.type;
		if(typeof(val)=="undefined") val = this.get;
		
		switch(type) {
			case "number":
				return val/1;
			case "boolean":
				return !!val;
			case "string":
				return val+"";
			}
			
		return null;
		
		},
	
	get get() {
		return GM_getValue(this.name, this.def);
		},
		
	set set(val) {
		return GM_setValue(this.name, this.clean(val));
		}
	
	}

Preferences = new function() {
	
	this.prefs = {};
	
	this.addFromObject = function(obj) {
		for(var i in obj) this.add(i, obj[i]);
		}
	
	this.add = function(name, def) {
		
		if(!this.prefs[name]) {
			this.prefs[name] = new PreferenceView(new Preference(name, def));
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
