
function Refresher(target, interval) {
		
	var target = target;
	this.__defineGetter__("target", function(){ return typeof target == "function" ? target() : target; });
	this.__defineSetter__("target", function(s){ target = s; });
	this.accept = "text/html, text/xml, text/plain";
	this.interval = interval;
	
	this.actions = [];
	
	this.refreshing = false;
	this.outlinee = null;
	this.dontRefresh = false;
	this.override = false;
	
	//return true if it's okay to trigger a refresh, false otherwise
	this.otherCheck = function() {
		if(this.checks.length!=this.actions.length) return true;
		var len = this.checks.length;
		for(var i=0; i<len; i++)
			if(typeof this.checks[i] != "function" || this.checks[i].call(this))
				return true;
		return false;
		}
		
	this.checks = [];
	
	this.action = function(ref, override) {
		
		if(typeof ref != "object" && typeof override == "undefined") {
			override = ref;
			ref = null;
			}
			
		if(!ref) ref = this;
		if(ref==window) return;

		if(typeof override != "boolean") override = false;
		if(override) ref.override = true;
		
		if((ref.refreshing || ref.actions.length < 1) || 
			(!override && (!Autorefresh.inFocus || ref.dontRefresh || !ref.otherCheck()))) return;
		
		ref.refreshing = true;
		if(ref.outlinee) ref.outlinee.style.outlineColor = "green";
		var thisRef = ref;
		
		GM_xmlhttpRequest({
			method: "GET",
			url: ref.target,
			headers:{
			"User-Agent": navigator.userAgent,
			"Accept": ref.accept,
			"Pragma": "no-cache",
			"Cache-Control": "no-cache"
			},
			onload:function(details) {
			
				if(thisRef.outlinee) thisRef.outlinee.style.outlineColor = (thisRef.dontRefresh) ? "red" : "transparent";
				thisRef.refreshing = false;
				
				if(thisRef.actions.length < 1 || (thisRef.dontRefresh && !thisRef.override)) return;
				thisRef.override = false;
				
				if(thisRef.name) vlog(thisRef.name + " Autorefresh Load");
				
				for(var i=0, len=thisRef.actions.length; i<len; i++)
					if(typeof thisRef.checks[i] != "function" || thisRef.checks[i].call(thisRef))
						thisRef.actions[i](details);

				}
			});
		
		}
	
	}
	
Cleanup.add(function(){ Refresher = null; });


//Autorefresh has refreshers
//each refresher has a target URL and action functions to apply to the response
//the Autorefresh object automatically sets up the setInterval for each refresher

var Autorefresh = new function Autorefresh_Obj() {
	
	this.__defineGetter__("topics", function(){return GM_getValue("autorefreshTopics", true);});
	this.__defineGetter__("topicsInt", function(){return GM_getValue("autorefreshTopicsInt", 5000);});
	this.__defineGetter__("recent", function(){return GM_getValue("autorefreshRecent", true);});
	this.__defineGetter__("replies", function(){return GM_getValue("autorefreshReplies", true);});
	this.__defineGetter__("repliesInt", function(){return GM_getValue("autorefreshRepliesInt", 5000);});
	this.__defineGetter__("repliesAfterPosting", function(){return GM_getValue("autorefreshRepliesAfterPosting", true);});
	this.__defineGetter__("edits", function(){return GM_getValue("autorefreshEdits", true);});
	this.__defineGetter__("polls", function(){return GM_getValue("autorefreshPolls", true);});
	this.__defineGetter__("pmCount", function(){return GM_getValue("autorefreshPMCount", true);});
	this.__defineGetter__("pmCountInt", function(){return GM_getValue("autorefreshPMCountInt", 3000);});
	
	this.inFocus = false;
	
	this.refreshers = [];
		
	//consumes response text of PM page
	//returns number of unread PMs the user has
	this.getPMCount = function(content) {
		
		var x = content.indexOf('elPmCount.innerHTML = "'); //set x = position of that id
		if(x == -1) return 0;

		x += 23;
		
		var y = content.indexOf('&', x); //find ampersand
		if(y == -1) y = content.indexOf('"', x);
		if(y == -1) return 0;

		return content.slice(x, y)/1;
		
		}
		
	//consumes response text of board page
	//returns content of the table that holds all the topics/authors/etc.
	this.getTable = function(content) {
		var x = content.indexOf('id="boards_board_list_table"'); //set x = position of that id
		if(x == -1) return "";

		x = content.indexOf(">", x); //find end of tag
		if(x == -1) return "";

		var y = content.indexOf('<!-- /Thread List -->', x); //find end of topic list
		if(y == -1) return "";
		
		y = content.lastIndexOf('</div>', y);
		if(y == -1 || y < x) y = content.indexOf('<!-- /Thread List -->', x);
		if(y == -1) return "";

		//debugString(content.slice(x + 1, y));
		
		return content.slice(x + 1, y);   //return stuff between <table...id=""> and </table>
		}
	
	this.getRecent = function(content) {
		
		var x = content.indexOf('id="boards_add_info_my_recent_posts"');
		if(x == -1) return "";
		
		x = content.indexOf('class="boards_add_info_content_wrapper"', x);
		if(x == -1) return "";

		x = content.indexOf(">", x)+1;
		if(x == -1) return "";

		var y = content.indexOf("<!-- /SIDEBAR USER'S POSTS -->", x);
		if(y == -1) return "";
		
		y = content.indexOf('</div>', y);
		if(y == -1) return "";
		
		return content.slice(x, y);
		
		}
	

	//initialize page refresher (topics/replies)
	if((I.url.pageType=="board" && this.topics) || (I.url.pageType=="topic" && this.replies) || (document.getElementById("boards_add_info_my_recent_posts") && this.recent)) {
	
		this.page = new Refresher(
			I.url.pageType=="board" ? ('http://' + I.url.host + '/' + I.url.boardName + '/b' + I.url.boardNumber + '/p' + I.url.pageNumber) : window.location.href, 
			I.url.pageType=="topic" ? this.repliesInt : this.topicsInt);
		
		this.page.outlinee = I.url.pageType=="board" ? document.getElementById("boards_board_list_table") 
							: I.url.pageType=="topic" ? document.getElementById("boards_full_width")
							: document.getElementById("boards_add_info_my_recent_posts");
													
		this.page.name = "Page";
		
		if(I.url.pageType=="board" && this.topics) {
		
			this.page.onTopics = false;
			this.page.checks.push(function(){ return !this.onTopics; });
			
			Listeners.add(this.page.outlinee, 'mouseover', function(e) { Autorefresh.page.onTopics = true; }, false);
		
			Listeners.add(this.page.outlinee, 'mouseout', function(e) { Autorefresh.page.onTopics = false; }, false);
		
			this.page.actions.push(function(details) {
				//replace the table on the page with the contents of the table in responsetext
				var table = document.getElementById("boards_board_list_table");
				if(!Autorefresh || !table) return;
				var newTable = Autorefresh.getTable(details.responseText);
				if(newTable != "") {
					table.innerHTML = newTable;
					pageTopics = new Topics(table);
					pageTopics.augment();
					customEvent(table, "topicListChange");
					}
				});
				
			}
		
		
		if(I.url.pageType=="topic" && this.replies) {
		this.page.actions.push(function(details){
			
			if(!pageReplies || !Autorefresh) return;
			
			var dt = details.responseText;

			//make a new Replies object out of the slice of text containing all the replies
			var nrs = new Replies(dt);
			
			//make sure we're fetching the right page - target can change
			if(pageReplies.currentPage != nrs.currentPage) {
				//we fetched the wrong page!  reset the target and stop with the refresh at hand
				this.target = this.lastValidTarget;
				return;
				}
			
			this.lastValidTarget = this.target;
			
			var len = nrs.length;
			var oldLen = pageReplies.length;

			//if this is true, we definitely have an old copy of the page
			if(len < oldLen) return;
			
			var bfw = document.getElementById("boards_full_width");
			
			if(nrs.pages && nrs.lastPage > pageReplies.lastPage) {
			
				if(document.getElementById('boards_pagination_wrapper')) {
					var topPag = document.getElementById('boards_pagination_wrapper');
					var botPag = document.getElementById('boards_bottom_pagination_wrapper');
					topPag.innerHTML = botPag.innerHTML = nrs.pages.innerHTML;
					customEvent(topPag, "paginatorChange");
					customEvent(botPag, "paginatorChange");
					}
				else {
					var topPag, botPag;
					bfw.insertBefore((topPag = nrs.pages.cloneNode(true)), I.layout.fresh ? getFirstByClassName(bfw, 'boards_thread_row') : bfw.getElementsByClassName('clear')[1]);
					nrs.pages.id = "boards_bottom_pagination_wrapper";
					bfw.parentNode.insertBefore((botPag = nrs.pages), bfw.nextSibling.nextSibling);
					customEvent(topPag, "newPaginator");
					customEvent(botPag, "newPaginator");
					}
				
				}
			
			var reached = false, newStuff = false;
			
			//loop through all the replies
			for(var i = 0; i < len; i++) {
			
				var tr = nrs.get(i);
				var ex = pageReplies.get("#" + tr.id);
			
				//if this post is already here
				if(ex) {
					//if there's a new edit
					if(Autorefresh.edits && (tr.editCount > ex.editCount)) {
						
						//change class names for stylesheet(s)
						addClass(ex.ref, "editedReply");
						
						//get rid of the script element that breaks everything
						tr.fixEmbeds();
						
						//update body
						ex.postContent = tr.allPostContent;
						
						//update subject area
						ex.subject = tr.subject;
						
						newStuff = true;
						customEvent(ex.ref, "replyEdited");
						
						}
					var poll;
					//if it's the first post and there's a poll on the page
					if(Autorefresh.polls && i==0 && ex.poll) {
						//if the poll has more votes, update it
						if(ex.votes < tr.votes) ex.poll = tr.poll;
						}
					nrs.get
					}
				//otherwise, it's a new post
				else if(reached || i >= oldLen) {
					if(!reached) {
						//now we'll need to start adding new replies, so we have to augment the new ones
						reached = true;
						nrs.erase(0, i-1);
						len = nrs.length;
						i = 0;
						nrs.augment(pageReplies);
						}
					addClass(tr.ref, "newReply");
					tr.fixEmbeds();
					//add the new reply
					pageReplies.add(tr);
					newStuff = true;
					customEvent(tr.ref, "newReply");
					}
			
				}
			
			delete nrs;
			if(newStuff) resize(window);
			
			});
			
			this.page.checks.push(null);
			this.page.lastValidTarget = this.page.target;
			
			}
		
		var recentArea;
		if((recentArea = document.getElementById("boards_add_info_my_recent_posts")) && this.recent) {
			
			this.page.onRecent = false;
			this.page.checks.push(function(){
				return !this.onRecent && (new Position(recentArea)).someVisible;
				});
			
			Listeners.add(recentArea, 'mouseover', function(e) { Autorefresh.page.onRecent = true; }, false);
		
			Listeners.add(recentArea, 'mouseout', function(e) { Autorefresh.page.onRecent = false; }, false);
		
			this.page.actions.push(function(details) {
			
				if(!Autorefresh) return;
				
				var newRecent = Autorefresh.getRecent(details.responseText);
				if(newRecent == "") return;
				
				var wrapper = getFirstByTagName(recentArea, "div");
				
				function getTopics(w) {
					return w.getElementsByClassName("boards_topic_tabs_row");
					}
				
				var oldTopics = getTopics(wrapper);
				
				function recentReply(ref) {
					this.ref = ref;
					this.alreadyNew = hasClass(this.ref, "newReplies");
					this.replies = +getFirstByClassName(ref, "boards_sidebar_topics_num_replies").textContent.match(/\(\d+ /)[0].replace(/\(/,"").replace(/ /, "");
					this.topicNumber = +getFirstByTagName(ref, "a").href.split("/")[5];
					}
				
				function getReplies(ts) {
					var len = ts.length, arr = [];
					for(var i=0; i<len; i++)
						arr.push(new recentReply(ts[i]));
					return arr;
					}
				
				var oldReplies = getReplies(oldTopics);
				
				var temp = createElementX("div", {innerHTML: newRecent});
				
				var newTopics = getTopics(temp);
				var newReplies = getReplies(newTopics);
				
				function findReply(arr, func) {
					var len = arr.length;
					for(var i=0; i<len; i++) if(func(arr[i])) return arr[i];
					return null;
					}
				
				var len = newReplies.length;
				for(var i=0; i<len; i++) {
					var thisReply = newReplies[i];
					var same = findReply(oldReplies, function(a) {
						return a.topicNumber == thisReply.topicNumber;
						});
					if(same && (same.alreadyNew || thisReply.replies>same.replies))
						addClass(newTopics[i], "newReplies");
					}
					
				wrapper.innerHTML = temp.innerHTML;
				
				customEvent(wrapper, "recentPostsChange");
				
				});
			
			}
		
		Listeners.add(document, 'keydown', function(e) {
	
			if(!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
			
			//`~
			if(e.which==192) {
				e.preventDefault();
				Autorefresh.page.dontRefresh = !Autorefresh.page.dontRefresh;
				Autorefresh.page.outlinee.style.outlineColor = (Autorefresh.page.dontRefresh) ? "red" : "transparent"; 
				}

			//F5
			if(e.which==116) {
				e.preventDefault();
				Autorefresh.page.action(true);
				}
			
			}, true);
		
		this.refreshers.push(this.page);
		}
	else this.page = null;
	
	//initialize pm count refresher
	if(this.pmCount) {
		this.pms = new Refresher(function(){
			return "http://boards.ign.com/PrivateMessages/NewPMCount.aspx?caption=&rand=" + Math.floor(Math.random()*9999999999) + "&contenttype=javascript";
			}, 
			this.pmCountInt);
		this.pms.accept = "text/javascript, text/xml, text/plain";
		this.pms.name = "PM";
		this.pms.actions.push(function(details) {
		
			if(!Autorefresh) return;
		
			var PMArea = document.getElementById("boards_user_private_messages_wrapper");
			var PMCount = Autorefresh.getPMCount(details.responseText);
			var oldPMCount = 0;
			if(PMCount) {
				if(!PMArea) {
					document.getElementById("boards_user_profile_container").appendChild(PMArea = createElementX("div", {
					id: "boards_user_private_messages_wrapper",
					innerHTML:
						'<a href="/PrivateMessages/">' +
							//I'm guessing because this is invalid HTML (div inside anchor), another anchor is created
							//inside the div.  Annoying, but it lets us identify through CSS when a new PM is caught.
							'<div id="boards_user_private_messages"></div>' +
						'</a>'
						}));
					customEvent(PMArea, "newPMBubble");
					}
				if(PMArea && (oldPMCount=PMArea.textContent/1)!=PMCount) {
					getFirstByTagName(PMArea, "div").textContent = PMCount;
					if(PMCount > oldPMCount) {
						addClass(PMArea, "newPM");
						customEvent(PMArea, "morePMs");
						}
					else customEvent(PMArea, "lessPMs");
					}
				}
			else if(PMArea) {
				PMArea.parentNode.removeChild(PMArea);
				customEvent(document.getElementById("boards_user_profile_container"), "PMBubbleRemoved");
				}
				
			var wrapper = document.getElementById("boards-pm");
			var headerPMArea = document.getElementById("newPmCountLayer");
			if(headerPMArea) {
				if(headerPMArea.innerHTML!="") oldPMCount = headerPMArea.innerHTML.split("&")[0];
				else oldPMCount = 0;
				if(oldPMCount!=PMCount) {
					headerPMArea.innerHTML = PMCount ? PMCount + '&nbsp;New' : "";
					if(wrapper) wrapper.style.cssText = PMCount ? "display: list-item" : "";
					customEvent(wrapper, (PMCount>oldPMCount ? "morePMs" : "lessPMs"));
					}
				}
			
			});
		this.pms.checks.push(null);
		this.refreshers.push(this.pms);
		}
	else this.pms = null;
	
	
	
	//basically just add a bunch of event listeners to see if window is focused or not
	Listeners.add(window, 'blur', function(event) {
		Autorefresh.inFocus = false;
		}, true);
		
	Listeners.add(window, 'focus', function(event) {
		Autorefresh.inFocus = true;
		if(I.url.pageType=="board" && Autorefresh.topics) Autorefresh.page.action();
		if(Autorefresh.pmCount) Autorefresh.pms.action();
		}, true);
		
	Listeners.add(window, 'mouseover', function(event) {
		Autorefresh.inFocus = true;
		}, true);
		
	Listeners.add(window, 'mouseout', function(event) {
		Autorefresh.inFocus = true;
		}, true);
		
	Listeners.add(window, 'scroll', function(event) {
		Autorefresh.inFocus = true;
		}, true);
		
		
	
	//get all of the refreshers going
	for(var i=0, len=this.refreshers.length; i<len; i++) {
		var thisRef = this.refreshers[i];
		//using an anonymous function here with .call(thisRef) seems to fail
		//it's like it creates all of the setIntervals, but only the action
		//of the last refresher is called - stupid!
		//I think using let could fix this
		//luckily, chrome supports this 3 argument syntax
		thisRef.timer = setInterval(thisRef.action, thisRef.interval, thisRef);
		}
		
	Cleanup.add(function() {
		var refs = Autorefresh.refreshers;
		for(var i=0, len=refs.length; i<len; i++)
			if(defined(refs[i].timer))
				clearInterval(refs[i].timer);
		});
	
	}
	
Cleanup.add(function(){ Autorefresh = null; });
