
function usercolorController(isChrome) {
	
	/*
	All elements used to get a user's style.
	This should be set in this.init, and look like the following.
	*/
	this.inputs = {
		color: null, 
		bgcolor: null,
		bordercolor: null,
		weight: null,
		style: null,
		decoration: null
		}
	
	/*
	All control buttons.
	*/
	this.buttons = {
		get: null,
		post: null,
		refresh: null
		}
	
	/*
	The element which displays the username and a preview of usercolors.
	*/
	this.preview = null;
	
	/*
	The applyUsercolors checkbox.
	*/
	this.apply = null;
	
	/*
	True if on Chrome, false otherwise.
	*/
	this.isChrome = isChrome;
	
	}
	
usercolorController.prototype = {
	
	/*
	Initialize the usercolorController.
	inputs, buttons, preview, and apply all set the respective properties on this instance.
	If an element is a string, it is taken to be the ID of an element.
	Could also use PreferenceViews for these arguments instead.
	*/
	init: function(inputs, buttons, preview, apply) {
		this.preview = this.getElementFromString(preview);
		this.apply = this.getElementFromString(apply);
		this.inputs = this.getElementsFromStrings(inputs);
		this.buttons = this.getElementsFromStrings(buttons);
			
		//make the username preview show the user's username
		this.setContent(this.preview, GM_getValue("username", "unknown"));
			
		this.addEventListeners();
		//usercolors should be loaded into inputs - make sure preview reflects this
		this.updatePreview();
		this.updateColorPreviews();
		},
		
	/*
	Add all necessary event listeners - should only be called after this.inputs is properly initialized.
	*/
	addEventListeners: function() {
		//add listeners for updating previews when input changes
		var that = this;
		for(var i in this.inputs) {
			var listener = (function(type) {
				return function(e) {
					that.onInputChange(type);
					}
				})(i);
				
			var input = this.inputs[i];
			var types = this.getChangeEvents(input);
			
			for(var j=0, len=types.length; j<len; j++) {
				input.addEventListener(types[j], listener, false);
				}
			}
		
		//add listeners for buttons
		for(var i in this.buttons) {
			var listener = (function(type) {
				return function(e) {
					that[type + "Colors"](e);
					}
				})(i);
			this.buttons[i].addEventListener(this.isChrome ? "click" : "command", listener, false);
			}
		
		//listener for when applyUsercolors changes, so we can toggle it in real time
		this.apply.addEventListener(this.getChangeEvents(this.apply)[0], function(e) {
			that.setApplyUsercolors(e.target.checked);
			}, false);
		},
	
	/*
	For each value in obj that is a string, set corresponding key to getElementById(string).
	*/
	getElementsFromStrings: function(obj) {
		for(var i in obj) {
			obj[i] = this.getElementFromString(obj[i]);
			}
		return obj;
		},
		
	/*
	If obj is a string, return getElementById(string), otherwise return obj.
	*/
	getElementFromString: function(obj) {
		if(typeof obj == "string") {
			obj = document.getElementById(obj);
			}
		return obj;
		},
	
	/*
	Just a convenient alias.
	*/
	get styleElements() {
		return vestitools_style.styleElements;
		},
	
	/*
	Another alias.
	*/
	validateStyle: function(type, style) {
		return vestitools_style.validateStyle(type, style);
		},
	
	/*
	Return a styles object corresponding to the current input.
	Does not validate, but works off of vestitools_style.styleElements.
	*/
	getStylesInput: function() {
		var styles = {};
		for(var i in this.styleElements)
			styles[i] = this.inputs[i].value;
		return styles;
		},
	
	/*
	Set the current input so it corresponds with the given styles object.
	Does not validate!
	Will fireGenericChangeEvent for each input, which should trigger preview updates.
	*/
	setStylesInput: function(styles) {
		for(var i in this.inputs) {
			var input = this.inputs[i];
			input.value = vestitools_style.toPrefString(i, styles[i]);
			this.fireGenericChangeEvent(input);
			}
		},
	
	/*
	Set the usercolor preview so it displays what's in the given styles object.
	Validates styles object before displaying.
	Returns validated styles.
	*/
	setPreview: function(styles) {
	
		styles = vestitools_style.validateStyles(styles);
		var pstyle = this.preview.style;	
		
		function handleDash(m, s1) {
			return s1 ? s1.toUpperCase() : "";
			}
		
		for(var i in this.styleElements) {
			
			var thisStyle = styles[i];
			//change the CSS property to the DOM property (background-color -> backgroundColor)
			var prop = this.styleElements[i].prop.replace(/-([a-z])?/gi, handleDash);
			
			if(thisStyle!=null) {
				var borderPrefix = i=="bordercolor" ? "1px solid " : "";
				var colorPrefix = vestitools_style.colorStyleExp.test(i) ? "#" : "";
				pstyle[prop] = borderPrefix + colorPrefix + thisStyle;
				}
			else {
				pstyle[prop] = null;
				}
			
			}
			
		return styles;
		
		},
	
	/*
	Sets the usercolor preview so it displays what's currently inputted.
	Returns styles that the current input represents.
	*/
	updatePreview: function() {
		return this.setPreview(this.getStylesInput());
		},
	
	/*
	Set the content of the given element.
	On Chrome, this will set el.textContent.
	On Firefox, this will set el.value.
	*/
	setContent: function(el, content) {
		el[this.isChrome ? "textContent" : "value"] = content;
		},
	
	/*
	Given a button type, log a message in its log area.
	*/
	buttonLog: function(type, msg) {
		var log = this.buttons[type].parentNode.getElementsByClassName("log")[0];
		if(log) {
			this.setContent(log, msg);
			}
		},
	
	/*
	Returns an error message listing xhr.status and xhr.responseText.
	*/
	XHRErrorMessage: function(xhr) {
		return "Error. Status: " + xhr.status + " Response: " + xhr.responseText;
		},
	
	/*
	Get main usercolors list from the server and save/apply.
	Button log is updated to indicate status of the request (including errors).
	*/
	refreshColors: function(e) {
		this.buttonLog("refresh", "Getting all colors from the server...");

		var that = this;
		vestitools_style.getColors(undefined, function(xhr, success) {
			vestitools_style.defaultRefreshColorsCallback(xhr, success);
			that.buttonLog("refresh", 
				success ? "All colors successfully found, saved, and applied." : that.XHRErrorMessage(xhr));
			});
		},
	
	/*
	Get personal usercolors from the server and save them.
	If colors couldn't be found, default colors will be used (but not saved).
	Button log is updated to indicate status of the request (including errors).
	*/
	getColors: function(e) {
		this.buttonLog("get", "Getting your colors from the server...");
		
		var that = this;
		vestitools_style.getColors(GM_getValue("username", "unknown"), function(xhr, success, styles) {
			vestitools_style.defaultGetColorsCallback(xhr, success, styles);
			
			var msg = "Personal colors successfully found and saved.";
			if(!success) {
				if(xhr.responseText == "null" || xhr.responseText == "false") {
					msg = "No personal colors found on the server (" + xhr.responseText + "), using defaults.";
					}
				else {
					msg = that.XHRErrorMessage(xhr);
					}
				}
			
			that.buttonLog("get", msg);
			if(success) {
				that.setStylesInput(styles);
				}
			});
		},
	
	/*
	Post colors to the server and save them if posting was successful.
	Also update and apply our local stylesheet with the changes (without hitting the server again).
	Button log is updated to indicate status of the request (including errors).
	*/
	postColors: function(e) {
		var styles = this.getStylesInput();
		var username = GM_getValue("username", "unknown");
		
		this.buttonLog("post", "Posting colors to the server...");
		
		//this will handle validation of styles as well
		var that = this;
		vestitools_style.postColors(username, styles, function(xhr, success, username, styles) {
				that.buttonLog("post", success ? "Colors successfully posted and saved." : that.XHRErrorMessage(xhr));
				vestitools_style.defaultPostColorsCallback(xhr, success, username, styles);
				//set the inputs to the now-validated values
				if(success) {
					that.setStylesInput(styles);
					}
				});
		
		
		},
		
	/*
	Fire an event of the given type on some element.
	*/
	fireEvent: function(type, el) {
		var createArg = "Event";
		if(type.match(/change/)) {
			createArg = "HTMLEvents";
			}
			
		var event = el.ownerDocument.createEvent(createArg);
		event.initEvent(type, true, true);
		return el.dispatchEvent(event);
		},
		
	/*
	Given an element, return an array of strings of event names
	which must be listened to in order to detect any change in that element.
	isChrome will override this.isChrome.
	*/
	getChangeEvents: function(el, isChrome) {
		if(typeof isChrome == "undefined") {
			isChrome = this.isChrome;
			}
		var tagName = el.tagName.toLowerCase();
		switch(tagName) {
			case "textarea":
			case "textbox":
			case "input":
				if(tagName != "input" || el.type != "checkbox") {
					return ["input"];
					}
				//else fallthrough
			case "checkbox":
				return isChrome ? ["change"] : ["command"];
			case "select":
			case "menulist":
				return isChrome ? ["change", "keyup"] : ["command"];
			}
		return [];
		},
		
	/*
	This will fire some event to indicate a change in the given element.
	Different elements require different events, and they can vary with browser in use.
	*/
	fireGenericChangeEvent: function(el, isChrome) {
		/*Since we should be listening for all events returned by getChangeEvents,
		firing just the first one should work.*/
		this.fireEvent(this.getChangeEvents(el, isChrome)[0], el);
		},
	
	/*
	Change the value of applyUsercolors to val, and call applyUsercolors to apply or get rid of them
	(depending on what applyUsercolors was set to).
	*/
	setApplyUsercolors: function(val) {
		GM_setValue("applyUsercolors", !!val);
		vestitools_style.applyColors();
		},
	
	/*
	Should be called when an input of the given type may have changed.
	Will call this.updateColorPreview if necessary, then this.updatePreview.
	*/
	onInputChange: function(type) {
		if(vestitools_style.colorStyleExp.test(type)) {
			this.updateColorPreview(type);
			}
		this.updatePreview();
		},
	
	/*
	Changes the background color of this.inputs[type] to match the inputted color.
	Input is validated.
	*/
	updateColorPreview: function(type) {
		var input = this.inputs[type];
		var value = this.validateStyle(type, input.value);
		input.parentNode.style.backgroundColor = value!=null ? "#" + value : null;
		},
	
	/*
	Calls updateColorPreview for each color input.
	*/
	updateColorPreviews: function() {
		for(var i in this.inputs)
			if(vestitools_style.colorStyleExp.test(i))
				this.updateColorPreview(i);
		}
	
	}