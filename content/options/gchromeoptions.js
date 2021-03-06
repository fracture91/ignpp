
//the localStorage on the options page is the same as on the background page
GM_API.localStorage = localStorage;

GM_API.expose();

//just checking in with the background page to make sure we receive setvalue updates
chrome.extension.sendRequest({type: "checkin"});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	
	if(request.type === undefined) return;

	switch(request.type.toLowerCase()) {
		
		case "setvalue":
			Preferences.setValueListener(request, sender, sendResponse);
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
	Add a command to parent or this.controls.
	*/
	_addCommand: function(name, parent) {
		if(!defined(parent)) {
			parent = this.controls;
			if(!defined(parent)) return;
			}
		var li = document.createElement("li");
		var a = document.createElement("a");
		a.textContent = PreferenceModel.prototype.camelToTitle(name);
		a.href = "";
		a.className = name + "Control";
		li.appendChild(a);
		parent.appendChild(li);
		},
	
	controlsTemplate: null,
	_makeControlsTemplate: function() {
		if(!this.controlsTemplate) {
			var ct = this.controlsTemplate = document.createElement("menu");
			ct.type = "toolbar";
			this._addCommand("save", ct);
			this._addCommand("revert", ct);
			this._addCommand("default", ct);
			}
		},
	
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
	See this.setValue.
	*/
	set value(v) {
		this.setValue(v);
		},
		
	/*
	Set the currently inputted value. The given value is cleaned beforehand and checked for changes.
	Will fireGenericChangeEvent for this pref's input with fromSetValue=true on the event.
	Returns the original value.
	*/
	setValue: function(val) {
		var clean = this.model.clean(val);
		if(this.model.type=="boolean") {
			this.input.checked = clean.value;
			}
		else this.input.value = clean.value;
		
		//since it has been cleaned...
		this.valid = true;
		this.errors = {};
		
		this.checkNewValue(val, clean.value);
		
		/*This would trigger the change listener for this pref,
		which would validate and checkNewValue again for no reason.
		However, adding fromSetValue to the event guards against this.*/
		this.inputEvents.fireGenericChangeEvent(this.input, {fromSetValue: true});
		return val;
		},
		
	inputEvents: new InputEvents(true),
		
	/*
	This is called when this.setValue is called to make sure view classes are up to date
	*/
	checkNewValue: function(val, cleanVal) {
		if(!defined(val)) val = this.value;
		if(!defined(cleanVal)) cleanVal = this.model.clean(val).value;
		this.checkChanged(val, cleanVal);
		this.checkChangedFromDefault(val, cleanVal);
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
	Should be called when the user may have changed the input.
	Will validate input and checkChanged/FromDefault if event.fromSetValue is not true.
	*/
	onInput: function(e) {
		if(!e.fromSetValue && e.target == this.input) {
			var val = this.value;
			var clean = this.clean(val);
			this.validate(clean, val);
			this.checkNewValue(val, clean.value);
			}
		},
		
	/*
	Save the currently inputted value to the model
	*/
	save: function() {
		
		var rv = {changed: null, valid: null};
		var val = this.value;
		var clean = this.clean(val);
		if(rv.changed = this.checkChanged(val, clean.value)) {
			if(rv.valid = this.validate(clean, val)) {
				this.model.value = val;
				//pref should not be considered changed now, view should reflect that
				this.checkChanged(val, clean.value);
				}
			}
		//saved values are assumed to be valid
		else rv.valid = this.valid = true;
		
		this.checkChangedFromDefault(val, clean.value);
		return rv;
		
		},
		
	/*
	Load the currently inputted value from the model.
	Returns true if loaded, false if not because it wasn't changed.
	*/
	load: function() {
		if(this.checkChanged()) {
			this.value = this.model.value;
			return true;
			}
		this.checkChangedFromDefault();
		return false;
		},
		
	/*
	Load the currently inputted value from the model's default.
	Returns true if loaded, false if not because it wasn't changed from default.
	*/
	loadFromDefault: function() {
		if(this.checkChangedFromDefault()) {
			this.value = this.model.def;
			return true;
			}
		this.checkChanged();
		return false;
		},
		
	/*
	Should be called when a control button may have been clicked.
	*/
	onControl: function(e) {
		var wasControl = true;
		switch(e.target) {
			case this.revertControl: this.load();
				break;
			case this.defaultControl: this.loadFromDefault();
				break;
			case this.saveControl: this.save();
				break;
			default: wasControl = false;
				break;
			}
		if(wasControl) {
			e.preventDefault();
			}
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
	Should be called when the saved value has been changed by some external force.
	Will change the currently inputted value to match the new one if it hasn't been changed already.
	Will check if the current value is changed from last saved if necessary.
	*/
	onSetValue: function(newVal) {
		if(!this.isChangedFromLastSaved()) {
			this.model.lastSavedValue = this.value = newVal;
			}
		else if(this.value == newVal) {
			//this is important, otherwise the pref will falsely appear to be changed
			this.checkChanged();
			}
		},
		
	/*
	Return true if this pref has been deliberately hidden.
	(is a child of an element of class "hidden" and has a computed hidden style)
	*/
	isHidden: function() {
		var parent = getParentByClassName(this.container, "hidden");
		return !!(parent && window.getComputedStyle(parent, null).getPropertyValue("display") == "none");
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
		
		this._makeControlsTemplate();
		this.controls = this.controlsTemplate.cloneNode(true);
		this.revertControl = getFirstByClassName(this.controls, "revertControl");
		this.defaultControl = getFirstByClassName(this.controls, "defaultControl");
		this.saveControl = getFirstByClassName(this.controls, "saveControl");
		
		if(Array.isArray(this.model.rules.selections)) {
			this.input = document.createElement("select");
			this.model.rules.selections.forEach(function(e, i, a) {
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
		else if(!this.model.rules.multiline) {
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
			
		if(this.model.rules.pattern instanceof RegExp) {
			this.input.pattern = this.model.rules.pattern.source;
			}
		if(typeof this.model.rules.min == "number") {
			this.input.min = this.model.rules.min;
			}
		if(typeof this.model.rules.max == "number") {
			this.input.max = this.model.rules.max;
			}
		if(typeof this.model.rules.step == "number") {
			this.input.step = this.model.rules.step;
			}
		if(typeof this.model.rules.maxLength == "number") {
			this.input.maxLength = this.model.rules.maxLength;
			}
			
		this.errorOutput = document.createElement("ul");
		this.errorOutput.className = "errors";
		
		this.container.appendChild(this.label);
		this.container.appendChild(this.controls);
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
Given the preference's name (as used in GM_(s/g)etValue), its default value, and optional rules.
The preference is assumed to only be able to hold values of the same type as its default value
*/
PreferenceModel = function(name, def, rules) {
	
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
	Rules let you define what's acceptable for this preference.
	A view can use them to make smarter decisions about the interface/interaction.
	The model will use them for input sanitization.
	*/
	this.rules = typeof rules == "object" ? rules : {};
	
		//supported rules:
		
		/*
		Minimum and maximum values for numbers.
		*/
		//this.max;
		//this.min;
		
		/*
		Numbers must be a multiple of the step.
		*/
		//this.step;
		
		/*
		A regular expression the pref must match.
		*/
		//this.pattern;
		
		/*
		An array of selections for select inputs.
		*/
		//this.selections;
		
		/*
		True if this preference is a string that accepts multiline input, false otherwise
		*/
		//this.multiline = false;
		
		/*
		A maximum length for strings.
		*/
		//this.maxLength;
		
		/*
		A function that consumes a value and returns an error message if there 
		is an error, false otherwise.
		*/
		//this.customErrorFunc;
	
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
	clean: function(val, type) {
		
		if(!defined(val)) val = this.value;
		if(!defined(type)) type = this.type;
		
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
				if(!this.rules.multiline) val = val.replace("\n", "");
				break;
			default:
				rv.errors.unrecognizedType = type;
				return rv;
			}
		
		var cerr;
		
		if(this.rangeOverflow(val)) {
			val = rv.errors.rangeOverflow = this.rules.max;
			}
		if(this.rangeUnderflow(val)) {
			val = rv.errors.rangeUnderflow = this.rules.min;
			}
		if(this.stepMismatch(val)) {
			val = this.roundNearest(val, rv.errors.stepMismatch = this.rules.step);
			}
		if(this.tooLong(val)) {
			val = val.substr(0, rv.errors.tooLong = this.rules.maxLength);
			}
		if(this.patternMismatch(val)) {
			val = this.def;
			rv.errors.patternMismatch = this.rules.pattern;
			}
		if(this.selectionMismatch(val)) {
			val = this.def;
			rv.errors.selectionMismatch = this.rules.selections;
			}
		if(cerr = this.customError(val)) {
			val = this.def;
			rv.errors.customError = cerr;
			}
		
		rv.value = val;
		
		return rv;
		
		},
	
	/*
	The next few functions return booleans about whether the given value
	is valid for this model's rules, similar to the DOM ValidityState interface.
	*/
	
	rangeOverflow: function(val) {
		if(!defined(val)) val = this.value;
		return typeof this.rules.max == "number" && val > this.rules.max;
	},
	
	rangeUnderflow: function(val) {
		if(!defined(val)) val = this.value;
		return typeof this.rules.min == "number" && val < this.rules.min;
	},
	
	stepMismatch: function(val) {
		if(!defined(val)) val = this.value;
		return typeof this.rules.step == "number" && val % this.rules.step != 0;
	},
	
	tooLong: function(val) {
		if(!defined(val)) val = this.value;
		return typeof this.rules.maxLength == "number" && val.length > this.rules.maxLength;
	},
	
	patternMismatch: function(val) {
		if(!defined(val)) val = this.value;
		return this.rules.pattern instanceof RegExp && !val.match(this.rules.pattern);
	},
	
	selectionMismatch: function(val) {
		if(!defined(val)) val = this.value;
		return Array.isArray(this.rules.selections) && 
			!this.rules.selections.some(function(e, i, a) {
				return e == val || Array.isArray(e) && e[1] == val;
				}, this);
	},
	
	/*
	Returns the custom error string if there is an error, false otherwise.
	*/
	customError: function(val) {
		if(!defined(val)) val = this.value;
		if(typeof this.rules.customErrorFunc == "function") {
			return this.rules.customErrorFunc(val);
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
Manages PreferenceViews on the options page
*/
PreferenceViewManager = function(output) {
	
	/*
	Holds all managed PreferenceView, indexed by preference name
	*/
	this.prefs = {};
	
	/*
	The OutputArea associated with this manager.
	*/
	this.output = output;
	
	this.masterContainer = document.getElementById("uncategorizedPrefs");
	this.saveButton = document.getElementById("saveButton");
	this.revertButton = document.getElementById("revertButton");
	this.defaultButton = document.getElementById("defaultButton");
	this.closeButton = document.getElementById("closeButton");
	this.hiddenToggle = document.getElementById("hiddenToggle");
	
	this._prefsAreHidden = true;
	
	}
	
PreferenceViewManager.prototype = {
	
	//relevant strings
	strings: {
		unsavedChanges: "You have unsaved changes - are you sure you want to close the Options tab?",
		afterSave: "All changes saved!",
		revertChanges: "Are you sure you want to revert all preferences to their last saved state?",
		afterRevert: "All changes reverted!",
		revertToDefault: "Are you sure you want to revert all preferences to their default state?",
		afterDefault: "All defaults restored (but not saved)!",
		noUnsavedChanges: "You have no unsaved changes.",
		allDefault: "All preferences are already in their default state.",
		notAllValid: "Some preferences were not valid and, consequently, not saved."
		},
		
	inputEvents: new InputEvents(true),
	
	/*
	Call add using the pairs of values from obj as name: default
	*/
	addFromObject: function(obj, rules) {
		for(var i in obj) this.add(i, obj[i], rules[i]);
		},
	
	/*
	Add this preference to the options page, replacing a pointer if present, otherwise appending to masterContainer
	Pointers are elements with the id "pref_preferenceName"
	*/
	add: function(name, def, rules) {
		
		if(!this.prefs[name]) {
			
			var model = new PreferenceModel(name, def, rules);
			var view = this.prefs[name] = new PreferenceView(model);
			
			var pointer = document.getElementById("pref_" + name);
			//title of pointer overrides title in rule
			if(pointer && pointer.hasAttribute("title")) {
				view.title = pointer.title;
				}
			
			view.make();
			view.load();
			
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
		
		},
		
	/*
	Given an element, get the preference associated with it.
	*/
	get: function(el) {
		var parent = hasClass(el, "preference") ? el : getParentByClassName(el, "preference");
		if(parent && parent.id.slice(0,5)=="pref_") {
			var pref = this.prefs[parent.id.substring(5)];
			if(pref) return pref;
			}
		return null
		},
	
	/*
	Call some function for each managed preference
	Function is passed the PreferenceView, the preference name, and all managed preferences
	If the function returns false, the loop stops
	*/
	forEachPref: function(func) {
		for(var i in this.prefs) if(func(this.prefs[i], i, this.prefs)===false) return false;
		},
	
	/*
	Basically shorthand for this pattern:
	function doSomethingALot() {
		var all = false;	//<-- def
		this.forEachPref(function(e, i, a) {
			//do something	//<-- func
			all = true;		//<-- func().allVal or func()
			return false;	//<-- func().returnVal
			});
		return all;
		}
	func().allVal must be different from def to change all
	if func().allVal is undefined, all will not change
	if func().returnVal is undefined, the loop will not stop
	*/
	delegate: function(func, def) {
		var all = def = defined(def) ? def : true;
		//the function passed to forEachPref is all about handling the return value of func
		this.forEachPref(function(e, i, a) {
			var rv = func(e, i, a), isObj = typeof rv == "object", allVal;
			
			if(isObj) {
				allVal = defined(rv.allVal) ? rv.allVal : def;
				}
			else {
				allVal = defined(rv) ? !!rv : def;
				}
			
			if(allVal != def) {
				all = allVal;
				}
				
			if(isObj && defined(rv.returnVal)) {
				return rv.returnVal;
				}
			});
		return all;
		},
	
	/*
	Save each managed preference if it has been changed and is valid
	Returns true if all non-hidden preferences were valid, false otherwise
	*/
	save: function() {
		return this.delegate(function(e, i, a) {
			if(!e.isHidden() && !e.save().valid) return false;
			}, true);
		},
		
	/*
	Load each managed preference if it has been changed.
	Returns true if all non-hidden prefs were loaded, false otherwise.
	*/
	load: function() {
		return this.delegate(function(e, i, a) {
			if(!e.isHidden() && !e.load()) return false;
			}, true);
		},
		
	/*
	Load each managed preference from default if it has been changed from default.
	Returns true if all non-hidden prefs were loaded, false otherwise.
	*/
	loadFromDefault: function() {
		return this.delegate(function(e, i, a) {
			if(!e.isHidden() && !e.loadFromDefault()) return false;
			}, true);
		},
	
	/*
	if pref.isChangedFrom(oldValFunc(e, i, a)) is true for any managed non-hidden pref, return true.
	*/
	anyChangesFrom: function(oldValFunc) {
		return this.delegate(function(e, i, a) {
			if(e.isChangedFrom(oldValFunc(e, i, a)) && !e.isHidden()) {
				return {allVal: true, returnVal: false};
				}
			}, false);
		},
	
	/*
	Returns true if any managed preference has been changed, false otherwise
	*/
	get anyChanges() {
		return this.anyChangesFrom(function(e, i, a) {
			return e.model.value;
			});
		},
		
	/*
	Returns true if any managed preference has been changed from default, false otherwise
	*/
	get anyChangesFromDefault() {
		return this.anyChangesFrom(function(e, i, a) {
			return e.model.def;
			});
		},
		
	/*
	Just like target.addEventListener(types, func, useCapture) except:
		func is a string that represents the name of the method to call (this[func])
		inside func, this refers to this instance instead of target or window
		types can be an array of types for each of which the listener will be added
	*/
	addMyListener: function(target, types, func, useCapture) {
		if(!Array.isArray(types)) types = [types];
		func = this[func];
		var that = this;
		var listener = function(e){ return func.apply(that, [e]); };
		for(var i=0, len=types.length; i<len; i++) {
			target.addEventListener(types[i], listener, useCapture);
			}
		},
		
	/*
	An array of arrays of arguments to be passed to addMyListener when addListeners is called
	*/
	listeners: [
		[document, ["keyup","change","input"], "validateInputListener", true],
		[document, "click", "controlButtonListener", true],
		[document, "click", "mainControlButtonListener", true],
		[window, "beforeunload", "beforeUnloadListener", true],
		[document, "click", "hiddenToggleListener", true]
		],
		
	/*
	Add all event listeners described by this.listeners
	*/
	addListeners: function() {
		for(var i=0, len=this.listeners.length; i<len; i++) {
			var tlis = this.listeners[i];
			this.addMyListener(tlis[0], tlis[1], tlis[2], tlis[4]/*todo: 4 a bug?*/);
			}
		},
	
	/*
	Validate whatever preference this input is from
	*/
	validateInputListener: function(e) {
		/*For performance reasons, only validate if the event type is relevant.
		This function should be called for input, change, and keyup.*/
		var relevantEvents = this.inputEvents.getChangeEvents(e.target);
		if(relevantEvents.indexOf(e.type) != -1) {
			var pref = this.get(e.target);
			if(pref) return pref.onInput(e);
			}
		},
		
	/*
	Handle the control buttons for individual preferences
	*/
	controlButtonListener: function(e) {
		var pref = this.get(e.target);
		if(pref) return pref.onControl(e);
		},
	
	/*
	Handles all the buttons in the #control element
	*/
	mainControlButtonListener: function(e) {
		
		switch(e.target) {
			case this.saveButton:
				if(this.anyChanges) {
					if(this.save()) {
						this.output.inform(this.strings.afterSave, "goodChange");
						}
					//if the preferences weren't all valid, warn the user
					else this.output.inform(this.strings.notAllValid, "badChange", 3000);
					}
				else this.output.inform(this.strings.noUnsavedChanges);
				break;
			
			case this.revertButton:
				if(this.anyChanges) {
					var that = this;
					this.output.confirm(this.strings.revertChanges, undefined, false,
						function(button) {
							if(button == "OK") {
								that.load();
								that.output.inform(that.strings.afterRevert, "goodChange");
								return true;
								}
						});
					}
				else this.output.inform(this.strings.noUnsavedChanges);
				break;
			
			case this.defaultButton:
				if(this.anyChangesFromDefault) {
					var that = this;
					this.output.confirm(this.strings.revertToDefault, undefined, false,
						function(button) {
							if(button == "OK") {
								that.loadFromDefault();
								that.output.inform(that.strings.afterDefault, "goodChange");
								return true;
								}
						});
					}
				else this.output.inform(this.strings.allDefault);
				break;
		
			case this.closeButton:
				/*beforeunload listener should catch this and
				warn the user about unsaved changes before closing the tab*/
				window.close();
				break;
			}
		
		},
		
	/*
	Warn the user about unsaved changes before unload
	*/
	beforeUnloadListener: function(e) {
		if(this.anyChanges) {
			return e.returnValue = this.strings.unsavedChanges;
			}
		},
	
	/*
	Toggle hidden-ness of hidden prefs.
	*/
	toggleHiddenPrefs: function() {
		var hiddens = document.getElementsByClassName("hidden");
		if(!hiddens) return;
		var className = "notReallyHidden";
		for(var i=0, len=hiddens.length; i<len; i++) {
			if(this._prefsAreHidden) {
				addClass(hiddens[i], className);
				this.hiddenToggle.value = "Hide Hidden Preferences";
				}
			else {
				removeClass(hiddens[i], className);
				this.hiddenToggle.value = "Show Hidden Preferences";
				}
			}
		this._prefsAreHidden = !this._prefsAreHidden;
		},
	
	hiddenToggleListener: function(e) {
		if(e.target == this.hiddenToggle) this.toggleHiddenPrefs();
		},
	
	/*
	Change value of respective input if not already changed by user.
	Should be called via chrome.extension.onRequest.addListener .
	*/
	setValueListener: function(request, sender, sendResponse) {
		var pref = this.prefs[request.name];
		var newVal = JSON.parse(request.jsonValue);
		if(!pref) {
			/*the pref will be added to the page, but will not show up next time
			unless a default is added to defaults.js*/
			pref = this.add(request.name, newVal);
			}
		else pref.onSetValue(newVal);
		}
	
	}


/*
Class for interacting with some area that displays a message
and optionally requests input from the user with buttons.
Basically a replacement for alert/confirm pop-ups.
area should be a form element.
*/
OutputArea = function(area) {
	this.area = area;
	this.buttons = [];
	this.message;
	this._currentOutput = {};
	this.addMyListener(this.area, "submit", "submitListener", true);
	this.addMyListener(this.area, "click", "clickListener", true);
	}

OutputArea.prototype = {

	getCurrentOutput: function() {
		return this._currentOutput;
		},
	
	/*
	Displays whatever output object is given.
	Only submitListener should touch lastValue.
	Returns true if everything went well and output wasn't blocked via ignoreOthers.
	Supported output properties:
		message - The message to display
		className - A className to apply to the form
		ignoreOthers - Prevent other outputs from closing this one
		buttons - Array of strings to make buttons out of
		onClose
			function called when the output is closed for whatever reason
			is passed the button value that was clicked, or null if no buttons were clicked
			must return true if the function will set output again itself
		onDisplay
			function called after output has been displayed
	*/
	setCurrentOutput: function(output, lastValue) {
		if(!this._currentOutput.ignoreOthers || defined(lastValue)) {
			var dontBother = false;
			if(typeof this._currentOutput.onClose == "function") {
				dontBother = this._currentOutput.onClose(defined(lastValue) ? lastValue : null);
				}
			if(!dontBother) {
				this._currentOutput = output==null ? {} : output;
				this.renderCurrentOutput();
				}
			return true;
			}
		else return false;
		},
	
	/*
	Draw everything on the screen for the current output.
	Calls output.onDisplay when done.
	*/
	renderCurrentOutput: function() {
		
		while(this.area.firstChild) {
			this.area.removeChild(this.area.firstChild);
			}
			
		this.area.className = "";
		
		//output must have a message
		if(typeof this._currentOutput.message == "string") {
			this.message = document.createElement("p");
			this.message.textContent = this._currentOutput.message;
			
			if(typeof this._currentOutput.className == "string") {
				this.area.className = this._currentOutput.className;
				}
			
			this.area.appendChild(this.message);
			
			this.buttons = [];
			if(this._currentOutput.buttons) {
				for(var i=0, len=this._currentOutput.buttons.length; i<len; i++) {
					this.buttons[i] = document.createElement("input");
					this.buttons[i].type = "submit";
					this.buttons[i].value = this._currentOutput.buttons[i];
					this.area.appendChild(this.buttons[i]);
					}
				this.buttons[0].focus();
				}
				
			if(typeof this._currentOutput.onDisplay == "function") {
				this._currentOutput.onDisplay();
				}
			}
			
		},
		
	submitListener: function(e) {
		e.preventDefault();
		this.setCurrentOutput(null, this.lastButtonClicked.value);
		},
		
	clickListener: function(e) {
		this.lastButtonClicked = this.buttons.indexOf(e.target) != -1 ? e.target : null;
		},
		
	/*
	Show some message in the output area for a certain amount of time.
	Call the onClose callback when output is closed.
	*/
	inform: function(message, className, time, onClose) {
		
		time = (typeof time == "number" ? time : 2500);
		var that = this;
		return this.setCurrentOutput({
			message: message,
			className: className,
			time: time,
			onClose: function(button) {
				clearTimeout(that._currentOutput.timeID);
				if(typeof callback == "function") {
					callback(button);
					}
				},
			onDisplay: function() {
				//only want to start the timer if successfully displayed
				that._currentOutput.timeID = setTimeout(function() {
					that.setCurrentOutput(null);
					}, time);
				}
			});
		
		},

	/*
	Like inform, but user must press "OK" to make output go away.
	If ignoreOthers is true, all other methods that make use of the OutputArea are ignored.
	*/
	alert: function(message, className, ignoreOthers, onClose) {
		
		return this.setCurrentOutput({
			message: message,
			className: className,
			buttons: ["OK"],
			ignoreOthers: ignoreOthers,
			onClose: onClose
			});
		
		},
		
	/*
	Like alert, but user can choose "OK" or "Cancel".
	*/
	confirm: function(message, className, ignoreOthers, onClose) {
		
		return this.setCurrentOutput({
			message: message,
			className: className,
			buttons: ["OK", "Cancel"],
			ignoreOthers: ignoreOthers,
			onClose: onClose
			});
		
		},
		
	addMyListener: PreferenceViewManager.prototype.addMyListener

	}
	
	
//holds caught preferences
prefsCatcher = {};

//catch calls to this previously imaginary function from defaults.js for use later
function pref(name, def) {
	prefsCatcher[name.substring(name.lastIndexOf(".")+1)] = def;
	}

window.addEventListener("load", function(e) {
	//need to set this stuff up when the document is loaded
	var output = new OutputArea(document.getElementById("controlOutput"));
	window.Preferences = new PreferenceViewManager(output);
	Preferences.addFromObject(prefsCatcher, rules);
	Preferences.addListeners();
	vestitools_style.isChrome = true;
	Preferences.usercolorController = new usercolorController(true);
	Preferences.usercolorController.init({
		color: Preferences.prefs.UCcolor.input, 
		bgcolor: Preferences.prefs.UCbgcolor.input,
		bordercolor: Preferences.prefs.UCbordercolor.input,
		weight: Preferences.prefs.UCweight.input,
		style: Preferences.prefs.UCstyle.input,
		decoration: Preferences.prefs.UCdecoration.input
		},
		{
		get: "getButton",
		post: "postButton",
		refresh: "refreshButton",
		},
		"username", Preferences.prefs.applyUsercolors.input);
	
	/*
	We need to override these methods so they're called on the background page, 
	since they depend on the state of background's particular instance.
	*/
	var vtsOverrides = 
		["applyColors", "getColors", "postColors", "refreshColors", "defaultGetColorsCallback",
		"defaultPostColorsCallback", "defaultRefreshColorsCallback"];
		
	vtsOverrides.forEach(function(e, i, a){
		GM_API.remoteOverride("vestitools_style." + e);
		});
	
	}, true);



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
function tabListener(e) {
	
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
	
	function setSelected(el, i) {
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

document.addEventListener("click", tabListener, true);