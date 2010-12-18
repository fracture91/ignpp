
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
			
			if( path.indexOf("/SendMessage.aspx")!=-1 )
				return "sendPM";
				
			if( path.indexOf("/Message.aspx")!=-1 )
				return "topic";

			if( path.indexOf("/PrivateMessages")!=-1 )
				return "privateMessages";

			if( path.indexOf("/Search/")!=-1 )
				return "search";

			if( path.indexOf("/UserPages/PostHistory.aspx")!=-1 )
				return "postHistory";
				
			if( path.indexOf("/UserPages/")!=-1 )
				return "userPages";

			if( path.indexOf("/Help/")!=-1 )
				return "help";

			if( (path=="/") || (path=="/Boards/Default.aspx") )
				return "boardCategoryList";

			if( path.indexOf("/NewBoards.aspx")!=-1 )
				return "newBoards";

			if( path.indexOf("/UsersOnline.aspx")!=-1 ) {
				if(path.indexOf("mods=yes")!=-1)
					return "modsOnline";
				return "usersOnline";
				}
				
			//alternate board page
			if( (path.indexOf('/Boards/Board.aspx')!=-1) || (path.indexOf("/board.asp")!=-1) ) 
				return "board";

			//if there's a "/b" in there and a p or nothing after this.boardNumber
			if( (path.indexOf("/b")!=-1) && ( (that.slashes[5]=="") || (that.slashes[5].indexOf("p")!=-1) ) )
				return "board";

			if( path.indexOf("/PostTopic.aspx")!=-1 )
				return "postTopic";

			if( path.indexOf("/PostReply.aspx")!=-1 )
				return "postReply";

			if( path.indexOf("/PostEdit.aspx")!=-1 )
				return "postEdit";

			if( path.indexOf("/TopBoards.aspx")!=-1 )
				return "topBoards";

			if( path.indexOf("/TopPosters.aspx")!=-1 )
				return "topPosters";

			if( path.indexOf("/UsersNew.aspx")!=-1 )
				return "newUsers";

			if( path.indexOf("/ActiveTopics.aspx")!=-1 )
				return "activeTopics";

			if( (path.indexOf("/b") != -1) && (that.slashes[5]!="") && (!isNaN(that.slashes[5])) )
				return "topic";

			if( path.indexOf("/c")!=-1 )
				return "boardCategory";
				
			if( path.indexOf("/Denied.aspx")!=-1 )
				return "denied";

			return "unknown";
			
			
			});
		
		},
		
	get categoryName() {
		
		return this.gottenProperty("categoryName", function(that) {
			
			//these two are found in identical ways and follow the same rules,
			//they only mean different things based on pageType
			return that.boardName;
			
			});
		
		},
		
	get categoryNumber() {
		
		return this.gottenProperty("categoryNumber", function(that) {
		
			var match;
			
			if(that.slashes[4] && (match = that.slashes[4].match(/^c(\d+)$/))) return +match[1];
			
			return "";
			
			});
		
		},
		
	get boardNumber() {
		
		return this.gottenProperty("boardNumber", function(that) {
		
			var match;
			
			if(match = that.getField("brd")) return +match;
			
			if(that.slashes[4] && (match = that.slashes[4].match(/^b(\d+)$/))) return +match[1];
			
			return "";
			
			});
		
		},
		
	get boardName() {
		
		return this.gottenProperty("boardName", function(that) {
		
			var match;
			
			if(that.slashes[3] && (match = that.slashes[3].match(/^[a-z0-9_]*$/i))) return match[0];
			
			return " ";
			
			});
		
		},
		
	get topicNumber() {
		
		return this.gottenProperty("topicNumber", function(that) {
		
			var match;
			
			if(match = that.getField("topic")) return +match;
			
			if(that.slashes[5] && (match = that.slashes[5].match(/^\d+$/))) return +match[0];
			
			return "";
			
			});
		
		},
		
	get replyCount() {
		
		return this.gottenProperty("replyCount", function(that) {
		
			var match;
			
			if(that.search && (match = that.search.match(/^\?(\d+)($|&)/))) return +match[1];
			
			return -1;
			
			});
		
		},	
		
	get replyNumber() {
		
		return this.gottenProperty("replyNumber", function(that) {
		
			var match;
			
			if(match = that.getField("edit")) return +match;
			
			if(that.slashes[6] && (match = that.slashes[6].match(/^r(\d+)$/))) return +match[1];
			
			return -1;
			
			});
		
		},
		
	set pageNumber(n) { this.gotten.pageNumber = n; },
	get pageNumber() {
		
		return this.gottenProperty("pageNumber", function(that) {
			
			var match;
			that.gotten.unsurePageNumber = false;
			
			if(match = that.getField("page")) return +match;
			
			if(match = that.pathname.match(/\/p(\d+)($|\/)/)) return +match[1];
			
			that.gotten.unsurePageNumber = true;
			
			return 1;
						
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
		
	get replyUrl() { 
		return this.protocol + "//" + this.host + "/PostForms/PostReply.aspx?brd=" + this.boardNumber + "&topic=" + this.topicNumber;
		},
		
	get topicUrl() { 
		return this.protocol + "//" + this.host + "/PostForms/PostTopic.aspx?brd=" + this.boardNumber;
		}
		
	
	
	}

//provides information about the page the user's on
//and the user himself
//call init() to put all information into object I

var I = new function() {

	this.username = GM_getValue("username", "unknown");
	this.uid = GM_getValue("uid", "");
	
	this.url = new Url();
	
	if(this.url.unsurePageNumber) {
		var tar;
		if(tar = document.getElementsByClassName("currentpage")[0])
			this.url.pageNumber = tar.textContent;
		}
		
	if(this.url.pageType=="unknown") vlog("unknown pageType!");
	
	this.layout = {};
	this.layout.name = getFirstByClassName(document, "boards_profile_theme_grey_selected") ? "grey" : 
						getFirstByClassName(document, "boards_profile_theme_white_selected") ? "white" : "classic";
	
	this.layout.fresh = this.layout.name != "classic";

		
	//get the user's username
	//good luck reading this code
	var cook, ignlogin, username="<unknown>";
	if(cook = document.cookie) {
		if(ignlogin = cook.slice( cook.indexOf("ignlogin=")+9, cook.indexOf(";", cook.indexOf("ignlogin=")+9) )) {
			if(!(username = ignlogin.slice( ignlogin.lastIndexOf("\\", ignlogin.lastIndexOf("\\")-1)+1, ignlogin.lastIndexOf("\\") ))) {username = GM_getValue("username", "<unknown>");}
			}
		}
		
	this.validUsername = /^[a-z0-9_.\-]{3,20}$/i;
		
	if(username != "<unknown>" && !this.validUsername.test(username)) username = "<error>";
	
	if(username != "<error>") GM_setValue("username", username);
	
	this.username = GM_getValue("username", "<unknown>");
	
	var uid, url;
	if(
		(uid = document.getElementById("boards_add_info_my_recent_posts")) &&
		(uid = getFirstByClassName(uid, "boards_sidebar_more_link")) &&
		(uid = getFirstByTagName(uid, "A")) &&
		(uid = uid.href) &&
		(url = new Url(uid)) &&
		(url.pageType=="postHistory") &&
		(uid = url.getField("usr"))
		)
		GM_setValue("uid", this.uid = +uid);
	
	else this.uid = +GM_getValue("uid", "");
	
	delete url;
	
	this.__defineGetter__("postsPerPage", function(){ return GM_getValue("postsPerPage", 10); });
	this.__defineSetter__("postsPerPage", function(n){ if(!isNaN(n=+n)) return GM_setValue("postsPerPage", n); });
	
	vlog("pageType:" + this.url.pageType);
	
	//Cleanup.add(function(){ I = null; });

	}

