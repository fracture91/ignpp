
// vestitools_PrefManager
Components.utils.import("resource://modules/prefman.js");
// vestitools_style
Components.utils.import("resource://modules/style.js");


function GM_setValue(name, val) {
	return vestitools_PrefManager.setValue(name, val);
	}
	
function GM_getValue(name, def) {
	return vestitools_PrefManager.getValue(name, def);
	}

//not implemented as of FF 3.6
function GM_resetValue(name) {
	return vestitools_PrefManager.reset(name);
	}
	
function GM_deleteValue(name) {
	return vestitools_PrefManager.remove(name);
	}

var Options = new function() {

	var inputIds = {
		color: "colorField", 
		bgcolor: "bgcolorField",
		bordercolor: "bordercolorField",
		weight: "weightSelect",
		style: "styleSelect",
		decoration: "decorationSelect"
		}
	
	//just a convenient alias
	var styleElements = vestitools_style.styleElements;
	
	//and another
	this.validateStyle = function(type, style) {
		return vestitools_style.validateStyle(type, style);
		}
	
	/*
	Return a styles object corresponding to the current input.
	Does not validate, but works off of vestitools_style.styleElements.
	*/
	this.getStylesInput = function() {
		var styles = {};
		for(var i in vestitools_style.styleElements)
			styles[i] = document.getElementById(inputIds[i]).value;
		return styles;
		}
	
	/*
	Set the current input so it corresponds with the given styles object.
	Does not validate!
	Will also call updateColorPreviews.
	*/
	this.setStylesInput = function(styles) {
		for(var i in inputIds) 
			document.getElementById(inputIds[i]).value = styles[i] + "";
		this.updateColorPreviews();
		}
	
	/*
	Set the usercolor preview so it displays what's in the given styles object.
	Validates styles object before displaying.
	Returns styles.
	*/
	this.setPreview = function(styles) {
	
		styles = vestitools_style.validateStyles(styles);
		var username = document.getElementById("username");
		var us = username.style;	
		
		function handleDash(m, s1) {
			return s1 ? s1.toUpperCase() : "";
			}
		
		for(var i in styleElements) {
			
			var thisStyle = styles[i];
			var isNull = thisStyle==null;
			//change the CSS property to the DOM property (background-color -> backgroundColor)
			var prop = styleElements[i].prop.replace(/-([a-z])?/gi, handleDash);
			
			if(!isNull) {
				var borderPrefix = i=="bordercolor" ? "1px solid " : "";
				var colorPrefix = vestitools_style.colorStyleExp.test(i) ? "#" : "";
				us[prop] = borderPrefix + colorPrefix + thisStyle;
				}
			else {
				us[prop] = null;
				}
			
			}
			
		return styles;
		
		}
	
	/*
	Sets the usercolor preview so it displays what's currently inputted.
	Returns styles that the current input represents.
	*/
	this.updatePreview = function() {
		return this.setPreview(this.getStylesInput());
		}
	
	/*
	Get main usercolors list from the server and save/apply.
	Button log is updated to indicate status of the request (including errors).
	*/
	this.refreshColors = function(e) {
		
		document.getElementById("refreshButton").parentNode.getElementsByClassName("log")[0].value = 
				"Getting all colors from the server...";

		vestitools_style.getColors(function(xhr, success) {

			vestitools_style.colorsObject = JSON.parse(xhr.responseText);
			vestitools_style.synchronizeColors();
			vestitools_style.setLastUsercolorCheck();

			document.getElementById("refreshButton").parentNode.getElementsByClassName("log")[0].value = 
				success ? "All colors successfully found, saved, and applied." : ("Server error: " + xhr.responseText);
			});
			
		}
	
	/*
	Get personal usercolors from the server and save them.
	If colors couldn't be found, default colors will be used (but not saved).
	Button log is updated to indicate status of the request (including errors).
	*/
	this.getColors = function(e) {
		
		document.getElementById("getButton").parentNode.getElementsByClassName("log")[0].value = 
				"Getting your colors from the server...";
		
		var t = this;
		var getRv = vestitools_style.getColors(GM_getValue("username", "unknown"), function(xhr, success, styles) {
			
			t.setStylesInput(styles);
			
			if(success) {
				//save styles as user's usercolors
				vestitools_style.saveStyles(styles);
				}
			
			document.getElementById("getButton").parentNode.getElementsByClassName("log")[0].value = 
				success ? "Personal colors successfully found and saved." :
							"No personal colors found on the server (" + xhr.responseText + "), using defaults.";
			
			t.updatePreview();
			
			});
			
		if(getRv < 0) {
			document.getElementById("getButton").parentNode.getElementsByClassName("log")[0].value = 
				"getColors error: " + getRv;
			}
		
		}
	
	/*
	Post colors to the server and save them if posting was successful.
	Also update and apply our local stylesheet with the changes (without hitting the server again).
	Button log is updated to indicate status of the request (including errors).
	*/
	this.postColors = function(e) {
		
		var styles = this.getStylesInput();
		var username = GM_getValue("username", "unknown");
		
		document.getElementById("postButton").parentNode.getElementsByClassName("log")[0].value = 
				"Posting colors to the server...";
		
		//this will handle validation of styles as well
		var postRv = vestitools_style.postColors(username, styles, function(xhr, success) {
				document.getElementById("postButton").parentNode.getElementsByClassName("log")[0].value = 
					success ? "Colors successfully posted." : ("Server error: " + xhr.responseText);
				
				if(success) {
					/*
					assume that the server handled everything correctly and the colors will now show up on the main list
					update our local list and style to reflect assumed changes
					this is better than just refreshing normally because in that case you might just get a cached copy
					which doesn't reflect your changes and often makes people think the post didn't go through
					*/
					vestitools_style.setUserStyles(username, styles);
					vestitools_style.synchronizeColors();
					vestitools_style.saveStyles(styles);
					//don't setLastUsercolorCheck though, since this wasn't a true refresh
					}
				
				});
		
		//set the inputs to the now-validated values
		this.setStylesInput(styles);
		
		if(postRv < 0) {
			document.getElementById("postButton").parentNode.getElementsByClassName("log")[0].value = 
				"postColors error: " + postRv;
			}
		
		}
	
	/*
	Change the value of applyUsercolors to val, and call applyUsercolors to apply or get rid of them
	(depending on what applyUsercolors was set to).
	*/
	this.setApplyUsercolors = function(val) {
		GM_setValue("applyUsercolors", !!val);
		vestitools_style.applyColors();
		}
	
	/*
	Listens for events from the color inputs, updates the input's preview and the usercolor preview.
	*/
	this.colorInputListener = function(e) {

		var myid = e.target.id;

		switch(myid) {
			case "colorField":
			case "bgcolorField":
			case "bordercolorField":
				this.updatePreview();
				this.updateColorPreview(e.target);
				break;
			}

		}
	
	/*
	Changes the background color of the field's parent to match the inputted color.
	Input is validated.
	*/
	this.updateColorPreview = function(field) {
		var myid = field.id;
		var value = vestitools_style.validateStyle(myid.slice(0, myid.indexOf("Field")), field.value);
		field.parentNode.style.backgroundColor = value!=null ? "#" + value : null;
		}
	
	/*
	Calls updateColorPreview for each color input.
	*/
	this.updateColorPreviews = function() {
		for(var i in inputIds)
			if(vestitools_style.colorStyleExp.test(i))
				this.updateColorPreview(document.getElementById(inputIds[i]));
		}
	
	/*
	Listens for keyboard events from the manual ignore field.
	If user pressed enter, validates the username and adds/removes to the ignore list as necessary.
	Value of the field changes to indicate what happened, and will be cleared on the next event.
	*/
	this.ignoreListFieldListener = function(e) {
		
		var evt = e.target;
		
		if(e.which==13) {
			
			var list = document.getElementById("ignoreListField");
			
			if(evt.id && evt.id=="manualIgnoreField" && list) {
				
				e.preventDefault();
				
				var arr=[], target=0;
				
				if(vestitools_style.validateUsername(evt.value)) {
				
					if((target=(arr=list.value.split(',')).indexOf(evt.value))==-1 && evt.value) {
						arr[0]=='' ? arr=[evt.value] : arr.push(evt.value);
						list.value = arr.toString();
						evt.value = "<Added>";
						}
					else if(evt.value) {
						arr.splice(target,1);
						list.value = arr.toString();
						evt.value = "<Removed>";
						}
					
					}
				else evt.value = "<Invalid>";
				
				}
			
			}
			
		else if(evt.id && evt.id=="manualIgnoreField") {
				
			switch(evt.value) {
				
				case "<Added>":
				case "<Removed>":
				case "<Invalid>":
					evt.value='';
					break;
				
				}
			
			}
			
		
		}
	
	/*
	Listens for mouse events from the ignore list erase button.
	Will ask the user if they're sure they want to erase before actually erasing.
	*/
	this.ignoreListEraseListener = function(e) {
		
		var evt = e.target;
		
		if(e.which==1 && evt.id) {
			
			if(evt.id=="manualIgnoreField" && (evt.value=="Add/Remove" || evt.value=="Added." || evt.value=="Removed.")) evt.value = '';
			
			else if(evt.id=="eraseIgnoreListButton") {
				
				if(evt.label=="Erase List" || evt.label=="Erased.") evt.label = "You sure?";
			
				else if(evt.label=="You sure?") {
					
					GM_setValue("ignoreList", "");
					document.getElementById("ignoreListField").value="";
					evt.label = "Erased.";
					
					}
				
				}
			
			}
		
		}
	
	/*
	Lists user's preferences in the list prefs field.
	*/
	this.listPrefs = function(e) {
		
		var list = vestitools_PrefManager.list();
		var dumpTo = document.getElementById("listPrefsField");
		var string = "";
		
		for(var i=0, len=list.length; i<len; i++) 
			string += list[i] + "\n\t" + GM_getValue(list[i], "default") + "\n";
			
		dumpTo.value = string;
		
		}
	
	/*
	Listens for mouse events from the restore defaults button.
	Asks the user if they're sure they want to restore before it actually does.
	Note that the functionality required by GM_resetValue wasn't implemented as of Firefox 3.6.
	*/
	this.restoreDefaultsListener = function(e) {
		
		var evt = e.target;
		
		if(e.which==1) {
				
			if(evt.label=="Restore Defaults" || evt.label=="Done.") evt.label = "You sure?";
			else { 
				var works=true;
				try{ GM_resetValue(""); } //reset all
				catch(e){ works=false; }
				
				if(works) {
					evt.label = "Done."; 
					document.documentElement.cancelDialog();
					}
				else evt.label = "Not Implemented!";
				}
			
			}
		
		}
	
	}
	

/*
This is called from the xul file onload.
Sets up event listeners, some default values, etc.
*/
function initOptions() {
	
	//make the username preview show the user's username
	username = document.getElementById("username");
	username.value = GM_getValue("username", "unknown");
	
	/*
	I have to wrap the handlers like this because just using Options.method
	would lead to a this value bounded to event.target
	*/
	
	document.addEventListener("keydown", function(e){ Options.ignoreListFieldListener(e) }, true);
	document.addEventListener("click", function(e){ Options.ignoreListEraseListener(e) }, true);
	
	function wrappedUpdatePreview(e) { Options.updatePreview(e); }
	document.getElementById("weightSelect").addEventListener("command", wrappedUpdatePreview, false);
	document.getElementById("styleSelect").addEventListener("command", wrappedUpdatePreview, false);
	document.getElementById("decorationSelect").addEventListener("command", wrappedUpdatePreview, false);
	
	document.addEventListener("keyup", function(e){ Options.colorInputListener(e) }, true);
	
	document.getElementById("getButton").addEventListener("command", function(e){ Options.getColors(e) }, false);
	document.getElementById("refreshButton").addEventListener("command", function(e){ Options.refreshColors(e) }, false);
	document.getElementById("postButton").addEventListener("command", function(e){ Options.postColors(e) }, false);
	
	document.getElementById("applyUsercolorsField").addEventListener("command", function(e) {
		Options.setApplyUsercolors(e.target.checked);
		}, false);
	
	document.getElementById("listPrefsButton").addEventListener("command", function(e){ Options.listPrefs(e) }, false);
	
	document.documentElement.getButton("extra1").addEventListener("click", function(e){ Options.restoreDefaultsListener(e) }, false);
	
	//usercolors should be loaded into inputs - make sure preview reflects this
	Options.updatePreview();
	Options.updateColorPreviews();
	
	}

/*
This is called from the xul file ondialogaccept.
*/
function dialogAccept(e) {
	
	//for some reason, the default behavior doesn't save this field unless
	//you type in it directly
	//if you just use the add/remove input, it will not save changes
	var list = document.getElementById("ignoreListField");
	if(list) GM_setValue("ignoreList", list.value);
	
	}