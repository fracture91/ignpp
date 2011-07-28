
/*
Periodically requests some content from the network.
ContentUpdaters can be added which will have onLoad methods called with details.
Refresh interval determined by first updater added.
init method must be called to start refreshing.
*/
var Refresher = extend(Model, function () {
	Model.call(this);
	
	/*
	All contentUpdaters subscribed (also in this._observers).
	*/
	this._contentUpdaters = [];
	
	/*
	A Date representing when the last request ended.
	*/
	this.requestEndDate = new Date();
	
	/*
	True if currently refreshing.
	*/
	this._refreshing = false;
	
	/*
	The object returned by GM_xmlhttpRequest which lets us abort the current request.
	*/
	this._gynecologist = null;
	
	/*
	The interval to refresh at, in milliseconds.
	Set by this.init to the interval of the first ContentUpdater.
	Whenever set, this.backgroundInterval is updated accordingly.
	*/
	this._interval = 10000;
	
	/*
	Interval ID returned by setInterval.
	*/
	this._intervalID = null;
	
	/*
	The interval to refresh at when this tab isn't focused, in milliseconds.
	Managed by the setter for this.interval,
	should always be this.backgroundIntervalMultiplierPref * this.interval.
	*/
	this._backgroundInterval;
	
	/*
	Background interval ID returned by setInterval.
	*/
	this._backgroundIntervalID = null;
	
	},
{
	
	/*
	The subject of this refresher for use in logging (Page, PM Count).
	*/
	subject: "Generic",
	
	/*
	The HTTP Accept header value to use.
	*/
	accept: "text/html, text/xml, text/plain",
	
	/*
	The target URL to request.  Can be a function that returns a string or just a string.
	*/
	_url: window.location.href,
	
	get interval() {
		return this._interval;
		},
		
	set interval(n) {
		//don't touch after calling setIntervals
		if(!this._intervalID) {
			this._interval = n;
			this._backgroundInterval = this._interval * this.backgroundIntervalMultiplierPref;
			}
		},
		
	get backgroundInterval() {
		return this._backgroundInterval;
		},
		
	/*
	How long the browser must be idle until this stops refreshing, in milliseconds.
	*/
	get idleTimeoutPref() {
		return GM_getValue("autorefreshIdleTimeout", 600000); //10 minutes
		},
	
	/*
	this.interval is set to the interval of the first ContentUpdater.
	Call this.setIntervals to start refreshing.
	*/
	init: function() {
		if(this._contentUpdaters[0]) {
			this.interval = this._contentUpdaters[0].interval;
			}
		this.setIntervals();
		},
		
	/*
	Start the timers to periodically call this.request.
	*/
	setIntervals: function() {
		var that = this;
		this._intervalID = setInterval(function() {
			that.request();
			}, this.interval);
		this._backgroundIntervalID = setInterval(function() {
			that.request(undefined, true);
			}, this.backgroundInterval);
		},
	
	/*
	What this._interval should be multiplied by to get this._backgroundInterval.
	*/
	get backgroundIntervalMultiplierPref() {
		return GM_getValue("autorefreshBackgroundIntervalMultiplier", 10);
		},
	
	/*
	The target URL to request.
	*/
	get url() {
		return typeof this._url == "function" ? this._url() : this._url;
		},
	set url(s) { this._url = s; },
	
	/*
	Add a ContentUpdater to this Refresher to get onLoadEvent called.
	Also added as a plain old observer.
	The first ContentUpdater added determines the refresh rate with its interval property.
	*/
	addContentUpdater: function(updater) {
		var bak = this._observers;
		this._observers = this._contentUpdaters;
		this.addObserver(updater); //add to this._contentUpdaters
		this._observers = bak;
		this.addObserver(updater); //add to this._observers
		},
	
	/*
	Returns true if any ContentUpdater isReady, false otherwise.
	*/
	updatersAreReady: function() {
		for(var i=0, len=this._contentUpdaters.length; i<len; i++) {
			if(this._contentUpdaters[i].isReady()) {
				return true;
				}
			}
		return false;
		},
		
	/*
	True if this should refresh when the tab isn't focused.
	*/
	get backgroundPref() {
		return GM_getValue("autorefreshBackground", true);
		},
		
	/*
	True if this tab is in focus, false otherwise.
	Managed by RefreshListViewController.
	*/
	_inFocus: false,
	
	get inFocus() {
		if(chrome) {
			/*
			document.hasFocus() always returns true on Chrome, so we have to fall
			back to this manually maintained variable.
			See issue #229 and http://code.google.com/p/chromium/issues/detail?id=64846
			*/
			return this._inFocus;
			}
		return document.hasFocus();
		},
		
	set inFocus(b){
		return this._inFocus = b
		},
	
	/*
	True if focus should be considered when a request is deciding to continue or not.
	*/
	focusMatters: true,
	
	/*
	Returns true if this refresher is ready to make a request.
	background should be true if this is a request originating from the background interval.
	Only considered ready when not currently refreshing, at least one ContentUpdater isReady,
	the browser has not been idle for this.idleTimeoutPref or longer if focusMatters,
	and the tab is in an acceptable focus state considering focusMatters and background.
	*/
	isReady: function(background) {
		if(!this._refreshing) {
			var goodIdle = !this.focusMatters || !GM_idle(this.idleTimeoutPref);
			//yay Karnaugh maps
			var goodFocus = !this.focusMatters && !background ||
				this.inFocus && !background ||
				this.focusMatters && !this.inFocus && background && this.backgroundPref;
			if(goodIdle && goodFocus && this.updatersAreReady()) {
				return true;
				}
			}
		return false;
		},
	
	/*
	Perform a request for this.url if this.isReady is true.
	If override is true, do it regardless of anything else - any request in progress is aborted.
	this.onLoad is called when the request is done.
	*/
	request: function(override, background) {
		if(override) {
			this.abort();
			}
		else if(!this.isReady(background)) {
			return;
			}
		
		this.change({_refreshing: true});
		var that = this;
		this._gynecologist = GM_xmlhttpRequest({
			method: "GET",
			url: this.url,
			headers: {"Accept": this.accept},
			onload: function(details) {
				that.onLoad(details, override, background);
				}
			});
		},
		
	/*
	Fire load event, providing details from the request
	and the override/background value (passed along from this.request).
	*/
	onLoad: function(details, override, background) {
		this.onRequestEnd();
		vlog(this.subject + (background ? " Background" : "") + " Refresher Load");
		this.event("load", details, override, background);
		},
		
	/*
	Should be called when the request ends.
	Clears refreshing flag and gynecologist.
	*/
	onRequestEnd: function() {
		this.change({_refreshing: false});
		this._gynecologist = null;
		this.requestEndDate = new Date();
		},
	
	/*
	Abort the request in progress, if any.
	*/
	abort: function() {
		if(this._gynecologist) {
			this._gynecologist.abort();
			this.onRequestEnd();
			}
		},
		
	/*
	Returns true if current time - requestEndDate > interval.
	now can be a Date object to use for efficiency's sake.
	*/
	isOutdated: function(now) {
		return (now ? now : new Date()) - this.requestEndDate > this.interval;
		}
	
	});
	
	
/*
Subclasses Refresher.
Responsible for refreshing the current page.
*/
var PageRefresher = extend(Refresher, function () {
	Refresher.call(this);
	if(I.url.pageType == "board") {
		this.url = I.url.boardUrl;
		}
	},
{
	subject: "Page",

	/*
	True if the user wants to trigger a refresh after posting a reply.
	*/
	get afterPostingPref() {
		return GM_getValue("autorefreshRepliesAfterPosting", true);
		}
		
	});

/*
Subclasses Refresher.
Responsible for refreshing the little PM Count JS file.
*/
var PMCountRefresher = extend(Refresher, function () {
	Refresher.call(this);
	},
{
	subject: "PM Count",
	accept: "text/javascript, text/plain",
	_url: function() {
		/*
		This has a randomized number in it, so we need to actually call it seperately
		rather than set _url to a string.
		*/
		return I.url.PMCountUrl;
		}
	});
	
	
	
/*
Observes a refresher and updates some content on the page
based on the refresher's network response.
contentElement is optional, unless hoverMatters is true, then it's required.
*/
var ContentUpdater = extend(Model, function(refresher, contentElement, hoverMatters) {
	Model.call(this);
	
	/*
	The refresher this is observing.
	*/
	this.refresher = refresher;
	refresher.addContentUpdater(this);
	
	this._autorefresh = this.autorefreshPref;
	this._disabled = false;
	
	/*
	The autorefresh state before this was disabled.
	*/
	this._autorefreshBeforeDisable = this._autorefresh;
	
	/*
	The element this is responsible for updating.
	*/
	this.contentElement = contentElement;
	
	/*
	If true, isReady will return false if the mouse is hovering over this.contentElement.
	*/
	this.hoverMatters = hoverMatters;
	
	/*
	True if the mouse is currently over the contentElement, false otherwise.
	Controlled by listeners added in this.addMouseOverListeners.
	*/
	this.mouseOverContentElement = false;
	
	/*
	The interval this would like to receive updates at in milliseconds.
	Does not guarantee that the refresher will honor it.
	*/
	this.interval = this.intervalPref;
	
	if(this.hoverMatters) {
		this.addMouseOverListeners();
		}
	
	},
{
	
	/*
	What this is responsible for updating ("Topics", "PM Count", etc.)
	*/
	subject: "Generic",
	
	/*
	The preference which determines the default state of this.autorefresh.
	*/
	get autorefreshPref() {
		return false;
		},
		
	/*
	The preference which determines this.interval.
	*/
	get intervalPref() {
		return 10000;
		},
		
	/*
	True if the user wants autorefresh to occur for this content.
	Cannot change if this.disabled is true.
	*/
	get autorefresh() {
		return this._autorefresh;
		},
		
	set autorefresh(b) {
		if(!this._disabled) {
			this._autorefresh = b;
			}
		return this._autorefresh;
		},
		
	/*
	True if the client shouldn't be able to change this.autorefresh.
	When true, this.autorefresh is always false and can't be changed.
	When changed back to false, this.autorefresh changes to the state it was in before disabling.
	*/
	get disabled() {
		return this._disabled;
		},
		
	set disabled(b) {
		if(this._disabled != b) {
			if(b) {
				this.change({_autorefreshBeforeDisable: this.autorefresh});
				this.change({autorefresh: false});
				this._disabled = b;
				}
			else {
				this._disabled = b;
				this.change({autorefresh: this._autorefreshBeforeDisable});
				}
			}
		return this._disabled;
		},
	
	/*
	Add listeners to this.contentElement (if set) which keep track of this.mouseOverContentElement.
	Called automatically in the constructor if this.hoverMatters is true.
	*/
	addMouseOverListeners: function() {
		if(this.contentElement) {
			var that = this;
			Listeners.add(this.contentElement, 'mouseover', function(e) { that.mouseOverContentElement = true; }, false);
			Listeners.add(this.contentElement, 'mouseout', function(e) { that.mouseOverContentElement = false; }, false);
			}
		},
	
	/*
	Should return true if this is ready to receive a request.
	*/
	isReady: function() {
		return this.autorefresh && (!this.hoverMatters || !this.mouseOverContentElement);
		},
		
	/*
	Is called when the refresher loads with details of the request.
	Calls this.updateContent if ready or overridden.
	*/
	onLoadEvent: function(source, details, override, background) {
		//Ready state could have changed between request start and load
		if(override || this.isReady()) {
			this.updateContent(details, override, background);
			}
		},
		
	/*
	Update the content on the page with content from details.
	Override is true if this resulted from an overridden request.
	*/
	updateContent: function(details, override, background) {
		//something very simple that subclasses should override
		if(this.contentElement) {
			this.contentElement.textContent = details.responseText;
			}
		}
	
	});
	
	
/*
Responsible for updating the topics list on a board.
Shouldn't update when the mouse is over the topics list.
refresher should be a PageRefresher.
*/
var TopicsUpdater = extend(ContentUpdater, function(refresher) {
	ContentUpdater.call(this, refresher, document.getElementById("boards_board_list_table"), true);
	},
{
	
	subject: "Topics",
	
	//override
	get autorefreshPref() {
		return GM_getValue("autorefreshTopics", true);
		},
		
	//override
	get intervalPref() {
		return GM_getValue("autorefreshTopicsInt", 5000);
		},
	
	/*
	Given the response text from the refresher, return the innerHTML
	of the new topics area.
	*/
	getTable: function(content) {
		var x = content.indexOf('id="boards_board_list_table"'); //set x = position of that id
		if(x == -1) return "";

		x = content.indexOf(">", x); //find end of tag
		if(x == -1) return "";

		var y = content.indexOf('<!-- /Thread List -->', x); //find end of topic list
		if(y == -1) return "";
		
		y = content.lastIndexOf('</div>', y);
		if(y == -1 || y < x) y = content.indexOf('<!-- /Thread List -->', x);
		if(y == -1) return "";
		
		return content.slice(x + 1, y);   //return stuff between <tag...id=""> and </tag>
		},
	
	//override
	updateContent: function(details, override, background) {
		//replace the table on the page with the contents of the table in responsetext
		if(!this.contentElement) return;
		var newTable = this.getTable(details.responseText);
		if(newTable != "") {
			this.contentElement.innerHTML = newTable;
			window.pageTopics = new Topics(this.contentElement);
			pageTopics.augment();
			customEvent(this.contentElement, "topicListChange");
			}
		}
	
	});


/*
Responsible for updating a topic page with new replies, edits, poll changes, paginators.
this.url will change to a URL with a reply ID after the user posts a reply.
*/
var RepliesUpdater = extend(ContentUpdater, function(refresher) {
	ContentUpdater.call(this, refresher, document.getElementById("boards_full_width"));
	
	/*
	Since this.url can change, we need to keep a backup of the last valid URL
	just in case this.url is changed to one that points to a different page.
	*/
	this.lastValidUrl = this.refresher.url;
	},
{
	
	subject: "Replies",
	
	//override
	get autorefreshPref() {
		return GM_getValue("autorefreshReplies", true);
		},
		
	//override
	get intervalPref() {
		return GM_getValue("autorefreshRepliesInt", 5000);
		},
		
	/*
	True if the user wants this to catch new edits.
	*/
	get editsPref() {
		return GM_getValue("autorefreshEdits", true);
		},
		
	/*
	True if the user wants this to catch poll changes.
	*/
	get pollsPref() {
		return GM_getValue("autorefreshPolls", true);
		},
	
	/*
	Given the new Replies object, update the current paginator
	with the content from the new object.
	*/
	updatePaginator: function(newReplies) {
		if(newReplies.pages && newReplies.lastPage > pageReplies.lastPage) {
			
			var botPag, topPag = document.getElementById('boards_pagination_wrapper');
			if(topPag) {
				//if the paginators already exist on this page, set their innerHTML
				botPag = document.getElementById('boards_bottom_pagination_wrapper');
				topPag.innerHTML = botPag.innerHTML = newReplies.pages.innerHTML;
				
				customEvent(topPag, "paginatorChange");
				customEvent(botPag, "paginatorChange");
				}
			else {
				//otherwise, we need to add in the whole element
				var bfw = document.getElementById("boards_full_width");
				topPag = newReplies.pages.cloneNode(true);
				var topTarget = I.layout.fresh ? getFirstByClassName(bfw, 'boards_thread_row')
												: bfw.getElementsByClassName('clear')[1];
				bfw.insertBefore(topPag, topTarget);
				
				botPag = newReplies.pages.cloneNode(true);
				botPag.id = "boards_bottom_pagination_wrapper";
				bfw.parentNode.insertBefore(botPag, bfw.nextSibling.nextSibling);
				
				customEvent(topPag, "newPaginator");
				customEvent(botPag, "newPaginator");
				}
			
			}
		},
	
	/*
	Given an old Reply and a new Reply, replace the old reply's post content with the new reply's.
	*/
	applyEdit: function(oldReply, newReply) {
		addClass(oldReply.ref, "editedReply");
		newReply.fixEmbeds(); //get rid of the script element that breaks everything
		oldReply.postContent = newReply.allPostContent;
		oldReply.subject = newReply.subject;
		customEvent(oldReply.ref, "replyEdited");
		},
	
	//override
	updateContent: function(details, override, background) {
		//make a new Replies object out of the slice of text containing all the replies
		var newReplies = new Replies(details.responseText);
		
		//make sure we're fetching the right page - target can change
		if(pageReplies.currentPage != newReplies.currentPage) {
			//we fetched the wrong page!  reset the target and stop with the refresh at hand
			this.url = this.lastValidUrl;
			return;
			}
		
		this.lastValidUrl = this.url;
		
		var len = newReplies.length;
		var oldLen = pageReplies.length;
		//if this is true, we definitely have an old copy of the page
		if(len < oldLen) return;
		
		var reached = false, //true after the first iteration when i >= oldLen
		newStuff = false; //true after the loop if there were any new replies or edits
		
		//loop through all the replies
		for(var i=0; i<len; i++) {
		
			var newReply = newReplies.get(i);
			var oldReply = pageReplies.get("#" + newReply.id);
		
			//if this post is already here
			if(oldReply) {
				//if there's a new edit
				if(this.editsPref && (newReply.editCount > oldReply.editCount)) {
					this.applyEdit(oldReply, newReply);
					newStuff = true;
					}
				//if it's the first post and there's a poll on the page
				if(this.pollsPref && i==0 && oldReply.poll) {
					//if the poll has more votes, update it
					if(oldReply.votes < newReply.votes) oldReply.poll = newReply.poll;
					}
				}
			//otherwise, it's a new post
			else if(reached || i >= oldLen) {
				if(!reached) {
					//now we'll need to start adding new replies, so we have to augment the new ones
					reached = true;
					newReplies.erase(0, i-1);
					len = newReplies.length;
					i = 0;
					newReplies.augment(pageReplies);
					}
				addClass(newReply.ref, "newReply");
				newReply.fixEmbeds();
				//add the new reply
				pageReplies.add(newReply);
				newStuff = true;
				customEvent(newReply.ref, "newReply");
				}
		
			}
		
		newReplies = null;
		if(newStuff) resize(window);
		}
	
	});


/*
Responsible for updating the recent posts area on the bottom.
Recent posts area must be at least partially visible for this to be ready.
*/
var RecentUpdater = extend(ContentUpdater, function(refresher) {
	ContentUpdater.call(this, refresher, document.getElementById("boards_add_info_my_recent_posts"), true);
	},
{
	
	subject: "Recent Posts",
	
	//override
	get autorefreshPref() {
		return GM_getValue("autorefreshRecent", true);
		},
	
	//override
	get intervalPref() {
		//this doesn't have its own pref, uses interval of the Topic or Replies Updater
		if(I.url.pageType == "topic"){
			return RepliesUpdater.prototype.intervalPref;
			}
		else {
			return TopicsUpdater.prototype.intervalPref;
			}
		},
	
	//override
	isReady: function() {
		return ContentUpdater.prototype.isReady.call(this)
				&& (new Position(this.contentElement)).someVisible;
		},
	
	/*
	Given the response text from the refresher,
	return the innerHTML of the recent posts area.
	*/
	getRecent: function(content) {
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
		},
		
	/*
	Get the recent area topics within some wrapper element.
	*/
	getTopics: function getTopics(el) {
		return el.getElementsByClassName("boards_topic_tabs_row");
		},
		
	/*
	Constructor for a class that provides basic information for a recent reply.
	*/
	recentReply: function(ref) {
		this.ref = ref;
		this.alreadyNew = hasClass(this.ref, "newReplies");
		this.replies = +getFirstByClassName(ref, "boards_sidebar_topics_num_replies").textContent.match(/\(\d+ /)[0].replace(/\(/,"").replace(/ /, "");
		this.topicNumber = +getFirstByTagName(ref, "a").href.split("/")[5];
		},
		
	/*
	Given an array of elements, return an array of recentReply constructed with those elements.
	*/
	getReplies: function(els) {
		var len = els.length, arr = [];
		for(var i=0; i<len; i++)
			arr.push(new this.recentReply(els[i]));
		return arr;
		},
		
	/*
	Given an array of recentReply, return a recentReply for which func(recentReply) returns true.
	*/
	findReply: function (arr, func) {
		var len = arr.length;
		for(var i=0; i<len; i++) if(func(arr[i])) return arr[i];
		return null;
		},
	
	//override
	updateContent: function(details, override, background) {
		
		var newRecent = this.getRecent(details.responseText);
		if(newRecent == "") return;
		
		var wrapper = getFirstByTagName(this.contentElement, "div");
		var oldTopics = this.getTopics(wrapper);
		var oldReplies = this.getReplies(oldTopics);
		
		var temp = createElementX("div", {innerHTML: newRecent});
		var newTopics = this.getTopics(temp);
		var newReplies = this.getReplies(newTopics);
		
		var len = newReplies.length;
		for(var i=0; i<len; i++) {
			var thisReply = newReplies[i];
			var same = this.findReply(oldReplies, function(a) {
				return a.topicNumber == thisReply.topicNumber;
				});
			if(same && (same.alreadyNew || thisReply.replies>same.replies))
				addClass(newTopics[i], "newReplies");
			}
			
		wrapper.innerHTML = temp.innerHTML;
		
		customEvent(wrapper, "recentPostsChange");
		
		}
	
	});


var PMCountUpdater = extend(ContentUpdater, function(refresher) {
	ContentUpdater.call(this, refresher);
	},
{
	
	subject: "Unread PM Count",
	
	//override
	get autorefreshPref() {
		return GM_getValue("autorefreshPMCount", true);
		},
		
	//override
	get intervalPref() {
		return GM_getValue("autorefreshPMCountInt", 3000);
		},
	
	/*
	Given the response text from a request, return the number of PMs the user has.
	*/
	getPMCount: function(content) {
		var x = content.indexOf('elPmCount.innerHTML = "'); //set x = position of that id
		if(x == -1) return 0;
		x += 23;
		
		var y = content.indexOf('&', x); //find ampersand
		if(y == -1) y = content.indexOf('"', x);
		if(y == -1) return 0;

		return +content.slice(x, y);
		},
		
	//override
	updateContent: function(details, override, background) {
		
		var PMAreaID = "boards_user_private_messages_wrapper";
		var PMArea = document.getElementById(PMAreaID);
		var PMCount = this.getPMCount(details.responseText);
		var container = document.getElementById("boards_user_profile_container");
		var oldPMCount = 0;
		if(PMCount > 0) {
			if(!PMArea) {
				PMArea = createElementX("div", {
					id: PMAreaID,
					innerHTML:
						'<a href="/PrivateMessages/">' +
							//this is invalid HTML (div inside anchor)
							'<div id="boards_user_private_messages"></div>' +
						'</a>'
					});
				container.appendChild(PMArea);
				customEvent(PMArea, "newPMBubble");
				}
			oldPMCount = +PMArea.textContent;
			if(oldPMCount != PMCount) {
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
			customEvent(container, "PMBubbleRemoved");
			}
		
		}
	
	});

	
var RefresherListModel = extend(Model, function(refreshers) {
	Model.call(this);
	this.refreshers = refreshers;
	this.forEach(function(e, i, a) {
		e.addObserver(this);
		});
	},
{
	_focusMatters: Refresher.prototype.focusMatters,

	get focusMatters() {
		return this._focusMatters;
		},
		
	set focusMatters(b) {
		this.forEach(function(e, i, a) {
			e.change({focusMatters: b});
			});
		return this._focusMatters = b;
		},
		
	_disabled: ContentUpdater.prototype._disabled,
		
	get disabled() {
		return this._disabled;
		},
		
	set disabled(b) {
		this.forEachUpdater(function(e, i, a) {
			e.change({disabled: b});
			});
		return this._disabled = b;
		},
		
	_refreshing: false,
		
	onModelChangeEvent: function(source, changes) {
		if("_refreshing" in changes) {
			var anyRefreshing = changes._refreshing;
			if(!anyRefreshing) {
				this.forEach(function(e, i, a) {
					if(e._refreshing) anyRefreshing = true;
					});
				}
			if(this._refreshing != anyRefreshing) {
				this.change({_refreshing: anyRefreshing});
				}
			}
		},

	/*
	Call some function for each refresher.
	*/
	forEach: function(func, thisObj) {
		if(!defined(thisObj)) thisObj = this;
		return this.refreshers.forEach(function(e, i, a) {
			func.call(thisObj, e, i, a);
			});
		},

	/*
	Call some function for each updater on each refresher in this.refreshers.
	*/
	forEachUpdater: function(func, thisObj) {
		if(!defined(thisObj)) thisObj = this;
		this.forEach(function(e, i, a){
			e._contentUpdaters.forEach(function(e, i, a) {
				func.call(thisObj, e, i, a);
				});
			});
		},
		
	/*
	Call request method of any refreshers which haven't been refreshed for interval milliseconds.
	*/
	refreshOutdated: function() {
		var now = new Date();
		this.forEach(function(e, i, a) {
			if(e.isOutdated(now)) {
				e.request();
				}
			});
		}
	});
	


var ContentUpdaterView = extend(View, function(parent, before, model) {
	View.call(this, parent, before, model);
	this.checkbox = null;
	this.labelText = null;
	},
{
	className: "ContentUpdaterView",
	createContainer: function() {
		this.container = document.createElement("label");
		},
	decorateContainer: function() {
		View.prototype.decorateContainer.call(this);
		addClass(this.container, "ContentUpdaterView");
		},
	createEverythingElse: function() {
		this.checkbox = createElementX("input", {type: "checkbox"});
		this.labelText = document.createTextNode("");
		this.container.appendChild(this.checkbox);
		this.container.appendChild(this.labelText);
		},
	onModelSubjectChange: function(source, value) {
		this.labelText.textContent = value;
		},
	onModelAutorefreshChange: function(source, value) {
		this.checkbox.checked = value;
		},
	onModelDisabledChange: function(source, value) {
		this.checkbox.disabled = value;
		}
	});
	
var ContentUpdaterController = extend(Controller, function() {
	Controller.call(this);
	},
{
	viewClass: ContentUpdaterView,
	init: function() {
		this.addViewListener(document, "change", this.onChange, true, this.onChangePrec);
		},
	onChangePrec: function(e) {
		return e.target && e.target.tagName == "INPUT" && e.target.type == "checkbox";
		},
	onChange: function(e, instance) {
		instance.model.change({autorefresh: e.target.checked});
		}
	});
	
(new ContentUpdaterController()).init();

var RefresherView = extend(View, function(parent, before, model) {
	View.call(this, parent, before, model);
	this.refreshButton = null;
	this.contentUpdaterViews = [];
	this.model._contentUpdaters.forEach(function(e, i, a) {
		this.contentUpdaterViews.push(new ContentUpdaterView(null, null, e));
		}, this);
	},
{
	className: "RefresherView",
	createContainer: function() {
		var container = this.container = document.createElement("fieldset");
		this.contentUpdaterViews.forEach(function(e, i, a) {
			e.parent = container;
			});
		},
	decorateContainer: function() {
		View.prototype.decorateContainer.call(this);
		addClass(this.container, "RefresherView");
		},
	createEverythingElse: function() {
		this.refreshButton = createElementX("input", {type: "button"});
		this.container.appendChild(this.refreshButton);
		this.contentUpdaterViews.forEach(function(e, i, a) {
			e.render();
			});
		},
	commit: function() {
		this.contentUpdaterViews.forEach(function(e, i, a) {
			e.commit();
			});
		View.prototype.commit.call(this);
		},
	onModelSubjectChange: function(source, value) {
		this.refreshButton.value = "Refresh " + value;
		},
	onModel_refreshingChange: function(source, value) {
		this.container.setAttribute("refreshing", value);
		}
	});

var RefresherController = extend(Controller, function() {
	Controller.call(this);
	},
{
	viewClass: RefresherView,
	init: function() {
		this.addViewListener(document, "click", this.onClick, true, this.onClickPrec);
		},
	onClickPrec: function(e) {
		return e.which == 1 && e.target && e.target.tagName == "INPUT" &&
				e.target.type == "button";
		},
	onClick: function(e, instance) {
		if(e.target == instance.refreshButton) {
			instance.model.request(true);
			}
		}
	});
	
(new RefresherController()).init();
	
	
var RefresherListView = extend(View, function(parent, before, model) {
	View.call(this, parent, before, model);
	
	/*
	Array of RefresherView that are contained in this view.
	*/
	this.refresherViews = [];
	
	this.model.forEach(function(e, i, a) {
		this.refresherViews.push(new RefresherView(null, null, e));
		}, this);
	
	},
{
	className: "RefresherListView",
	createContainer: function() {
		View.prototype.createContainer.call(this);
		this.refresherViews.forEach(function(e, i, a) {
			e.parent = this.container;
			}, this);
		},
	decorateContainer: function() {
		View.prototype.decorateContainer.call(this);
		addClass(this.container, "RefresherListView");
		},
	createEverythingElse: function() {
		this.refreshButton = createElementX("input", {type: "button", value: "Refresh All"});
		this.disableButton = createElementX("input", {type: "button"});
		this.focusLabel = createElementX("label", {textContent: "Focus Matters"});
		this.focusCheckbox = createElementX("input", {type: "checkbox"});
		this.focusLabel.insertBefore(this.focusCheckbox, this.focusLabel.firstChild);
		this.container.appendChild(this.refreshButton);
		this.container.appendChild(this.disableButton);
		this.container.appendChild(this.focusLabel);
		this.refresherViews.forEach(function(e, i, a) {
			e.render();
			});
		},
	commit: function() {
		View.prototype.commit.call(this);
		this.refresherViews.forEach(function(e, i, a) {
			e.commit();
			});
		},
	onModelDisabledChange: function(source, value) {
		this.disableButton.value = value ? "Enable All" : "Disable All";
		},
	onModelFocusMattersChange: function(source, value) {
		this.focusCheckbox.checked = value;
		},
	onModel_refreshingChange: function(source, value) {
		this.container.setAttribute("refreshing", value);
		}
	});


var RefresherListController = extend(Controller, function() {
	Controller.call(this);
	},
{	
	viewClass: RefresherListView,

	get inFocus() {
		return Refresher.prototype.inFocus;
		},
		
	set inFocus(b) {
		Refresher.prototype.inFocus = b;
		this.forEachView(function(e, i, a) {
			e.model.forEach(function(e, i, a) {
				e.inFocus = b;
				});
			});
		},

	init: function() {
		this.addMyListener(document, "keyup", this.onKeyup, true);
		this.addViewListener(document, "click", this.onClick, true);
		this.addViewListener(document, "change", this.onChange, true, this.onChangePrec);
		this.addMyListener(window, "focus", this.onFocus, true);
		
		if(chrome) {
			function setFocus(b) {
				return function(e) {
					this.inFocus = b;
					}
				}
		
			//only Chrome needs these to maintain inFocus
			this.addMyListener(window, "blur", setFocus(false), true);
			this.addMyListener(window, "click", setFocus(true), true);
			this.addMyListener(window, "scroll", setFocus(true), true);
			}
		},

	/*
	Get all necessary refreshers and their updaters started.
	*/
	constructRefresherListModel: function() {	
		var list = [];
		var page = new PageRefresher();
		list.push(page);
		if(I.url.pageType == "board") {
			new TopicsUpdater(page);
			}
		else if(I.url.pageType == "topic") {
			new RepliesUpdater(page);
			}
		if(document.getElementById("boards_add_info_my_recent_posts")) {
			new RecentUpdater(page);
			}
		
		var pms = new PMCountRefresher();
		list.push(pms);
		new PMCountUpdater(pms);

		return new RefresherListModel(list);
		},
		
	constructRefresherListView: function() {
		var target;
		if(I.layout.fresh) {
			target = document.getElementById("boards_board_list_table_header") ||
					getFirstByClassName(document.body, "boards_thread_row");
			}
		else {
			target = document.getElementById("boards_board_list_table") ||
					document.getElementById("boards_thread_table");
			}
		var target = target || document.body.firstChild; 
		var view = new RefresherListView(target.parentNode, target, this.constructRefresherListModel());
		view.model.forEach(function(e, i, a) {
			e.init();
			});
		if(this.showControlsPref) {
			view.commit();
			}
		return view;
		},
		
	get showControlsPref() {
		return GM_getValue("autorefreshControls", true);
		},
		
	onFocus: function(e) {
		this.inFocus = true;
		this.forEachView(function(e, i, a) {
			e.model.refreshOutdated();
			});
		},
		
	onClickPrec: RefresherController.prototype.onClickPrec,
	onClick: function(e, instance) {
		if(e.target == instance.refreshButton) {
			this.requestAndOverride(instance.model);
			}
		else if(e.target == instance.disableButton) {
			this.toggleDisabled(instance.model);
			}
		},
		
	onChangePrec: ContentUpdaterController.prototype.onChangePrec,
	onChange: function(e, instance) {
		if(e.target == instance.focusCheckbox) {
			instance.model.change({focusMatters: e.target.checked});
			}
		},
		
	/*
	Call request(true) for each Refresher in the given model.
	*/
	requestAndOverride: function(model) {
		model.forEach(function(e, i, a) {
			e.request(true);
			});
		},
		
	/*
	Given a model, toggle its disabled state.
	*/
	toggleDisabled: function(model) {
		model.change({disabled: !model.disabled});
		},
		
	KEYS: {
		DISABLE: "A".charCodeAt(0),
		REFRESH: "R".charCodeAt(0)
		},
		
	/*
	Return true if code is in this.KEYS.
	*/
	codeInKeys: function(code) {
		for(var i in this.KEYS) {
			if(this.KEYS[i] == code) {
				return true;
				}
			}
		},
		
	/*
	This should be called on keyup.
	Handles keyboard shotcuts.
	*/
	onKeyup: function(e) {
		
		this.inFocus = true;
		if(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
		if(!this.codeInKeys(e.which)) return;
		if(Listeners.elementAcceptsInput(e.target)) return;
		
		e.preventDefault();
		
		switch(e.which) {
			case this.KEYS.DISABLE:
				this.forEachView(function(e, i, a) {
					this.toggleDisabled(e.model);
					});
				break;
			case this.KEYS.REFRESH:
				this.forEachView(function(e, i, a){
					this.requestAndOverride(e.model);
					});
				break;
			}
		
		}
	
	});
	
var Autorefresh = new RefresherListController();
Autorefresh.init();
Autorefresh.constructRefresherListView();



	