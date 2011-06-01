
try {
	// vestitools_PrefManager singleton
	Components.utils.import("resource://vestitools/prefman.js");
	// vestitools_files singleton
	Components.utils.import("resource://vestitools/files.js");
	}
catch(e) {
	//you're probably on Google Chrome
	}

var EXPORTED_SYMBOLS = ["vestitools_style"];

/*
A bunch of stuff for working with stylesheets and usercolors.
*/
var vestitools_style = new function vt_Style() {
	
	this.colorsFileUri = "profile://usercolors.css";
	this.objectFileUri = "profile://usercolors.json";
	this.mainFileUri = "extension://skin/main.css";
	
	this.colorsListUrl = "http://derekdev.com/mozilla/ignbq/colors.new.php";
	this.colorsUserUrl = "http://derekdev.com/mozilla/ignbq/getcolors.php?JSON&username=";
	this.colorsSubmitUrl = "http://derekdev.com/mozilla/ignbq/submitcolors.php";
	
	/*
	true if this module is being used by Google Chrome.
	Set by this.init()
	*/
	this.chrome = false;
	
	/*
	Frequency to update usercolors at, in hours.
	*/
	this.updateFrequency = 12;
	
	/*
	Holds a native representation of the usercolor list.
	
	Defaulted to undefined to indicate object has not been read from disk
	JSON.parse can't handle undefined, so we'll never get that value from the file
	*/
	var _colorsObject = undefined;
	
	/*
	_colorsObject will look something like this, as should the response from the server in getColors()
	null styles indicate that the user has not set them, so we should use the default
	[{
		"username": "yab",
		"styles": {
			"color": "FFFFFF",
			"bgcolor": "000000",
			"bordercolor": "FF0000",
			"weight": null,
			"style": "normal",
			"decoration": "none"
		}
	},
	... (more users)
	]
	*/
	
	//init should be called before this is used!
	this.__defineGetter__("colorsObject", function() {
		if(typeof _colorsObject == "undefined") {
			//if init wasn't called for some reason
			_colorsObject = [];
			}
		return _colorsObject;
		});
	
	//doesn't save to disk(!)
	this.__defineSetter__("colorsObject", function(o) {
		_colorsObject = this.validateUsers(o);
		});
	
	
	//because file contents can change, we need to keep track of the data: uri so we can successfully
	//unregister/re-register a changed stylesheet
	var colorsDataUri = null;
	var mainDataUri = null;
	
	/*
	True if usercolor stylesheet on Google Chrome is currently applied, false otherwise.
	*/
	var gChromeColorsRegistered = false;
	
		
	try {
		var Cc = Components.classes;
		var Ci = Components.interfaces;
		//XPCOM stuff we need for adding stylesheets
		var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
					.getService(Ci.nsIStyleSheetService);
		var ios = Cc["@mozilla.org/network/io-service;1"]
					.getService(Ci.nsIIOService);
		}
	catch(e) {
		//chrome
		}
	
	var setTimeout, setInterval, GM_getValue, GM_setValue;
	if(typeof window == "undefined") {
		//In Firefox, window can't be accessed from modules, so we need to define setTimeout/Interval ourselves.
		setTimeout = function(func, time, isInterval) {
			var obs = {notify: func};
			var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
			timer.initWithCallback(obs, time,  Ci.nsITimer[isInterval ? "TYPE_REPEATING_SLACK" : "TYPE_ONE_SHOT"]);
			return timer;
			}
		setInterval = function(func, time) {
			return setTimeout(func, time, true);
			}
		
		//Google Chrome is responsible for providing its own get/setValue
		GM_setValue = function(name, val) {
			return vestitools_PrefManager.setValue(name, val);
			}
		GM_getValue = function(name, def) {
			return vestitools_PrefManager.getValue(name, def);
			}
		}
	else {
		//Google Chrome, we should have access to all of these
		setTimeout = window.setTimeout;
		setInterval = window.setInterval;
		GM_getValue = window.GM_getValue;
		GM_setValue = window.GM_setValue;
		}
	
	
	var xhrHeaders = function(xhr, headers) {
		for(i in headers) {
			xhr.setRequestHeader(i, headers[i]);
			}
		}
	
	
	/*
	Applies the main stylesheet, updates usercolors if necessary, and sets up future usercolor updates.
	Should be called on startup.
	If being called in Google Chrome, isChrome should be true.
	*/
	this.init = function(isChrome, callback) {
		if(typeof callback != "function") callback = function(){};
		this.chrome = isChrome;
		
		//apply the main stylesheet to userChrome
		if(!this.chrome) {
			this.applyMain();
			}
		
		var that = this;
		vestitools_files.readFile(this.objectFileUri, function(text) {
			(function(text) {
			
			try {
				this.colorsObject = JSON.parse(text);
				}
			catch(e) {
				//the file may have some kind of syntax error that makes JSON.parse freak out
				this.colorsObject = [];
				if(typeof console != "undefined") {
					console.log("IGN++ - vestitools_style.init colorsObject: " + e);
					}
				}
			
			/*
			Note that checkColorsAndApply's side effects are asynchronous
			on Google Chrome, but we don't really care right now.
			*/
			
			//apply usercolors, update if necessary
			var updated = this.checkColorsAndApply();
			
			//update colors every x hours while the browser is open
			if(!updated) {
				
				var that = this;
				setTimeout(function(){
					that.checkColorsAndApply(true);
					that.setUpColorInterval();
					}, ((this.updateFrequency + GM_getValue("lastUsercolorCheck", 0) - this.getTimeInHours()) * 3600000) );
					
				}
			else this.setUpColorInterval();
			
			callback();
			
			}).apply(that, [text]);
			});
		
		}
	
	/*
	Start updating usercolors every this.updateFrequency hours.
	*/
	this.setUpColorInterval = function() {
		var that = this;
		setInterval(function(){
			that.checkColorsAndApply(true)
			}, this.updateFrequency * 3600000);
		}
	
	/*
	Apply the stylesheet at mainFileUri to the browser.
	Google Chrome should never have to use this.
	*/
	this.applyMain = function() {
		if(this.chrome) throw new TypeError("Must be Firefox");
	
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
	
	/*	
	If colors haven't been updated in this.updateFrequency hours, update the file.
	Apply the usercolor stylesheet to the browser regardless.
	*/
	this.checkColorsAndApply = function(timeForce) {
		
		var beenUpdated = false;
		
		if(GM_getValue("applyUsercolors", true)) {

			var currentTime = this.getTimeInHours();
			//Number of hours since January 1, 1970

			//if if hasn't been updated in x hours, update it
			if(timeForce || ((currentTime - GM_getValue("lastUsercolorCheck", 0)) >= this.updateFrequency)) {
				
				var that = this;
				this.getColors(function(xhr, success){
					that.defaultRefreshColorsCallback(xhr, success);
					});
				beenUpdated = true;
				
				}
			
			}
			
		/*
		getColors will applyColors if beenUpdated, but it may fail.
		If getColors is successful, this is a bit wasteful, but I'd rather make sure the user can
		at least see their old usercolors.
		*/
		this.applyColors();
		
		return beenUpdated;
		
		}

	/*
	If the applyUsercolors pref is true, then apply the stylesheet, otherwise remove it.
	If force is true, the style will always be unregistered if it's already registered
	and then registered if appropriate (for when refreshing usercolors.css).
	
	Uses colorsDataUri to keep track of the data URL of the last installed style instead of the chrome URI.
	For example, "data:text/css,body{color:purple;}" or whatever.
	*/
	this.applyColors = function(force, callback) {
		if(typeof callback != "function") callback = function(){};
		
		var oldSheetReg, oldSheet = colorsDataUri != null;
		if(!this.chrome) {
			oldSheetReg = oldSheet && sss.sheetRegistered(colorsDataUri, sss.USER_SHEET);
			}
		else {
			oldSheetReg = oldSheet && gChromeColorsRegistered;
			}
		
		if(	force && oldSheetReg || 
			(oldSheetReg && !GM_getValue("applyUsercolors", true)) ) {
			
			if(!this.chrome) {
				sss.unregisterSheet(colorsDataUri, sss.USER_SHEET);
				}
			else {
				this.gChromeUnregisterColors();
				}
			
			}
		
		if(	GM_getValue("applyUsercolors", true) && 
			(!oldSheet || (force && oldSheetReg) || !sss.sheetRegistered(colorsDataUri, sss.USER_SHEET)) ) {
			
			var that = this;
			vestitools_files.readFile(this.colorsFileUri, function(text) {
				if(!that.chrome) {
					var data = "data:text/css," + text.replace(/\n/g, "%0A");
					colorsDataUri = ios.newURI(data, null, null);
					sss.loadAndRegisterSheet(colorsDataUri, sss.USER_SHEET);
					}
				else {
					that.gChromeRegisterColors(text);
					}
				callback();
				});
			
			}
		else callback();
			
		return 1;
		
		}
		
	this.getColorsData = function() {
		return colorsDataUri;
		}
		
	/*
	Tell each managed tab to remove its colors stylesheet.
	*/
	this.gChromeUnregisterColors = function() {
		if(!this.chrome) throw new TypeError("Must be Google Chrome.");
		managedTabs.forEach(function(e, i, a) {
			chrome.tabs.sendRequest(e.id, {type: "unregisterColors"});
			});
		gChromeColorsRegistered = false;
		}
		
	/*
	Tell each managed tab to add a colors stylesheet with the given CSS.
	*/
	this.gChromeRegisterColors = function(css) {
		if(!this.chrome) throw new TypeError("Must be Google Chrome.");
		colorsDataUri = css;
		managedTabs.forEach(function(e, i, a) {
			chrome.tabs.sendRequest(e.id, {type: "registerColors", value: colorsDataUri});
			});
		gChromeColorsRegistered = true;
		}
		
	/*
	Post the usercolors in styles object as the colors of the user with the given name.
	Call callback if xhr goes through.
	Styles is always validated.
	*/
	this.postColors = function(name, styles, callback) {
	
		styles = this.validateStyles(styles);
		
		name = this.validateUsername(name);
		if(!name) return -1;
		
		if(typeof callback != "function") callback = function(d) {};
		
		var _data = "username=" + name;
		//add the style fields and values to the data string
		for(var i in styles) {
			_data += "&" + i + "=" + styles[i];
			}
					
		var t = this;
		
		xhr = (typeof XMLHttpRequest == "undefined") ? Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]  
									.createInstance(Ci.nsIXMLHttpRequest) : new XMLHttpRequest();
		xhr.open("POST", this.colorsSubmitUrl, true);
		xhrHeaders(xhr, {'Content-Type': 'application/x-www-form-urlencoded'});
		xhr.onreadystatechange = function() {
			if(xhr.readyState==4 && xhr.status==200) {
				var success = !xhr.responseText.match(/^(null|false)$/i);
				callback(xhr, success);
				}
			}
			
		xhr.send(_data);
			
		return 0;
		
		}
		
	/*
	Set user's styles locally, synchronize colors, and save user's styles prefs.
	*/
	this.defaultPostColorsCallback = function(xhr, success, username, styles) {
		if(success) {
			/*
			assume that the server handled everything correctly and the colors will now show up on the main list
			update our local list and style to reflect assumed changes
			this is better than just refreshing normally because in that case you might just get a cached copy
			which doesn't reflect your changes and often makes people think the post didn't go through
			*/
			this.setUserStyles(username, styles);
			this.synchronizeColors();
			this.saveStyles(styles);
			//don't setLastUsercolorCheck though, since this wasn't a true refresh
			}
		}
	
	/*
	Returns the current time as hours passed since the epoch (floored).
	*/
	this.getTimeInHours = function() {
		return Math.floor((new Date()).getTime() / 3600000);
		}
	
	/*
	Set lastUsercolorCheck to the given time.
	If no time is given, set to the current time in hours (this.getTimeInHours).
	*/
	this.setLastUsercolorCheck = function(time) {
		return GM_setValue("lastUsercolorCheck", (typeof time != "number" ? this.getTimeInHours() : time));
		}
	
	/*
	Save colors object to disk, make a style out of it, write it to disk, and apply the new style.
	You'll want to call this after changing the colors object when you want the user to see changes
	(which they will assume are persistent, i.e. saved to disk).
	*/
	this.synchronizeColors = function(callback) {
		
		if(typeof callback != "function") callback = function(){};
		var usercolorStyle = this.createStyle(this.colorsObject);
		
		var that = this;
		this.saveColorsObject(function(success, error) {
			if(!success) { callback(); return; }
			//only write to the colors file and apply if saving object was successful
			vestitools_files.writeFile(that.colorsFileUri, usercolorStyle, function(success, error) {
				that.applyColors(true, callback);
				});
			});
		
		}
	
	/*
	Both parameters are optional.
	If given a username, the function will find the colors for that user.
	If not given a username, the function will get the entire usercolor list.
	Returns 0 if successful in sending the request, -1 if the name isn't valid (and was provided).
	*/
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
		
		//check for a bad name
		if(name) {
			name = this.validateUsername(name);
			if(!name) return -1;
			}
		
		xhr = (typeof XMLHttpRequest == "undefined") ? Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]  
									.createInstance(Ci.nsIXMLHttpRequest) : new XMLHttpRequest();
		xhr.open("GET", 
					(name ? this.colorsUserUrl + name
							: this.colorsListUrl),
					true);
					
		xhrHeaders(xhr, {"Pragma": "no-cache",
						"Cache-Control": "no-cache"});
		
		var t = this;
		
		xhr.onreadystatechange = function() {
			if(xhr.readyState==4 && xhr.status==200) {
				
				var success = !xhr.responseText.match(/^(null|false)$/i);
				
				if(!name) {
					//note that colorsObject is not modified, nothing is changed
					//the callback must handle everything
					callback(xhr, success);
					}
				else {
					var user = JSON.parse(xhr.responseText);
					t.validateUser(user);
					var styles = user.styles;
					//this will only parse out styles for the callback - does not save them
					callback(xhr, success, styles);
					}
				
				}
			};
		xhr.send(null);
		
		return 0;
		
		}
		
	/*
	Save user's styles prefs if successful.
	*/
	this.defaultGetColorsCallback = function(xhr, success, styles) {
		if(success) {
			//save styles as user's usercolors
			this.saveStyles(styles);
			}
		}
		
	/*
	If successful, update local usercolors object and file, apply stylesheet, update lastUsercolorCheck.
	*/
	this.defaultRefreshColorsCallback = function(xhr, success) {
		if(success) {
			this.colorsObject = JSON.parse(xhr.responseText);
			this.synchronizeColors();
			this.setLastUsercolorCheck();
			}
		}
		
	/*
	Given a styles object, save it to prefs as the user's last usercolors.
	Also validates styles and returns it.
	*/
	this.saveStyles = function(styles) {
		
		styles = this.validateStyles(styles);
		
		//now styles only contains properties that must be saved with prefix "UC"
		
		for(var i in styles)
				GM_setValue("UC" + i, styles[i] + "");
		
		return styles;
		
		}
		
	/*
	Saves the current colorsObject to a JSON file.
	*/
	this.saveColorsObject = function(callback) {
		//stringify here will add some spacing so the file's pretty
		//this will increase filesize a bit, but I think it's worth it for anyone who happens to read it
		return vestitools_files.writeFile(this.objectFileUri, JSON.stringify(this.colorsObject, null, " "), callback);
		}
	
	
	/*
	Given a name, return the user in colorsObject with that username.
	Returns null if not found (username is not validated).
	*/
	this.findUser = function(name) {
		
		//make sure this has been read from disk if necessary
		var dummy = this.colorsObject;
		
		for(var i=0, len = _colorsObject.length; i<len; i++)
			if(_colorsObject[i].username == name)
				return _colorsObject[i];
				
		return null;
		
		}
	
	/*
	Find the user with the given username in colorsObject and set its styles to given styles.
	If the user doesn't exist, it will be created and pushed into colorsObject.
	User is validated after being modified or before being added.
	Returns -1 if username is bad, 0 if user was found and changed, 1 if user had to be created.
	*/
	this.setUserStyles = function(name, styles) {
		
		name = this.validateUsername(name);
		if(!name) return -1;
		
		var user = this.findUser(name);
		var noUser = user === null;
		
		if(noUser) {
			user = {};
			user.username = name;
			}
			
		user.styles = styles;
		user = this.validateUser(user);
		
		if(noUser) {
			_colorsObject.push(user);
			}
			
		return noUser ? 1 : 0;
		
		}
		
	
	var validUsernameExp = /^[\w.\-]{3,20}$/i;
	var validColorExp = /^[\da-f]{6}$/i;
	//properties that must be in the style object (prop and exp are required)
	var styleElements = {
		color: {prop: "color", exp: validColorExp},
		bgcolor: {prop: "background-color", exp: validColorExp},
		bordercolor: {prop: "border", exp: validColorExp},
		weight: {prop: "font-weight", exp: /^(normal|bold)$/i},
		style: {prop: "font-style", exp: /^(normal|italic)$/i},
		decoration: {prop: "text-decoration", exp: /^(none|underline|overline|line\-through)$/i}
		};
	this.__defineGetter__("styleElements", function(){ return styleElements });
	this.__defineGetter__("validUsernameExp", function(){ return validUsernameExp });
	this.__defineGetter__("validColorExp", function(){ return validColorExp });
	
	/*
	Take in a type (color, weight, etc.) and a value for that style type.
	Return null if val is invalid (null is a valid value).
	Otherwise, return val.
	*/
	this.validateStyle = function(type, val) {
		
		if(val === null || styleElements[type] && typeof val == "string" && styleElements[type].exp.test(val)) {
			//it's valid
			}
		else {
			val = null;
			}
			
		return val;
		
		}
	
	/*
	Take in a styles object (one that's gotten from the usercolors server).
	If any properties are invalid (or the object itself is), set them to default value (null).
	If there are any unrecognized properties, delete them.
	Styles object will always end up with all properties of styleElements.
	Returns validated styles object.
	*/
	this.validateStyles = function(styles) {
		
		if(styles === null || typeof styles != "object") {
			styles = {};
			}
		
		for(var i in styleElements) {
			styles[i] = this.validateStyle(i, styles[i])
			}
		
		for(var i in styles) {
			if(!styleElements[i]) {
				//if this property isn't in styleElements, delete it
				delete styles[i];
				}
			}
		
		return styles;
		
		}
	
	/*
	If the username is valid, return username.
	Otherwise, return an empty string.
	*/
	this.validateUsername = function(username) {
		if(typeof username != "string" || !validUsernameExp.test(username)) {
			username = "";
			}
		return username;
		}
	
	/*
	Take in a user object (one that's gotten from usercolors server).
	If any properties are invalid (or the object itself is), set them to some default value.
	If there are any unrecognized properties, delete them.
	User object will always end up with a username and styles property.
	Returns validated user object.
	*/
	this.validateUser = function(user) {
		
		if(user === null || typeof user != "object") {
			user = {};
			}
		
		user.username = this.validateUsername(user.username);
		user.styles = this.validateStyles(user.styles);
					
		for(var i in user) {
			if(i == "username" || i == "styles") {
				//do nothing, they have been validated
				}
			else {
				//some property that shouldn't exist
				delete user[i];
				}
			}
		
		return user;
		
		}
	
	/*
	Take in an array of user (one that's gotten from usercolors server).
	If the users array itself is not an array, set to an empty array.
	Validate all contained users - if there are any invalid users, delete them.
	Return the valid users array.
	*/
	this.validateUsers = function(users) {
		
		// https://developer.mozilla.org/web-tech/2010/07/26/determining-with-absolute-accuracy-whether-or-not-a-javascript-object-is-an-array/
		//isArray isn't available before FF 3.6 - other solution is yucky, but works
		if((Array.isArray && !Array.isArray(users)) || 
			(!Array.isArray && Object.prototype.toString.call(users) !== "[object Array]")) {
			users = [];
			}
		
		for(var i=0, len=users.length; i<len; i++) {
			users[i] = this.validateUser(users[i]);
			if(!users[i].username) {
				//no point in keeping a user with an invalid username
				users.splice(i, 1);
				i--; len--;
				}
			}
		
		return users;
		
		}
	
	var mozDocument = '@-moz-document domain(boards.ign.com), domain(betaboards.ign.com),\ndomain(vnboards.ign.com), domain(forums.ign.com) {\n'
	
	var profileLinkUrl = "http://club.ign.com/b/about?username=";
	var peopleLinkUrl = "http://people.ign.com/";
	
	var profileLinkSelector = ['a', '[href^="', profileLinkUrl, 'unknown', '"]'];
	var peopleLinkSelector = profileLinkSelector.slice(0); //copy array
	peopleLinkSelector[2] = peopleLinkUrl;
	peopleLinkSelector[1] = '[href="';
	var linkSelectorUsernameLoc = 3;
	
	var importantEnding = " !important;\n";
	
	var colorStyleExp = /color|bgcolor|bordercolor/;
	this.__defineGetter__("colorStyleExp", function(){ return colorStyleExp });
	
	
	/*
	Return a string of css that obj (intended to be this.colorsObject) represents
	Intended to end up in usercolors.css
	Assumes that all data used from obj is validated (by validateUsers)
	*/
	this.createStyle = function(obj) {
		
		/*
		Since we're probably handling hundreds of users, we're going to push substrings into
		this array and join the array into a string at the end, rather than performing tons of
		concatenations all over.  This should be much faster.
		*/
		var buf = [];
		var showUsercolorsPeopleLinks = GM_getValue("showUsercolorsPeopleLinks", false);
		
		function selectorPusher(e, i) {
			//push the username where "unknown" would be located
			if(i==linkSelectorUsernameLoc) {
				buf.push(user.username);
				}
			else buf.push(e);
			}
		
		//only apply to select domains (@-moz-document)
		if(!this.chrome) {
			buf.push(mozDocument);
			}
		
		//the object should be an array of users
		for(var i=0, len=obj.length; i<len; i++) {
			
			var user = obj[i];
			var normalWeight = false;
			
			//add the selector for this user's profile link
			profileLinkSelector.forEach(selectorPusher);
			
			//and select the user's people link as well if preferred
			if(showUsercolorsPeopleLinks) {
				buf.push(",\n");
				peopleLinkSelector.forEach(selectorPusher);
				}
				
			buf.push(" {\n");
			
			var styles = user.styles;
			
			//add relevant CSS declarations provided by styles
			for(var j in styles) {
				if(styles[j] !== null) {
					buf.push(styleElements[j].prop, ": ");
					if(j == "bordercolor") buf.push("1px solid ");
					if(colorStyleExp.test(j)) buf.push("#"); //push hash for colors
					buf.push(styles[j], importantEnding);
					if(j == "weight" && styles[j] == "normal") normalWeight = true;
					}
				}
				
			buf.push("}\n");
			
			if(normalWeight) {
				//need to make sure child b elements inherit font-weight
				profileLinkSelector.forEach(selectorPusher);
				buf.push(" > b");
				if(showUsercolorsPeopleLinks) {
					buf.push(",\n");
					peopleLinkSelector.forEach(selectorPusher);
					buf.push(" > b");
					}
				buf.push(" {\nfont-weight: inherit", importantEnding, "}\n");
				}
			
			}
			
		if(!this.chrome) {
			buf.push("}\n"); //end of @-moz-document
			}
			
		return buf.join("");
		
		}
		
		
	};
