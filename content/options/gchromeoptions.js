
//the localStorage on the options page is the same as on the background page
GM_localStorage = localStorage;

//just checking in with the background page to make sure we receive setvalue updates
chrome.extension.sendRequest({type: "checkin"});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	
	if(request.type === undefined) return;

	switch(request.type.toLowerCase()) {
		
		case "setvalue":
			//change value of respective input if not already changed by user
			var pref = Preferences.prefs[request.name];
			if(!pref) {
				pref = Preferences.add(request.name, JSON.parse(request.jsonValue));
				}
			else if(!pref.changedFromLastSaved) {
				pref.model.lastSavedValue = pref.value = JSON.parse(request.jsonValue);
				}
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
		this.model.value = this.value;
		},
		
	load: function() {
		this.value = this.model.value;
		},
		
	get changed() {
		return this.model.value != this.clean;
		},
		
	get changedFromLastSaved() {
		return this.model.lastSavedValue != this.clean;
		},
		
	
	make: function() {
		
		this.container = document.createElement("div");
		this.container.id = "pref_" + this.model.name;
		this.container.className = "preference";
		
		this.name = document.createElement("h6");
		this.name.textContent = this.model.name;
		
		if(!this.multiline) {
			this.input = document.createElement("input");
			if(this.model.type == "boolean") {
				this.input.type = "checkbox";
				}
			else if(this.model.type == "number") {
				this.input.type = "number";
				}
			}
		else {
			this.input = document.createElement("textarea");
			}
		
		this.container.appendChild(this.name);
		this.container.appendChild(this.input);
		
		}
	
	}

Preference = function(name, def) {
	
	this.name = name;
	this.def = def;
	this.type = typeof this.def;
	this.lastSavedValue = undefined;
	
	}
	
Preference.prototype = {
	
	clean: function(val, type) {
		
		if(!defined(type)) type = this.type;
		if(!defined(val)) val = this.value;
		
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
	
	get value() {
		var val = GM_getValue(this.name, this.def);
		if(!defined(this.lastSavedValue)) this.lastSavedValue = val;
		return val;
		},
		
	set value(val) {
		return this.lastSavedValue = GM_setValue(this.name, this.clean(val));
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
			var pointer = document.getElementById("pref_" + name);
			if(pointer) pointer.parentNode.replaceChild(this.prefs[name].container, pointer);
			else this.masterContainer.appendChild(this.prefs[name].container);
			}
		
		}
		
	this.forEachPref = function(func) {
		for(var i in this.prefs) if(func(this.prefs[i], i, this.prefs)===false) return false;
		}
		
	this.save = function() {
		
		var someInvalid = false;
		this.forEachPref(function(e, i, a) {
			if(e.changed) {
				if(e.validate()) {
					e.save();
					}
				else {
					someInvalid = true;
					}
				}
			});
			
		return someInvalid;
		
		}
		
	this.__defineGetter__("anyChanges", function() {
		var changes = false;
		this.forEachPref(function(e, i, a) {
			if(e.changed) {
				changes = true;
				return false;
				}
			});
		return changes;
		});
		
	this.clearLog = function(time) {
		
		if(typeof time != "number") return this.controlLog.textContent = "";
		
		if(defined(this.logTimer)) clearTimeout(this.logTimer);
		this.logTimer = setTimeout(this.clearLog, time);
		
		}
	
	}

	
prefsCatcher = {};

//catch calls to this previously imaginary function from defaults.js for use later
function pref(name, def) {
	prefsCatcher[name.substring(name.lastIndexOf(".")+1)] = def;
	}

	
window.onload = function(e) {
	
	Preferences.masterContainer = document.getElementById("uncategorizedPrefs");
	Preferences.saveButton = document.getElementById("saveButton");
	Preferences.closeButton = document.getElementById("closeButton");
	Preferences.controlLog = document.getElementById("controlLog");
	
	Preferences.addFromObject(prefsCatcher);
		
	}

function controlButtonHandler(e) {
	
	if(e.target == Preferences.saveButton) {
		
		var someInvalid = Preferences.save();
		if(someInvalid) alert("Some preferences were not valid and, consequently, not saved.");
		Preferences.controlLog.textContent = "Saved!";
		Preferences.clearLog(2000);
		
		}
	
	else if(e.target == Preferences.closeButton) {
		
		if(!Preferences.anyChanges ||
			confirm("You have unsaved changes - are you sure you want to close the Options tab?")) {
				window.close();
			}
		
		}
	
	}
	
document.addEventListener("click", controlButtonHandler, true);



function tabHandler(e) {
	
	function hasTab(el) { return el.hasAttribute && el.hasAttribute("tab") }
	
	var tab = e.target;
	if(!hasTab(tab)) tab = getParentBy(e.target, hasTab);
	if(!tab) return;
	
	if(tab.tagName=="SECTION") return;
	
	var tabNav = getParentByTagName(e.target, "nav");
	if(!tabNav) return;
	
	var tabBox = getParentByClassName(tabNav, "tabBox");
	if(!tabBox) return;
	
	var tabName = tab.getAttribute("tab");
	
	setSelected = function(el, i) {
		if(hasTab(el)) {
			if(el.getAttribute && el.getAttribute("tab") == tabName) el.setAttribute("selected", true);
			else el.removeAttribute("selected");
			return true;
			}
		}
	
	var sections = getChildrenBy(tabBox, setSelected);
	var tabs = getChildrenBy(tabNav, setSelected);
		
	e.preventDefault();
	
	}

document.addEventListener("click", tabHandler, true);