
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

var Options = new function() {

	this.init = function() {
		this.usercolorController.init({
			color: "colorField", 
			bgcolor: "bgcolorField",
			bordercolor: "bordercolorField",
			weight: "weightSelect",
			style: "styleSelect",
			decoration: "decorationSelect"
			},
			{
			get: "getButton",
			post: "postButton",
			refresh: "refreshButton",
			},
			"username", "applyUsercolorsField");
			
		document.addEventListener("keydown", function(e){ Options.ignoreListFieldListener(e) }, true);
		document.addEventListener("click", function(e){ Options.ignoreListEraseListener(e) }, true);
		document.getElementById("listPrefsButton").addEventListener("command", function(e){ Options.listPrefs(e) }, false);
		document.documentElement.getButton("extra1").addEventListener("click", function(e){ Options.restoreDefaultsListener(e) }, false);
		}

	this.usercolorController = new usercolorController(false);
	
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
*/
function onLoad() {
	Options.init();
	}

/*
This is called from the xul file ondialogaccept.
*/
function onDialogAccept(e) {
	
	//for some reason, the default behavior doesn't save this field unless
	//you type in it directly
	//if you just use the add/remove input, it will not save changes
	var list = document.getElementById("ignoreListField");
	if(list) GM_setValue("ignoreList", list.value);
	
	}