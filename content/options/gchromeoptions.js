
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

	
/*
Handles the interface for a PreferenceModel
Must be given a PreferenceModel to work off of (or some equivalent)
*/
PreferenceView = function(model) {
	
	this.model = model;
	this.container;
	this.label;
	this.input;
	this.controls;
	this.errorOutput;
	
	/*
	The errors that the input currently has.
	When set, calls this.handleErrors.
	*/
	var errors = {};
	this.__defineGetter__("errors", function() { return errors; });
	this.__defineSetter__("errors", function(o) {
		this.handleErrors(o);
		errors = o;
		});
	
	/*
	Controls appearance of validity - nothing is actually checked here
	*/
	var valid = true;
	this.__defineGetter__("valid", function() { return valid; });
	this.__defineSetter__("valid", function(b) {
		//only add/removeClass if state has changed
		if(b!=valid) {
			if(!b) addClass(this.container, "invalid");
			else removeClass(this.container, "invalid");
			valid = b;
			}
		return valid;
		});
	
	/*
	Title that overrides model's title.
	*/
	var title;
	this.__defineGetter__("title", function() {
		return defined(title) ? title : this.model.title;
		});
	this.__defineSetter__("title", function(s) {
		title = s;
		if(this.label) {
			this.label.textContent = this.title;
			}
		});

	}
	
PreferenceView.prototype = {
	
	/*
	The value currently inputted
	*/
	get value() {
		if(this.model.type=="boolean") {
			return this.input.checked;
			}
		return this.input.value;
		},
		
	/*
	Set the currently inputted value, the given value is cleaned beforehand
	*/
	set value(v) {
		v = this.model.clean(v).value;
		if(this.model.type=="boolean") {
			return this.input.checked = v;
			}
		//since it has been cleaned...
		this.valid = true;
		this.errors = {};
		return this.input.value = v;
		},
	
	/*
	This view's model's clean method called with the currently inputted value or the one passed to it.
	*/
	clean: function(val) {
		return this.model.clean(defined(val) ? val : this.value);
		},
		
	/*
	Returns true if this.clean().value == this.value, false otherwise.
	*/
	isValid: function(cleanVal, val) {
		val = defined(val) ? val : this.value;
		cleanVal = defined(cleanVal) ? cleanVal : this.clean(val).value;
		return cleanVal == val;
		},
		
	/*
	Returns true if the current input isValid, false otherwise.
	Has the side effect of displaying any errors.
	*/
	validate: function(clean, val) {
		val = defined(val) ? val : this.value;
		clean = defined(clean) ? clean : this.clean(val);
		var valid = this.isValid(clean.value, val);
		this.errors = valid ? {} : clean.errors;
		return this.valid = valid;
		},
		
	/*
	Save the currently inputted value to the model
	*/
	save: function() {
		this.model.value = this.value;
		},
		
	/*
	Load the currently inputted value from the model
	*/
	load: function() {
		this.value = this.model.value;
		},
	
	/*
	True if the currently inputted value is changed from oldVal, false otherwise
	*/
	isChangedFrom: function(oldVal, newVal, cleanVal) {
		newVal = defined(newVal) ? newVal : this.value;
		cleanVal = defined(cleanVal) ? cleanVal : this.clean(newVal).value;
		//if newVal is invalid, the value is definitely changed since oldVal cannot be invalid (theoretically)
		return !this.isValid(cleanVal, newVal) || oldVal != cleanVal;
		},
	
	/*
	True if the currently inputted value is different from the model's value, false otherwise.
	Has the side effect of applying the "changed" class to this.container.
	*/
	checkChanged: function(val, cleanVal) {
		var changed = this.isChangedFrom(this.model.value, val, cleanVal);
		if(changed) {
			addClass(this.container, "changed");
			}
		else {
			removeClass(this.container, "changed");
			}
		return changed;
		},
		
	/*
	True if the currently inputted value is different from the model's default value, false otherwise.
	Has the side effect of applying the "changedFromDefault" class to this.container.
	*/
	checkChangedFromDefault: function(val, cleanVal) {
		var changed = this.isChangedFrom(this.model.def, val, cleanVal);
		if(changed) {
			addClass(this.container, "changedFromDefault");
			}
		else {
			removeClass(this.container, "changedFromDefault");
			}
		return changed;
		},
		
	/*
	True if the currently inputted value is different from the model's last saved value, false otherwise.
	*/
	isChangedFromLastSaved: function(val, cleanVal) {
		return this.isChangedFrom(this.model.lastSavedValue, val, cleanVal);
		},
		
	/*
	Make the necessary interface out of DOM elements, contained by container
	The container is a div with id pref_preferenceName and className preference
	*/
	make: function() {
		
		this.container = document.createElement("div");
		this.container.id = "pref_" + this.model.name;
		this.container.className = "preference";
		
		this.label = document.createElement("label");
		this.label.textContent = this.title;
		
		if(Array.isArray(this.model.selections)) {
			this.input = document.createElement("select");
			this.model.selections.forEach(function(e, i, a) {
				var option = document.createElement("option");
				if(Array.isArray(e)) {
					option.textContent = e[0];
					option.value = e[1];
					}
				else {
					option.textContent = e;
					}
				this.input.appendChild(option);
				}, this);
			}
		else if(!this.model.multiline) {
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
			
		if(this.model.pattern instanceof RegExp) {
			this.input.pattern = this.model.pattern.source;
			}
		if(typeof this.model.min == "number") {
			this.input.min = this.model.min;
			}
		if(typeof this.model.max == "number") {
			this.input.max = this.model.max;
			}
		if(typeof this.model.step == "number") {
			this.input.step = this.model.step;
			}
		if(typeof this.model.maxLength == "number") {
			this.input.maxLength = this.model.maxLength;
			}
			
		this.errorOutput = document.createElement("ul");
		this.errorOutput.className = "errors";
		
		this.container.appendChild(this.label);
		this.container.appendChild(this.input);
		this.container.appendChild(this.errorOutput);
		
		},
	
	/*
	Fill this.errorOutput with error messages based on the object passed in.
	*/
	handleErrors: function(errors) {
		//make must be called beforehand
		if(!defined(this.errorOutput)) return;
		
		var out = document.createElement("ul");
		
		function onErr(t) {
			var li = document.createElement("li");
			li.textContent = t;
			out.appendChild(li);
			}
		
		for(var i in errors) {
			switch(i) {
				case "rangeOverflow":
					onErr("Number must be less than or equal to " + errors[i] + ".");
					break;
				case "rangeUnderflow":
					onErr("Number must be greater than or equal to " + errors[i] + ".");
					break;
				case "stepMismatch":
					onErr("Number must be a multiple of " + errors[i] + ".");
					break;
				case "tooLong":
					onErr("Must be less than or equal to " + errors[i] + " characters long.");
					break;
				case "patternMismatch":
					onErr("Must match pattern " + errors[i] + ".");
					break;
				case "selectionMismatch":
					onErr("Must be one of: " + errors[i].map(function(e, i, a) {
							return Array.isArray(e) ? e[0] : e;
						}).join(", ") + ".");
					break;
				case "customError":
					onErr(errors[i]);
					break;
				}
			}
		
		if(out.childElementCount == 0 && this.errorOutput.childElementCount == 0) {
			//don't bother
			}
		else {
			out.className = this.errorOutput.className;
			this.errorOutput.parentNode.replaceChild(out, this.errorOutput);
			this.errorOutput = out;
			}
		
		}
	
	}

/*
A model for a preference
Given the preference's name (as used in GM_(s/g)etValue) and its default value
The preference is assumed to only be able to hold values of the same type as its default value
*/
PreferenceModel = function(name, def) {
	
	this.name = name;
	
	/*
	This preference's default value
	*/
	this.def = def;
	
	this.type = typeof this.def;
	
	/*
	The last saved value of this preference
	Is set if the value getter is called and it's currently undefined or when the value setter is called.
	Should also be set when an outside change to the preference is detected, but that is not the model's responsibility.
	*/
	this.lastSavedValue = undefined;
	//call the getter to set lastSavedValue
	this.value;
	
	
	/*
	The below is stuff that a rule is meant to change.
	*/
	
	/*
	A separate title to display instead of name.
	*/
	var title;
	this.__defineGetter__("title", function() {
		if(!defined(title)) title = this.camelToTitle(this.name);
		return title;
	});
	this.__defineSetter__("title", function(s) {
		title = s;
	});
	
	/*
	Minimum and maximum values for numbers.
	*/
	this.max;
	this.min;
	
	/*
	A regular expression the pref must match.
	*/
	this.pattern;
	
	/*
	An array of selections for select inputs.
	*/
	this.selections;
	
	/*
	True if this preference is a string that accepts multiline input, false otherwise
	*/
	this.multiline = false;
	
	/*
	A function that consumes a value and returns an error message if there is an error, false otherwise.
	*/
	this.customErrorFunc;
	
	}
	
PreferenceModel.prototype = {
	
	camelToTitle: function(s) {
		s = s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
		return s.substring(0,1).toUpperCase() + s.substring(1);
	},
	
	/*
	Clean a given value, i.e. convert it so that it makes sense for a model of the given type to use
	If a value or type are not given, they default to this model's value and type
	Value is null if type is not recognized
	Returns an object with value and errors properties.
	*/
	clean: function(val, type, multiline) {
		
		if(!defined(val)) val = this.value;
		if(!defined(type)) type = this.type;
		if(!defined(multiline)) multiline = this.multiline;
		
		var rv = {value: null, errors: {}};
		
		switch(type) {
			case "number":
				val = val/1;
				break;
			case "boolean":
				val = !!val;
				break;
			case "string":
				val = val+"";
				if(!multiline) val = val.replace("\n", "");
				break;
			default:
				rv.errors.unrecognizedType = type;
				return rv;
			}
		
		var cerr;
		
		if(this.rangeOverflow(val)) {
			val = rv.errors.rangeOverflow = this.max;
			}
		if(this.rangeUnderflow(val)) {
			val = rv.errors.rangeUnderflow = this.min;
			}
		if(this.stepMismatch(val)) {
			val = this.roundNearest(val, rv.errors.stepMismatch = this.step);
			}
		if(this.tooLong(val)) {
			val = val.substr(0, rv.errors.tooLong = this.maxLength);
			}
		if(this.patternMismatch(val)) {
			val = this.def;
			rv.errors.patternMismatch = this.pattern;
			}
		if(this.selectionMismatch(val)) {
			val = this.def;
			rv.errors.selectionMismatch = this.selections;
			}
		if(cerr = this.customError(val)) {
			val = this.def;
			rv.errors.customError = cerr;
			}
		
		rv.value = val;
		
		return rv;
		
		},
	
	rangeOverflow: function(val) {
		if(!defined(val)) val = this.value;
		return typeof this.max == "number" && val > this.max;
	},
	
	rangeUnderflow: function(val) {
		if(!defined(val)) val = this.value;
		return typeof this.min == "number" && val < this.min;
	},
	
	stepMismatch: function(val) {
		if(!defined(val)) val = this.value;
		return typeof this.step == "number" && val % this.step != 0;
	},
	
	tooLong: function(val) {
		if(!defined(val)) val = this.value;
		return typeof this.maxLength == "number" && val.length > this.maxLength;
	},
	
	patternMismatch: function(val) {
		if(!defined(val)) val = this.value;
		return this.pattern instanceof RegExp && !val.match(this.pattern);
	},
	
	selectionMismatch: function(val) {
		if(!defined(val)) val = this.value;
		return Array.isArray(this.selections) && !this.selections.some(function(e, i, a) {
			return e == val || Array.isArray(e) && e[1] == val;
			}, this);
	},
	
	customError: function(val) {
		if(!defined(val)) val = this.value;
		if(typeof this.customErrorFunc == "function") {
			return this.customErrorFunc(val);
			}
		return false;
	},
	
	// http://www.hashbangcode.com/blog/javascript-round-nearest-number-367.html
	roundNearest: function roundNearest(num, acc){
		if ( acc < 0 ) {
			return Math.round(num*acc)/acc;
		} else {
			return Math.round(num/acc)*acc;
		}
	},
	
	/*
	Get the value associated with this preference (calls GM_getValue)
	*/
	get value() {
		var val = GM_getValue(this.name, this.def);
		if(!defined(this.lastSavedValue)) this.lastSavedValue = val;
		return val;
		},
		
	/*
	Set the value associated with this preference (calls GM_setValue)
	*/
	set value(val) {
		return this.lastSavedValue = GM_setValue(this.name, this.clean(val).value);
		}
	
	}

/*
Manages preferences on the options page
*/
Preferences = new function() {
	
	//relevant strings
	
	this.unsavedChanges = "You have unsaved changes - are you sure you want to close the Options tab?";
	this.notAllValid = "Some preferences were not valid and, consequently, not saved.";
	
	/*
	Holds all managed PreferenceView, indexed by preference name
	*/
	this.prefs = {};
	
	/*
	Call add using the pairs of values from obj as name: default
	*/
	this.addFromObject = function(obj, rules) {
		for(var i in obj) this.add(i, obj[i], rules[i]);
		}
	
	/*
	Add this preference to the options page, replacing a pointer if present, otherwise appending to masterContainer
	Pointers are elements with the id "pref_preferenceName"
	*/
	this.add = function(name, def, rule) {
		
		if(!this.prefs[name]) {
			
			var model = new PreferenceModel(name, def);
			var view = this.prefs[name] = new PreferenceView(model);
			//everything in the rule gets stuck onto the model
			for(var i in rule) model[i] = rule[i];
			
			var pointer = document.getElementById("pref_" + name);
			//title of pointer overrides title in rule
			if(pointer && pointer.hasAttribute("title")) {
				view.title = pointer.title;
				}
			
			view.make();
			view.load();
			view.checkChangedFromDefault();
			
			if(pointer) {
				pointer.parentNode.replaceChild(view.container, pointer);
				while(pointer.firstChild) {
					view.container.appendChild(pointer.firstChild);
					}
				}
			else {
				this.masterContainer.appendChild(view.container);
				}
			
			}
		
		}
	
	/*
	Call some function for each managed preference
	Function is passed the PreferenceView, the preference name, and all managed preferences
	If the function returns false, the loop stops
	*/
	this.forEachPref = function(func) {
		for(var i in this.prefs) if(func(this.prefs[i], i, this.prefs)===false) return false;
		}
	
	/*
	Save each managed preference if it has been changed and is valid
	Returns true if all preferences were valid, false otherwise
	*/
	this.save = function() {
		
		var allValid = true;
		this.forEachPref(function(e, i, a) {
			
			var val = e.value;
			var clean = e.clean(val);
			if(e.checkChanged(val, clean.value)) {
				if(e.validate(clean, val)) {
					e.save();
					//pref should not be considered changed now, view should reflect that
					e.checkChanged(val, clean.value);
					}
				else {
					allValid = false;
					}
				}
			//saved values are assumed to be valid
			else e.valid = true;
			
			e.checkChangedFromDefault(val, clean.value);
			
			});
			
		return allValid;
		
		}
		
	/*
	Returns true if any managed preference has been changed, false otherwise
	*/
	this.__defineGetter__("anyChanges", function() {
		var changes = false;
		this.forEachPref(function(e, i, a) {
			if(e.isChangedFrom(e.model.value)) {
				changes = true;
				return false;
				}
			});
		return changes;
		});
		
	/*
	If called with a number of milliseconds, set controlLog textContent to empty after that amount of time
	Otherwise, clear it immediately
	*/
	this.clearLog = function(time) {
		
		if(typeof time != "number") return this.controlLog.textContent = "";
		
		if(defined(this.logTimer)) clearTimeout(this.logTimer);
		this.logTimer = setTimeout(this.clearLog, time);
		
		}
	
	}

//holds caught preferences
prefsCatcher = {};

//catch calls to this previously imaginary function from defaults.js for use later
function pref(name, def) {
	prefsCatcher[name.substring(name.lastIndexOf(".")+1)] = def;
	}

	
window.onload = function(e) {
	
	//need to set this stuff up when the DOM is available
	
	Preferences.masterContainer = document.getElementById("uncategorizedPrefs");
	Preferences.saveButton = document.getElementById("saveButton");
	Preferences.closeButton = document.getElementById("closeButton");
	Preferences.controlLog = document.getElementById("controlLog");
	
	Preferences.addFromObject(prefsCatcher, rules);
		
	}

//validate whatever preference this input is from
function validateInputHandler(e) {
	var parent = getParentByClassName(e.target, "preference");
	if(parent && parent.id.slice(0,5)=="pref_") {
		var pref = Preferences.prefs[parent.id.substring(5)];
		if(pref) {
			var val = pref.value;
			var clean = pref.clean(val);
			pref.validate(clean, val);
			pref.checkChanged(val, clean.value);
			pref.checkChangedFromDefault(val, clean.value);
			}
		}
	}
	
document.addEventListener("keyup", validateInputHandler, true);
document.addEventListener("click", validateInputHandler, true);
document.addEventListener("change", validateInputHandler, true);

//handles all the buttons in the #control element
function controlButtonHandler(e) {
	
	if(e.target == Preferences.saveButton) {
		
		var allValid = Preferences.save();
		//if the preferences weren't all valid, warn the user
		if(!allValid) alert(Preferences.notAllValid);
		Preferences.controlLog.textContent = "Saved!";
		Preferences.clearLog(2000);
		
		}
	
	else if(e.target == Preferences.closeButton) {
		
		//warn the user about unsaved changes before closing the tab
		if(!Preferences.anyChanges ||
			confirm(Preferences.unsavedChanges)) {
				Preferences.confirmedClose = true;
				window.close();
			}
		
		}
	
	}
	
document.addEventListener("click", controlButtonHandler, true);

//warn the user about unsaved changes before unload
window.onbeforeunload = function(e) {
	if(!Preferences.confirmedClose) {
		if(Preferences.anyChanges) {
			if(e) e.returnValue = Preferences.unsavedChanges;
			return Preferences.unsavedChanges;
			}
		}
	else Preferences.confirmedClose = false;
	}

/*
All tabBoxes are controlled from here
A functional tabBox should have:
	a containing element with class "tabBox"
		if you want styling to be properly assigned, 
		it should also have class "horizontalTabs" or "verticalTabs"
	a nav element that is a descendant of the tabBox
	"tab selection" elements that are children of the nav element which also have a tab attribute (usually anchors)
	"tab content" elements that are children of the tabBox element which also have a tab attribute (usually sections)
	the tab attributes of the selection and content elements should correspond to each other
	
Clicking on a tab selection element will add the "selected" attribute to all tab content/selection elements which have a matching tab attribute,
and will remove the "selected" attribute from tab content/selection elements without a matching tab attribute

The default styling will make these selected elements visible, and unselected elements hidden

Additional tabBoxes can be nested within content elements without interfering with ones above it
*/
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
	
	//just using getChildrenBy to iterate over children, basically
	var sections = getChildrenBy(tabBox, setSelected);
	var tabs = getChildrenBy(tabNav, setSelected);
		
	e.preventDefault();
	
	}

document.addEventListener("click", tabHandler, true);