// vestitools_PrefManager singleton
Components.utils.import("resource://modules/prefman.js");
// vestitools_files singleton
Components.utils.import("resource://modules/files.js");

var EXPORTED_SYMBOLS = ["vestitools_style"];

var vestitools_style = new function vt_Style() {

	var Cc = Components.classes;

	//XPCOM stuff we need for adding stylesheets
	var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
				.getService(Components.interfaces.nsIStyleSheetService);
	var ios = Cc["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);
	
	this.colorsFileUri = "chrome://vestitools/skin/usercolors.css";
	this.objectFileUri = "chrome://vestitools/skin/usercolors.json";
	this.mainFileUri = "chrome://vestitools/skin/main.css";
	
	//defaulted to undefined to indicate object has not been read from disk
	//JSON.parse can't handle undefined, so we'll never get that value from the file
	var _colorsObject = undefined;
	
	this.__defineGetter__("colorsObject", function() {
		
		if(typeof _colorsObject == "undefined") {
			var theFile = vestitools_files.readFile(this.objectFileUri);
			//if something went wrong reading the file, default the object to an empty array
			if(theFile === null) {
				_colorsObject = [];
				}
			else _colorsObject = JSON.parse(theFile);
			}
			
		return _colorsObject;
		
		});
	
	//no validation, doesn't save to disk(!)
	this.__defineSetter__("colorsObject", function(o) {
		_colorsObject = o;
		});
		
	this.saveColorsObject = function() {
		//stringify here will add some spacing so the file's pretty
		//this will increase filesize a bit, but I think it's worth it for anyone who happens to read it
		return vestitools_files.writeFile(JSON.stringify(this.colorsObject, null, " "), this.objectFileUri);
		}
	
	//because file contents can change, we need to keep track of the data: uri so we can successfully
	//unregister/re-register a changed stylesheet
	var colorsDataUri = null;
	var mainDataUri = null;
	
	var GM_setValue = function(name, val) {
		return vestitools_PrefManager.setValue(name, val);
		}
		
	var GM_getValue = function(name, def) {
		return vestitools_PrefManager.getValue(name, def);
		}
		
	var xhrHeaders = function(xhr, headers) {
		for(i in headers) {
			xhr.setRequestHeader(i, headers[i]);
			}
		}

	//in hours
	this.updateFrequency = 12;
		
	//if colors haven't been updated in x hours update the file
	//apply usercolor stylesheet to browser
	this.checkColorsAndApply = function(timeForce) {
		
		var beenUpdated = false;
		
		if(GM_getValue("applyUsercolors", true)) {

			var currentTime = Math.floor((new Date()).getTime() / 3600000);
			//Number of hours since January 1, 1970

			//if if hasn't been updated in x hours, update it
			if(timeForce || ((currentTime - GM_getValue("lastUsercolorCheck", 0)) >= this.updateFrequency)) {
				
				this.getColors();
				beenUpdated = true;
				
				}
			
			}
			
		if(!beenUpdated) this.applyColors();
		
		return beenUpdated;
		
		}

	//apply the main.css stylesheet to the browser
	this.applyMain = function() {
	
		var temp = vestitools_files.readFile(this.mainFileUri);
		//google chrome doesn't support the -moz-document-domain thing, so it has to be added in here
		//also need to fix chrome-extension URIs
		if(temp) mainDataUri = ios.newURI(
		"data:text/css,@-moz-document domain(boards.ign.com), domain(betaboards.ign.com), domain(forums.ign.com) { " +
		temp.replace(/\n/g, "%0A")
			.replace(/chrome-extension:\/\//g, "chrome://")
			//chrome has a bug where extension id isn't replaced, so I have to hardcode it for now...ugh
			//http://code.google.com/p/chromium/issues/detail?id=39899
			.replace(/neccigeidlomkjogomjkjpeapgojbodn|mhopcnahlbanfaniphbpeaoggmofanhf|__MSG_@@extension_id__/g, "vestitools")
			.replace(/vestitools\/skin\/default/g, "vestitools/skin") +
		" }",
		null, null);
		else return 0; //file wasn't read correctly
		
		//if it's not registered already, load and register it
		//agent_sheet is less safe, but we need it to control button appearance for some reason
		if(!sss.sheetRegistered(mainDataUri, sss.AGENT_SHEET))
			return sss.loadAndRegisterSheet(mainDataUri, sss.AGENT_SHEET);

			
		}
		
	//uses colorsDataUri to keep track of the data URL of the last installed style
	//instead of the chrome URI
	//"data:text/css,body{color:purple;}or whatever"
		
	//if force is true, the style will always be unregistered if it's already registered
	//and then registered if appropriate (for when refreshing usercolors.css)
	this.applyColors = function(force) {
		
		var oldSheet = colorsDataUri != null;
		var oldSheetReg = oldSheet ? sss.sheetRegistered(colorsDataUri, sss.USER_SHEET) : false;
		
		if(	force && oldSheetReg || 
			(oldSheetReg && !GM_getValue("applyUsercolors", true)) ) {
			
			sss.unregisterSheet(colorsDataUri, sss.USER_SHEET);
			
			}
		
		if(	GM_getValue("applyUsercolors", true) && 
			(!oldSheet || (force && oldSheetReg) || !sss.sheetRegistered(colorsDataUri, sss.USER_SHEET)) ) {
			
			var temp = vestitools_files.readFile(this.colorsFileUri);
			if(temp) colorsDataUri = ios.newURI("data:text/css," + temp.replace(/\n/g, "%0A"), null, null);
			else return 0; //file wasn't read correctly
			sss.loadAndRegisterSheet(colorsDataUri, sss.USER_SHEET);
			
			}
			
		return 1;
		
		}
		
	//post the usercolors in uArray as the colors of the user with the given name
	//save colors and call callback if xhr goes through
	this.postColors = function(name, uArray, callback) {
		
		if(!name || !uArray || uArray.length < 6) return -1;
		
		if(typeof callback != "function") callback = function(d) {};
		
		var _data = "username=" + name + 
					"&color=" + uArray[0] + 
					"&bgcolor=" + uArray[1] + 
					"&bordercolor=" + uArray[2] + 
					"&weight=" + uArray[3] + 
					"&style=" + uArray[4] + 
					"&decoration=" + uArray[5];
					
		var t = this;
		
		xhr = (typeof XMLHttpRequest == "undefined") ? Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]  
									.createInstance(Components.interfaces.nsIXMLHttpRequest) : new XMLHttpRequest();
		xhr.open("POST", "http://derekdev.com/mozilla/ignbq/submitcolors.php", true);
		xhrHeaders(xhr, {'Content-Type': 'application/x-www-form-urlencoded'});
		xhr.onreadystatechange = function() {
			if(xhr.readyState==4 && xhr.status==200) {
				t.saveColors(uArray);
				callback(xhr);
				}
			}
			
		xhr.send(_data);
			
		return 0;
		
		}
		
	//both parameters are optional
	//if given a username, the function will find the colors for that user and save them
	//if not given a username, the function will get the entire usercolor list and write it to usercolors.css
	this.getColors = function(name, callback) {
		
		if((typeof name == "function") && (typeof callback != "function")) {
			callback = name;
			name = null;
			}
		else if((typeof name == "string") && (typeof callback != "function")) callback = function(d, u){};
		else if((typeof name != "string") && (typeof callback != "function")) {
			callback = function(d){};
			name = null;
			}
		
		var t = this;
		
		xhr = (typeof XMLHttpRequest == "undefined") ? Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]  
									.createInstance(Components.interfaces.nsIXMLHttpRequest) : new XMLHttpRequest();
		xhr.open("GET", 
					(name ? "http://derekdev.com/mozilla/ignbq/getcolors.php?username=" + name : 'http://derekdev.com/mozilla/ignbq/colors.new.php'),
					true);
					
		xhrHeaders(xhr, {"Pragma": "no-cache",
						"Cache-Control": "no-cache"});
						
		xhr.onreadystatechange = function() {
			if(xhr.readyState==4 && xhr.status==200) {
				
				if(!name) {
					//var usercolorStyle = t.correctColors(xhr.responseText);
					t.colorsObject = JSON.parse(xhr.responseText);
					var usercolorStyle = t.createStyle(t.colorsObject);
					
					if(t.saveColorsObject() == 1) {
						//only write to the colors file if saving was successful
						vestitools_files.writeFile(usercolorStyle, t.colorsFileUri);
					
						//Security: If we got bad data, a naughty stylesheet could be added that, for example, hides the body of every page
						//however, that can be fixed by simply disabling the extension or turning off usercolors
						//and this is a pretty trusted location we're getting colors from
						//parsing from JSON will also validate things, so this is pretty much impossible to do
						t.applyColors(true);
						GM_setValue("lastUsercolorCheck", Math.floor((new Date()).getTime() / 3600000));
						}
					
					callback(xhr);
					
					}
				else {
					colors = t.parseColors(xhr.responseText);
					t.saveColors(colors);
					callback(xhr, colors);
					}
				
				}
			};
		xhr.send(null);
		
		return 0;
		
		}
	
	var validUsernameExp = /^[\w.\-]{3,20}$/i;
	var validColorExp = /^[\da-f]{6}$/i;
	var styleElements = {
		color: {prop: "color", exp: validColorExp},
		bgcolor: {prop: "background-color", exp: validColorExp},
		bordercolor: {prop: "border", exp: validColorExp},
		weight: {prop: "font-weight", exp: /^(normal|bold)$/i},
		style: {prop: "font-style", exp: /^(normal|italic)$/i},
		decoration: {prop: "text-decoration", exp: /^(underline|overline|line\-through)$/i}
		};
	
	var mozDocument = '@-moz-document domain(boards.ign.com), domain(betaboards.ign.com),\ndomain(vnboards.ign.com), domain(forums.ign.com) {\n'
	
	var profileLinkUrl = "http://club.ign.com/b/about?username=";
	var peopleLinkUrl = "http://people.ign.com/";
	
	var profileLinkSelector = ['a', '[href^="', profileLinkUrl, 'unknown', '"]'];
	var peopleLinkSelector = profileLinkSelector.slice(0); //copy array
	peopleLinkSelector[2] = peopleLinkUrl;
	peopleLinkSelector[1] = '[href="';
	var linkSelectorUsernameLoc = 3;
	
	var importantEnding = " !important;\n";
	
	/*
	return a string of css that obj (intended to be this.colorsObject) represents
	intended to end up in usercolors.css
	all data used from obj is validated
	*/
	this.createStyle = function(obj) {
		
		/*
		Since we're probably handling hundreds of users, we're going to push substrings into
		this array and join the array into a string at the end, rather than performing tons of
		concatenations all over.  This should be much faster.
		*/
		var buf = [];
		
		function selectorPusher(e, i) {
			//push the username where "unknown" would be located
			if(i==linkSelectorUsernameLoc && validUsernameExp.test(e)) {
				buf.push(user.username);
				}
			else buf.push(e);
			}
		
		buf.push(mozDocument);
		
		//the object should be an array of users
		for(var i=0, len=obj.length; i<len; i++) {
			
			var user = obj[i];
			var normalWeight = false;
			
			profileLinkSelector.forEach(selectorPusher);
				
			if(GM_getValue("showUsercolorsPeopleLinks", false)) {
				buf.push(",\n");
				peopleLinkSelector.forEach(selectorPusher);
				}
				
			buf.push(" {\n");
			
			var styles = user.styles;
			if(styles) {
				
				for(var j in styleElements) {
					//Validate the style.  If valid, push into buf.
					if(typeof styles[j] == "string" && styleElements[j].exp.test(styles[j])) {
						buf.push(styleElements[j].prop, ": ");
						if(j == "bordercolor") buf.push("1px solid ");
						if(/color|bgcolor|bordercolor/.test(j)) buf.push("#"); //push hash for colors
						buf.push(styles[j], importantEnding);
						}
					}
				
				}
				
			buf.push("}\n");
			
			//todo: normal weight
			
			}
			
		buf.push("}\n"); //end of @-moz-document
			
		return buf.join("");
		
		}
	
	//change a few things in the style so it's formatted correctly
	this.correctColors = function(text) {
		
		text = text.replace("-moz-outline: 2px outset black;", " ") //no ugly outline
					.replace(/a\.AuthorLink/g, "a") //apply to all links
					.replace("domain(vnboards.ign.com)", "domain(vnboards.ign.com), domain(betaboards.ign.com), domain(forums.ign.com)") //apply to more domains
					//many anchor elements contain a bold element that forces usernames to be bold
					//for colors that are font-weight:normal, add another rule after that forces the b element to inherit font weight
					.replace(/(a\[href\^="http:\/\/club\.ign\.com\/b\/about\?username=([^"]*)"],[^}]*font\-weight:normal[^}]*})/gim,
					'$1 a[href^="http://club.ign.com/b/about?username=$2"] > b, a[href^="/ASP/admin/userportal.asp?usr=$2"] > b { font-weight:inherit !important; }');
		
		if(GM_getValue("showUsercolorsPeopleLinks", false)) {
		
			//color people.ign.com links as well
			text = text.replace(/(a\[href\^="http:\/\/club\.ign\.com\/b\/about\?username=([^"]*)"]( > b)?,)/gi,
					'$1 a[href="http://people.ign.com/$2"]$3,');
			
			}
					
		return text.replace(/(\{|\}|\;|\,)/g, "$1\n"); //add line breaks so the file's pretty
					
		
		}
		
	this.saveColors = function(uArray) {
		
		prefs = ["UCcolor", "UCbgcolor", "UCbordercolor", "UCweight", "UCstyle", "UCdecoration"];
		
		for(var i=0, len=prefs.length; i<len; i++)
			if(uArray[i].length < 100) //since the colors may be gotten from an untrusted place, limit length of prefs to prevent bulky prefs.js file
				GM_setValue(prefs[i], uArray[i]);
		
		}
		
	//construct uArray from getColors for single user response
	this.parseColors = function(text) {
		
		//new Array('f8f8f8', '6a758d', 'f8f8f8', 'bold', 'normal', 'overline');
		//null
		
		//if the user doesn't have any colors, add an extra element so the caller knows
		if(text=="null") return ["", "", "", "bold", "normal", "none", 0];
		
		text = text.replace("new Array(", "")
				.replace(");", "")
				.replace(/\'/g, "")
				.replace(/\, /g, ",");
				
		return text.split(",");
		
		}
		
		
	};