
var Quickstats = new function() {
	
	this.__defineGetter__("showUsercolors", function(){return GM_getValue("showUsercolorsQuickstats", false);});
	
	this.clubPattern = /^http:\/\/club\.ign\.com(\/b)?\/about.*$/;
	this.peoplePattern = /^http:\/\/people\.ign\.com\/.*$/;
	
	this.serviceURL = "http://boards.ign.com/ServicesV31/UserServices.asmx/JSON_GetUserDetails";
	
	/*
	Should be called when the user clicks somewhere.
	Makes sure the target is a valid link, then requests quickstats for the user in the URL.
	*/
	this.onClick = function(e) {
		if(e.which!=1 || !e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
		
		var target = e.target;
		if(target.tagName != "A") {
			target = getParentByTagName(target, "a");
			}
			
		if(target && target.href) {
			var isPeopleLink = this.peoplePattern.test(target.href);
			if(isPeopleLink || this.clubPattern.test(target.href)) {
				var url = new Url(target.href);
				var username = isPeopleLink ? url.pathname.substring(1) : url.getField("username");
				if(!isPeopleLink && !username) {
					/*
					Club links without any explicit username send the user to their own profile,
					so we should use the user's own username to find quickstats.
					*/
					username = I.username;
					}
				if(I.validUsername.test(username)) {
					e.preventDefault();
					this.request(username, e.pageX, e.pageY+1);
					}
				}
			}
		}
		
	var that = this;
	Listeners.add(document, "click", function(e) {
		that.onClick(e);
		}, true);
	
	/*
	Request quickstats for the given user.
	Creates an Infopanel at coordinates x,y (in pixels).
	*/
	this.request = function(user, x, y) {
		
		var href = "http://club.ign.com/b/about?";
		var unData = "username=" + user;
		var whData = "which=boards";
		//usercolors will fail on a profile link if the data is out of order
		href += this.showUsercolors ? (unData + "&" + whData) : (whData + "&" + unData);
		
		var panel = Infopanels.open((user + 'QuickStats'), ('<a href="' + href + '">' + user + '</a>'), '<img class="loadingIcon">', [], x, y);
		
		var that = this;
		
		GM_xmlhttpRequest({
			method: "GET",
			url: this.serviceURL + "?username=" + user + '&viewingusername=' + I.username,
			headers: { "Accept": "application/json, text/javascript, text/plain" },
			onload: function(details) {
				that.onLoad(panel, details);
				}
			});
		
		}
		
	/*
	Number of hours that times are off UTC by.
	*/
	this.hoursOffset = -7;
	
	/*
	This should be called when the XHR completes.
	Updates the given panel with information from details.responseText.
	*/
	this.onLoad = function(panel, details) {
		if(!panel) return;
		
		/*
		The JSON we get in response isn't actually valid.
		It includes instantiations of Date objects, which definitely aren't allowed.
		The space is also missing sometimes (for zerosleep), and the number is sometimes negative.
		We will replace them with the plain numbers before we parse.
		*/
		details.responseText = details.responseText.replace(/new ?Date\((-?\d*)\)/g, "$1")
			//it also unnecessarily escapes single quotes
			.replace(/\\'/g, "'");
		
		//and given this terribleness, wrap in a try/catch just in case
		try{
			var json = JSON.parse(details.responseText);
			}
		catch(e) {
			var json = {};
			logError("JSON parsing", e);
			}
		
		//convert necessary date numbers into Date objects for convenience
		var anHour = 60*60*1000;
		/*
		The times seem to be UTC + this.hoursOffset, must provide UTC + 0.
		If the time was recorded during a different DST state in its timezone, we'll lose an hour somewhere.
		I'm not going to attempt to fix that.
		*/
		var offsetFix = -1 * this.hoursOffset * anHour;
		for(var i in json) {
			if(typeof json[i] == "number" && /date/i.test(i)) {
				json[i] = new Date(json[i] + offsetFix);
				}
			}
		
		var builder = new this.Builder(json);
		var frag = builder.build();

		panel.headingRef.firstChild.style.cssText = builder.getProp("Style", "");
		
		panel.content = "";
		panel.contentRef.appendChild(frag);
		}
	
	}
	
/*
This class will build the panel content from the given json from GetUserDetails.
Running a build* method will lose all references to anything that method previously created.
Necessary date numbers should be converted to proper Date objects beforehand.
*/
Quickstats.constructor.prototype.Builder = function(json) {
	/*
	JSON to build from.
	*/
	this.json = json;
	
	/*
	The document fragment that will hold this.table, this.links, and this.icon.
	*/
	this.frag = null;
	
	/*
	The table element this builder will use (set in build method).
	*/
	this.table = null;
	
	/*
	The div that holds links on the bottom of the panel.
	*/
	this.links = null;
	
	/*
	The div that holds the icon.
	*/
	this.icon = null;
	}
	
Quickstats.constructor.prototype.Builder.prototype = {
	
	/*
	Returns true if the given value's type is valid considering
	the type of the default value.
	Does a basic typeof check, checks for instanceof Date, and checks isArray.
	*/
	typeIsValid: function(value, def) {
		return typeof value == typeof def && 
			(!(def instanceof Date) || value instanceof Date) &&
			(!Array.isArray(def) || Array.isArray(value));
		},
	
	/*
	What def defaults to in this.getProp.
	*/
	defaultValue: "Error",
	
	/*
	Given an object, return the value of object[property].
	def is optional.  By default, def is this.defaultValue.
	object is optional.  By default, object is this.json.
	If def is provided, and typeof value is not equal to typeof def,
	def is returned instead of the value.
	If def is an instance of Date but value is not, def is returned.
	If typeof object is not "object", typeof property is not "string" or "number,
	or the value is undefined, def is returned.
	*/
	getProp: function(property, def, object) {
		var defProvided = defined(def);
		if(!defProvided) def = this.defaultValue;
		if(!defined(object)) object = this.json;
		if(typeof object != "object" || typeof property != "string" && typeof property != "number") {
			return def;
			}
		var val = object[property];
		if(!defined(val) || defProvided && !this.typeIsValid(val, def)) {
			return def;
			}
		return val;
		},
		
	/*
	Add a row (tr) to this.table containing the array of children.
	Returns the added row.
	*/
	addRow: function(children) {
		var row = document.createElement("tr");
		for(var i=0, len=children.length; i<len; i++) {
			row.appendChild(children[i]);
			}
		return this.table.appendChild(row);
		},
		
	/*
	Gets a map ready to be passed to createElementX.
	Always returns an object that represents the prepared map.
	map can be anything, but is always turned into an object.
	map.textContent is set to content.
	If map was originally a string, then map[assumed] is set to it.
	*/
	prepareMap: function(map, content, assumed) {
		var assumedVal;
		if(typeof map == "string") {
			assumedVal = map;
			}
		if(typeof map != "object") {
			map = {};
			}
		map.textContent = content;
		if(assumedVal) map[assumed] = assumedVal;
		return map;
		},
		
	/*
	Add a row to the table containing two columns: a label and a value.
	The two optional maps are provided to createElementX (textContent cannot be changed).
	If a map is a string, it is assumed to be a desired title.
	The label always gets a semicolon appended to it.
	Returns the added row.
	*/
	pair: function(label, value, labelMap, valueMap) {
		label += ":";
		var contents = [label, value];
		var maps = [labelMap, valueMap];
		var elements = [];
		for(var i=0, len=contents.length; i<len; i++) {
			var map = maps[i];
			map = this.prepareMap(map, contents[i], "title");
			elements.push(createElementX("td", map));
			}
		return this.addRow(elements);
		},
		
	/*
	Add a row to the table containing a pair with the given label and labelMap.
	The Date instance is found by looking for the given property, defaults to this.defaultDate.
	value is set similar to Date.toDateString(), valueMap is set to Date.toTimeString();
	Returns the added row.
	*/
	date: function(label, labelMap, property) {
		var date = this.getProp(property, this.defaultDate);
		//add comma before year and remove leading zeros
		var dateString = date.toDateString().replace(/ -?\d+$/, ",$&").replace(/(^| )0+(\d+)/g, "$1$2");
		return this.pair(label, dateString, labelMap, date.toTimeString());
		},
		
	/*
	Conditionally add a row to the table containing two columns: an empty one and label.
	The row is only added if this.getProp(property, def, object) returns true.
	def and object are optional, like in this.getProp, but def defaults to false.
	map is passed to createElementX like in this.pair,
	but when it's a string it's assumed to be a desired className.
	Returns the row if added, otherwise returns undefined.
	*/
	type: function(label, map, property, def, object) {
		if(!defined(def)) def = false;
		if(this.getProp(property, def, object)===true) {
			map = this.prepareMap(map, label, "className");
			return this.addRow([document.createElement("td"), createElementX("td", map)]);
			}
		},
	
	/*
	Default date used in case one is missing.
	*/
	defaultDate: new Date(0),
	
	/*
	Returns true if the given username appears in the given list of users.
	Used for seeing if a user has been WUL'd.
	username defaults to I.username.
	*/
	userExistsInList: function(list, username) {
		if(!defined(username)) username = I.username;
		for(var i=0, len=list.length; i<len; i++) {
			if(this.getProp("Name", "", list[i]) == username) {
				return true;
				}
			}
		return false;
		},
	
	/*
	Build the table from this.json.
	Returns the table element when done.
	this.table will also be set to the table element.
	*/
	buildTable: function() {
		this.table = document.createElement("table");
		
		var title = this.getProp("Title", "");
		if(title != "") {
			this.pair("Title", title);
			}
		
		this.pair("Posts", addCommas(this.getProp("VirtualPostCount", -1)));
		
		var watchedUsers = this.getProp("WatchedUsers", []);
		var received = addCommas(this.getProp("WatchedByCount", -1));
		var given = addCommas(watchedUsers.length);
		this.pair("WULs", received + " / " + given,
			"Times added to someone's Watched User List", "Received / Given");
		
		var newPMCount = this.getProp("NewPMCount", -1);
		if(newPMCount > 0) {
			this.pair("PMs", newPMCount, "Unread PMs");
			}
		
		this.date("Reg", "Date Registered", "DateAdded");
		
		this.type("Banned", "banned in", "IsBanned");
		this.type("Admin", "admin in", "IsAdministator");
		this.type("Manager", "manager in", "IsManager");
		
		if(!this.type("Mod", "mod in", "IsModerator")) {
			/*
			Not sure what modType means, but all mods seem to have it
			so I'll only include it if necessary.
			*/
			this.type("ModType", "modType in", "IsModType");
			}
		
		this.type("VIP", "vip in", "IsVip");
		
		if(!this.type("Insider", "insider in", "IsSubscriber")) {
			/*
			There is no "IDontExist" property, but I know that they're an outsider
			since they're not an insider.  getProp won't find it and will return true.
			Just using the function for its DOM generation purposes.
			*/
			this.type("Outsider", "outsider in", "IDontExist", true);
			}
		
		if(this.userExistsInList(watchedUsers)) {
			this.type("WUL'd You", "wuldyou in", "IDontExist", true);
			}
		
		//all this seems good for is checking Homer's real post count
		this.pair("RPC", addCommas(this.getProp("PostCount", -1)), "Real Post Count?");
		this.pair("UID", this.getProp("UserID", -1), "User ID");
		
		this.date("Login", "Last Login Date", "LastLoginDate");
		this.date("Post", "Last Post Date", "LastPostDate");
		this.date("Update", "Last Profile Update Date...or something...", "DateUpdated");
		
		return this.table;
		},
		
	/*
	Append a link (anchor element) to this.links with the given content.
	Also add a separator text node before it if necessary.
	map is passed to createElementX for the link.
	If map is a string, it is assumed to be the desired href for the link.
	Returns the appended link element.
	*/
	link: function(content, map) {
		map = this.prepareMap(map, content, "href");
		if(this.links.childNodes.length > 0) {
			this.links.appendChild(document.createTextNode(" | "));
			}
		return this.links.appendChild(createElementX("a", map));
		},
	
	/*
	Build the bottom links from this.json.
	Returns the containing div when done.
	this.links will also be set to the containing div.
	*/
	buildLinks: function() {
		this.links = createElementX("div", {className: "bottomLinks"});
		var uid = this.getProp("UserID", -1);
		var name = this.getProp("Name");
		
		var args = [
			["WUL", "http://boards.ign.com/UserPages/WatchedUsers.aspx?usr=" + uid + "&action=update"],
			["deWUL", "http://boards.ign.com/UserPages/WatchedUsers.aspx?usr=" + uid + "&action=remove"],
			["PM", {href: "http://boards.ign.com/PrivateMessages/SendMessage.aspx?usr=" + uid,
					id: "privateMessageButton"}],
			["History", "http://boards.ign.com/UserPages/PostHistory.aspx?usr=" + uid],
			["Wiki", "http://vestiwiki.yabd.org/wiki/index.php?title=" + name]
			];
		
		for(var i=0, len=args.length; i<len; i++) {
			this.link(args[i][0], args[i][1]);
			}
		
		return this.links;
		},
		
	/*
	URL of the default icon to use when no icon URL is given.
	*/
	defaultIcon: "http://media.ignimgs.com/boards/img/default/icon_default_80.jpg",
	
	/*
	Build the icon from this.json.
	Returns the containing div when done.
	this.icon will also be set to the containing div.
	*/
	buildIcon: function() {
		this.icon = createElementX("div", {className: "icon"});
		
		var def = {};
		var root = this.getProp("Icon", def);
		if(root != def) {
			var height = this.getProp("Height", 80, root);
			var type = height>=120 ? "MegIcon" : "TinIcon";
			var alt = type + " - " + this.getProp("Alias", undefined, root);
			this.icon.appendChild(createElementX("img", {
				src: this.getProp("ImageURL", this.defaultIcon, root),
				alt: alt,
				title: alt
				}));
			}
		else this.icon.textContent = "No Icon";
		
		return this.icon;
		},
	
	/*
	Calls buildTable, buildLinks, and buildIcon,
	then adds them all to new document fragment this.frag.
	Returns this.frag.
	*/
	build: function() {
		this.frag = document.createDocumentFragment();
		this.frag.appendChild(this.buildTable());
		this.frag.appendChild(this.buildLinks());
		this.frag.appendChild(this.buildIcon());
		return this.frag;
		}
	
	}
