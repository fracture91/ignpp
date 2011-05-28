
// vestitools_PrefManager
Components.utils.import("resource://vestitools/prefman.js");
// vestitools_style
Components.utils.import("resource://vestitools/style.js");


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

var defaultColors = ["#000099", "transparent", "transparent"];

var ids = ["colorField", "bgcolorField", "bordercolorField", "weightSelect", "styleSelect", "decorationSelect"];

function isValidColor(color) {
	return (typeof color == "string") && (/^[\da-f]{6}$/i.test(color));
	}

function validateColor(color, i) {
	return isValidColor(color) ? "#" + color : defaultColors[i];
	}
	
function updatePreview() {

	var username = document.getElementById("username");
	
	var us = username.style;
	
	us.color = document.getElementById("colorField").parentNode.style.backgroundColor = validateColor(document.getElementById("colorField").value, 0);
	us.backgroundColor = document.getElementById("bgcolorField").parentNode.style.backgroundColor = validateColor(document.getElementById("bgcolorField").value, 1);
	us.borderColor = document.getElementById("bordercolorField").parentNode.style.backgroundColor = validateColor(document.getElementById("bordercolorField").value, 2);
	us.fontWeight = document.getElementById("weightSelect").selectedItem.value;
	us.fontStyle = document.getElementById("styleSelect").selectedItem.value;
	us.textDecoration = document.getElementById("decorationSelect").selectedItem.value;
	
	}
	
function refreshColors(e) {

	document.getElementById("refreshButton").parentNode.getElementsByClassName("log")[0].value = 
			"Getting all colors from the server...";
	
	vestitools_style.getColors(function(d) {
		document.getElementById("refreshButton").parentNode.getElementsByClassName("log")[0].value = 
			"All colors successfully found, saved, and applied.";
		});
		
	}
	
function initOptions() {
	
	username = document.getElementById("username");
	username.value = GM_getValue("username", "unknown");
	
	document.addEventListener("keydown", function(e) {
		
		var evt = e.target;
		
		if(e.which==13) {
			
			var list = document.getElementById("ignoreListField");
			
			if(evt.id && evt.id=="manualIgnoreField" && list) {
				
				e.preventDefault();
				
				var arr=[], target=0;
				
				if(evt.value.search(/[\s!@#$%&*[()+={}|;:'"<,>?\/~`\\\^\]]/i) == -1) {
				
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
			
		
		}, true);
		
	document.addEventListener("click", function(e) {
		
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
		
		}, true);
		
	document.getElementById("weightSelect").addEventListener('command', updatePreview, false);
	document.getElementById("styleSelect").addEventListener('command', updatePreview, false);
	document.getElementById("decorationSelect").addEventListener('command', updatePreview, false);
		
	document.addEventListener('keyup', function(event) {

		var myid = event.target.id;

		switch(myid) {
			case "colorField":
			case "bgcolorField":
			case "bordercolorField":
				updatePreview();
				break;
			}

		}, true);
		
	document.getElementById("getButton").addEventListener("command", function(e) {
		
		document.getElementById("getButton").parentNode.getElementsByClassName("log")[0].value = 
				"Getting your colors from the server...";
		
		vestitools_style.getColors(GM_getValue("username", "unknown"), function(d, uArray) {

			for(var i=0, len=ids.length; i<len; i++) {
				thisu = uArray[i];
				if(i<3) document.getElementById(ids[i]).value = isValidColor(thisu) ? thisu : "";
				else document.getElementById(ids[i]).selectedIndex = 
					(thisu=="normal") || (thisu=="none") ? 0 : 
					(thisu=="bold") || (thisu=="italic") || (thisu=="overline") ? 1 :
					(thisu=="underline") ? 2 :
					(thisu=="line-through") ? 3 :
					(thisu=="null") && (i==3) ? 1 : 0;
				}
				
			document.getElementById("getButton").parentNode.getElementsByClassName("log")[0].value = 
				(uArray.length > 6) ? "You have no colors on the server, using defaults." :
										"Colors successfully found and saved.";
				
			updatePreview();
			
			});
		
		}, false);
		
	document.getElementById("refreshButton").addEventListener("command", refreshColors, false);
		
	document.getElementById("postButton").addEventListener("command", function(e) {
		
		document.getElementById("postButton").parentNode.getElementsByClassName("log")[0].value = 
				"Posting colors to the server...";
		
		var u = "";
		
		vestitools_style.postColors(GM_getValue("username", "unknown"), 
			[
			isValidColor(u = document.getElementById("colorField").value) ? u : "null",
			isValidColor(u = document.getElementById("bgcolorField").value) ? u : "null",
			isValidColor(u = document.getElementById("bordercolorField").value) ? u : "null",
			document.getElementById("weightSelect").selectedItem.value,
			document.getElementById("styleSelect").selectedItem.value,
			document.getElementById("decorationSelect").selectedItem.value,
			], 
			function(d) {
				var fail = !!d.responseText.match(/false/);
				document.getElementById("postButton").parentNode.getElementsByClassName("log")[0].value = 
					!fail ? "Colors successfully posted." : "Server error.";
				refreshColors(e);
				}
			);
		
		}, false);
		
	document.getElementById("applyUsercolorsField").addEventListener("command", function(e) {
		
		GM_setValue("applyUsercolors", e.target.checked);
		vestitools_style.applyColors();
		
		}, false);
		
	document.getElementById("listPrefsButton").addEventListener("command", function(e) {
		
		var list = vestitools_PrefManager.list();
		var dumpTo = document.getElementById("listPrefsField");
		var string = "";
		
		for(var i=0, len=list.length; i<len; i++) 
			string += list[i] + "\n\t" + GM_getValue(list[i], "default") + "\n";
			
		dumpTo.value = string;
		
		}, false);
		
	document.documentElement.getButton("extra1").addEventListener("click", function(e) {
		
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
		
		}, false);
		
	updatePreview();
	
	}
	
function dialogAccept(e) {
	
	//for some reason, the default behavior doesn't save this field unless
	//you type in it directly
	//if you just use the add/remove input, it will not save changes
	var list = document.getElementById("ignoreListField");
	if(list) GM_setValue("ignoreList", list.value);
	
	}