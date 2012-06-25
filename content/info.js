
//interprets an (IGN) url and gives you info about it
//if url is not given, window.location is used

//has all properties of window.location

//object will do the minimal amount of work possible to give you the requested info.
//for example, if you instantiate this and just access pathname, it won't do any
//work to find any other properties

var Url = function(href) {
	this.useLocation = !defined(href);
	this.href = this.useLocation ? window.location.href : href;
	this.slashes = this.href.split("/");
	
	//an object that saves all properties accessed by getters
	//so getters don't have to do unnecessary work
	this.gotten = {};
}
	
Url.prototype = {
	
	gottenProperty: function(name, func) {
		if(defined(this.gotten[name])) return this.gotten[name];
		return this.gotten[name] = func(this);
	},
	
	sharedProperty: function(name, func) {
		return this.gottenProperty(name, function(that) {
			if(that.useLocation) return window.location[name];
			return func(that);
		});
	},
	
	get protocol() {
		return this.sharedProperty("protocol", function(that) {
			var end = that.href.indexOf("//");
			if(end==-1) return "";
			
			return that.href.slice(0, end);
		});
	},
	
	get host() {
		return this.sharedProperty("host", function(that) {
			var start = that.href.indexOf("//")+2;
			if(start==1) return "";
			var end = that.href.indexOf("/", start);
			if(end==-1) end = that.href.indexOf("?", start);
			if(end==-1) end = that.href.indexOf("#", start);
			if(end==-1) end = that.href.length;
			
			return that.href.slice(start, end);
		});
	},
		
	get hostname() {
		return this.sharedProperty("hostname", function(that) {
			return that.host.split(":")[0];
		});
	},
		
	get port() {
		return this.sharedProperty("port", function(that) {
			return that.host.indexOf(":")!=-1 ? that.host.split(":")[1] : "";
		});
	},
		
	get pathname() {
		return this.sharedProperty("pathname", function(that) {
			var start = that.href.indexOf("/", that.href.indexOf("//")+2);
			if(start==-1) return "";
			var end = that.href.indexOf("?", start);
			if(end==-1) end = that.href.indexOf("#", start);
			if(end==-1) end = that.href.length;
			
			return that.href.slice(start, end);
		});
	},
		
	get search() {
		return this.sharedProperty("search", function(that) {
			var start = that.href.indexOf("?");
			if(start==-1) return "";
			var end = that.href.indexOf("#", start);
			if(end==-1) end = that.href.length;
			
			var rv = that.href.slice(start, end);
			if(rv=="?") rv = "";
			return rv;
		});
	},
		
	get hash() {
		return this.sharedProperty("hash", function(that) {
			var start = that.href.indexOf("#");
			if(start==-1) return "";
			var end = that.href.length;
			
			var rv = that.href.slice(start, end);
			if(rv=="#") rv = "";
			return rv;
		});
	},
		
	get pageType() {
		return this.gottenProperty("pageType", function(that) {
			var path = that.pathname;
			var host = that.host;
			
			//todo

			return "unknown";
		});
	},
		
	get categoryName() {		
		return this.gottenProperty("categoryName", function(that) {
			return " "; //todo
		});
	},
		
	get categoryNumber() {
		return this.gottenProperty("categoryNumber", function(that) {
			return -1; //todo
		});
	},
		
	get boardNumber() {
		return this.gottenProperty("boardNumber", function(that) {
			return -1; //todo
		});
	},
		
	get boardName() {		
		return this.gottenProperty("boardName", function(that) {
			return " "; //todo
		});
	},
		
	get topicNumber() {
		return this.gottenProperty("topicNumber", function(that) {
			return -1; //todo
		});
	},
		
	get replyNumber() {
		return this.gottenProperty("replyNumber", function(that) {
			//todo
			return -1;
		});
	},
		
	set pageNumber(n) { this.gotten.pageNumber = n; },
	get pageNumber() {
		return this.gottenProperty("pageNumber", function(that) {
			return 1; //todo		
		});
	},
		
	//true if the page number wasn't listed and defaulted to 1
	//so I knows when to look at the document for this info
	get unsurePageNumber() {
		return this.gottenProperty("unsurePageNumber", function(that) {
			//force the getter to run, which sets this property
			var pageNumber = that.pageNumber;
			return that.gotten.unsurePageNumber;
		});
	},
		
	//returns the value of a field in the query string of a url
	getField: function(name) {
		var href = this.search;
		if(href=="") return null;
	
		start = href.indexOf(name + "=") + name.length + 1;
		if(start == name.length) return null;
		
		var end = href.indexOf("&", start);
		
		return end == -1 ? href.slice(start) : href.slice(start, end);
	},
	
	get PMCountUrl() {
		return "";
	},
	
	get boardUrl() {
		//todo
		return this.protocol + "//" + this.host + "/" + this.boardName + "/b" + this.boardNumber + "/p" + this.pageNumber;
	},
		
	get topicUrl() {
		//todo
		return this.protocol + "//" + this.host + "/PostForms/PostTopic.aspx?brd=" + this.boardNumber;
	}
	
}

/*
Provides information about the current page and the user
*/
var Info = new function() {
	
	this.url = new Url();
	
	if(this.url.unsurePageNumber) {
		//todo
	}
		
	if(this.url.pageType=="unknown") vlog("unknown pageType!");
	
	//todo
	this.layout = {};
	this.layout.name = "grey";
	
	this.layout.fresh = this.layout.name != "classic";
	
	// get the user's username from IGN's cookie
	this.validUsername = /^[\w.\-]{3,20}$/i;
	/*
	Cookie looks something like this:
	a=b; c=d; ... ignlogin=abcd4rr3h34\gvdvf\ffsdf\ ... \gamerX1011\1;
	
	Match ignlogin followed by any number of those slash groups, then capture
	with a group for the username, then match the last slash group and semicolon.
	*/
	var match = document.cookie.match(/ignlogin\=(?:[^;]*\\)*([^;]*)\\[^;]*;/);
	if(match && match[1] && this.validUsername.test(match[1])) {
		GM_setValue("username", match[1]);
	}
	this.username = GM_getValue("username", "unknown");
	
	//todo
	this.uid = +GM_getValue("uid", "");
	
	delete url;
	
	this.__defineGetter__("postsPerPage", function(){ return GM_getValue("postsPerPage", 10); });
	this.__defineSetter__("postsPerPage", function(n){ if(!isNaN(n=+n)) return GM_setValue("postsPerPage", n); });
	
	vlog("pageType:" + this.url.pageType);
}
