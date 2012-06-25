
//getters, setters, and prototype are awesome

/*
Notes on my learnings:

functions in prototype only have access to public members of the class
you can use getters and setters to essentially make private members public (and visible to prototype)
	see contentVisible
you cannot have a public member with public getters/setters with the same name
everything defined by prototype is public ^^^

*/


	
//represents a panel on the page
//used by Panels singleton
//returned by Panels.get and Panels.open
function Panel(parent, type, map) {
	
	this.type = type;
	
	//points to the HTML element of class Panel
	this.ref = document.createElement("div");
	GM_time("panel.html");
	this.ref.innerHTML = GM_getFile("extension://content/panel.html");
	GM_timeEnd("panel.html");
	this.ref = this.ref.firstChild;
	addClass(this.ref, type);
	this.editor = Editors.open(getFirstByClassName(this.ref, "middle"));
	
	this.heading = getFirstByClassName(this.ref, "panelHeading");
	this.content = getFirstByClassName(this.ref, "panelContent");
	this.top = getFirstByClassName(this.content, "top");
	
	this.titleRef = getFirstByClassName(this.heading, "title");
	
	this.winButs = this.heading.getElementsByTagName("img");
	
	this.lockRef = getFirstByClassName(this.content, "lock");
	
	this.userRef = getFirstByClassName(this.content, "user");
	
	this.subjectRef = getFirstByClassName(this.content, "subject");

	this.preview = getFirstByClassName(this.content, "preview");
	this.previewButtons = getFirstByClassName(this.content, "previewButtons");
	this.copyButton = getFirstByClassName(this.previewButtons, "copyButton");
	
	this.previewButton = getFirstByClassName(this.content, "previewButton");
	this.postButton = getFirstByClassName(this.content, "postButton");
	
	this.infoRef = getFirstByClassName(this.content, "info");
	
	this.eventValidationRef = getFirstByClassName(this.content, "eventValidation");
	this.viewStateRef = getFirstByClassName(this.content, "viewState");
	this.boardIdRef = getFirstByClassName(this.content, "boardId");
	this.topicIdRef = getFirstByClassName(this.content, "topicId");
	this.replyIdRef = getFirstByClassName(this.content, "replyId");
	
	var canLock = false;
	this.__defineGetter__("canLock", function(){return canLock;});
	//input actually doesn't matter, the setter checks everything for you
	this.__defineSetter__("canLock", function(b){
		var isEdit = this.type=="edit";
		canLock = isEdit && this.replyId==this.topicId
		if(!isEdit) return;
		if(canLock) addClass(this.top, "canLock");
		else removeClass(this.top, "canLock");
		});
		
	var contentVisible = true;
	this.__defineGetter__("contentVisible", function(){return contentVisible;});
	this.__defineSetter__("contentVisible", function(b){this.content.style.display = (contentVisible = b) ? "" : "none";});
	
	var sizeState = "normal";
	this.__defineGetter__("sizeState", function(){return sizeState;});
	this.__defineSetter__("sizeState", function(s){
		s = s.toLowerCase();
		if(sizeState!=s) {
			var thatRef = this.ref;
			var reset = function() {
				removeClass(thatRef, "maximized");
				removeClass(thatRef, "minimized");
				}
			switch(sizeState = s) {
				case "maximized": 
				case "minimized":
					reset();
					addClass(this.ref, s);
					break;
				case "normal":
				default:
					reset();
				}
			}
		});
		
	var previewOn = true;
	this.__defineGetter__("previewOn", function(){return previewOn;});
	this.__defineSetter__("previewOn", function(b){
		if(b!=previewOn) {
			
			this.preview.style.display = previewOn ? "none" : "block";
			this.previewButtons.style.display = previewOn ? "none" : "block";
			this.preview.innerHTML = '<img class="loadingIcon">';
			
			previewOn = !previewOn;
			
			}
		});
	this.previewOn = false;
	
	this.title = Panels.strings[type].title;
	this.postButton.value = Panels.strings[type].button;
	
	this.mapStuff(map);
			
	parent.appendChild(this.ref);
	resize(window);
	
	}
	
Cleanup.add(function(){ Panel = null; });
	
Panel.prototype = {
	
	type: null,
	ref: null,
	heading: null,
	winButs: null,
	content: null,
	postButton: null,
	
	
	get floating(){return window.getComputedStyle(this.ref, null).position == "fixed";},
	
	titleRef: null,
	get title(){return this.titleRef.textContent;},
	set title(s){this.titleRef.textContent = s;},
	
	lockRef: null,
	get lock(){return this.lockRef.checked;},
	set lock(b){this.lockRef.checked = b;},
	
	userRef: null,
	get user(){return this.userRef.value;},
	set user(s){this.userRef.value = s;},
	
	subjectRef: null,
	get subject(){return this.subjectRef.value;},
	set subject(s){this.subjectRef.value = s;},
	
	infoRef: null,
	get info(){return this.infoRef.innerHTML;},
	set info(s){this.infoRef.innerHTML=s;},
	
	eventValidationRef: null,
	get eventValidation(){return this.eventValidationRef.value;},
	set eventValidation(s){this.eventValidationRef.value = s;},
	
	viewStateRef: null,
	get viewState(){return this.viewStateRef.value;},
	set viewState(s){this.viewStateRef.value = s;},
		
	boardIdRef: null,
	get boardId(){return this.boardIdRef.value;},
	set boardId(s){
		this.boardIdRef.value = s;
		},
		
	topicIdRef: null,
	get topicId(){return this.topicIdRef.value;},
	set topicId(s){
		this.topicIdRef.value = s;
		},
	
	replyIdRef: null,
	get replyId(){return this.replyIdRef.value;},
	set replyId(s){
		this.replyIdRef.value = s;
		this.canLock = true;  //checked by setter
		},
	
	get visible(){return this.ref.style.display != "none";},
	set visible(b){this.ref.style.display = b ? "" : "none";},
	
	mapStuff: function(map) {
	
		if(map)
			for(var i in map)
				this[i] = map[i];
		
		},
		
	standardInit: function(map, isQuote) {

		if(!defined(isQuote)) isQuote = false;
	
		var wasVisible = this.visible;

		this.open();
		this.mapStuff(map);
		this.editor.moveCursor();
		this.autoFocus();
		//if there's only a uid in the user field, we need to get the username
		if(this.type=="pm" && !isNaN(this.user/1) && this.user/1!=0) {
			Message.getKeys(this, function(s, d, vs, ev) {
				
				function getUserName(text) {
					
					var start = text.indexOf('id="ctl00_ctl00_cphMain_cphMain_ccSendPMContent_txtUserName"');
					if(start!=-1) start = text.lastIndexOf("<", start);
					else return;
					if(start!=-1) start = text.indexOf('value="', start);
					else return;
					if(start!=-1) start += 7;
					else return;
					
					var end = text.indexOf('"', start);
					if(end!=-1) return text.slice(start, end);
					else return;
					
					}
					
				s.user = getUserName(d.responseText);
				
				});
			}
		else if(!isQuote || !wasVisible) Message.getKeys(this);
		
		},
	
	autoFocus: function() {
		
		this.editor.field.focus();
		this.editor.restoreSelection();
		if(this.subject=="") this.subjectRef.focus();
		if(this.type=="pm" && this.user=="") this.userRef.focus();
		
		},
		
	scrollTo: function() {
		
		if(Panels.scrollTo) scrollToEl(this.ref);
		
		},
		
	moveTo: function(parent) {
		
		if(parent != this.ref.parentNode) {
			//for pms in the little infobox
			if(Info.layout.fresh) removeClass(getParentByClassName(this.ref, "panelInside"), "panelInside");
			parent.appendChild(this.ref);
			}
		this.open();
		resize(window);
		this.scrollTo();
		
		},
	
	reply: function(ref, map, isQuote, wasVisible) {
		
		this.standardInit(map, isQuote && wasVisible);
		
		},
		
	topic: function(ref, map) {
		
		this.standardInit(map);
		
		},
	
	//reply is a reference to an HTML element that is either a boards_thread_row or a child of one, or a Reply object
	//this function will quote that post into this panel
	quote: function(reply, map) {
		if(!reply.ref) return this.quote(pageReplies.get(reply), map);

		var textcontent = "";
		var author = reply.author;
		
		//handle selection quoting
		var ran, ranges, anc, maxAnc, el, valid=false;
		if(Panels.selectionQuote && (ranges = Panels.lastSelection)) {
			for(var i=0, len=ranges.length; i<len; i++) {
				if((ran = ranges[i]) && (!ran.collapsed) && (anc = ran.commonAncestorContainer)) {
				
					//make sure the common ancestor is or is a child of maxAnc
					if(Panels.strictSelectionQuote && anc != (maxAnc = reply.postRef) && !isChildOf(maxAnc, anc)) continue;
					
					//stick the contents of the selection into a temporary element
					//Range.cloneContents() returns a document fragment
					(el = document.createElement("div")).appendChild(ran.cloneContents());

					//if selection is only an embedded video, it's not valid
					//helps to fix bug 83
					if(el.childNodes.length==1 && el.firstChild.tagName && el.firstChild.tagName == "EMBED") continue;
					
					//doesn't work when selecting images and stuff
					//if(el.textContent.replace(/\s/g, "")=="") continue;
					
					var boardcode = Parse.HTML(el.innerHTML);
					
					//if selection results in no text, it's not valid
					//helps with cases similar to bug 83, like selecting the video's containing p element
					if(boardcode.replace(/\s/g, "")=="") continue;
					
					var thisReply;
					var thisAuthor = (Panels.strictSelectionQuoteAuthor && (thisReply = pageReplies.get(anc))) ? thisReply.author : author; 
					
					textcontent += Parse.pretext.quote(thisAuthor, boardcode);
					valid = true;
					
					}
				}
			
			Panels.lastSelection = null;
			
			}
			
		if(!valid) textcontent = Parse.pretext.quote(author, Parse.HTML(reply.postContent));

		
		
		this.editor.body = this.editor.wysiwygOn ? Parse.boardCode( Parse.pretext.moveEnd( Parse.HTML(this.editor.body), textcontent ) )
									: Parse.pretext.moveEnd(this.editor.body, textcontent);
			
		this.editor.field.scrollTop = this.editor.field.scrollHeight;
		
		this.standardInit(map, true);
		
		},
		
	//will edit the referenced post
	edit: function(reply, map) {
		if(!reply.ref) return this.edit(pageReplies.get(reply), map);
		
		var textcontent = reply.postContent;
		this.subject = reply.subject;
		
		this.editor.body = !this.editor.wysiwygOn ? Parse.HTML(textcontent) + Parse.pretext.edit
									: Parse.boardCode(Parse.HTML(textcontent) + Parse.pretext.edit); 
									//have to get rid of extra whitespace, line breaks in code
			
		this.editor.field.scrollTop = this.editor.field.scrollHeight;
		
		this.standardInit(map);
		
		},
		
	//will PM the author of the referenced post
	pm: function(reply, map) {
		if(!Info.layout.fresh && !reply.ref) return this.pm(pageReplies.get(reply), map);
		
		this.user = Info.layout.fresh ? Panels.getUser(reply) : reply.author;
		
		if(Info.layout.fresh && !this.floating) addClass(reply.parentNode.parentNode.parentNode, "panelInside");
		
		this.standardInit(map);
		
		},
		
	copyPreview: function() {
		
		this.editor.body = "";
		this.editor.wysiwygOn = true;
		var ih = this.preview.innerHTML;
		if(ih!='<img class="loadingIcon">')
			this.editor.body = ih;
			
		var cb = this.copyButton;
		var oldText = cb.textContent;
		cb.textContent = "Copied.";
		setTimeout(function(){
			cb.textContent = oldText;
			}, 1500);
		
		},
	
	resetSizeControls: function() {
	
		this.winButs[2].title = "Minimize";
		this.winButs[2].className = "minimizeButton minimizeIcon";
		this.winButs[1].title = "Maximize";
		this.winButs[1].className = "maximizeButton maximizeIcon";
		
		this.contentVisible = true;
		
		},
		
	minimize: function() {

		if(this.sizeState=="minimized") return;
	
		this.contentVisible = false;
		
		this.sizeState = "minimized";
		
		this.winButs[2].className = "restoreButton restoreIcon";
		this.winButs[2].title = "Restore";
		this.winButs[1].className = "maximizeButton maximizeIcon";
		this.winButs[1].title = "Maximize";
		
		resize(window);
		
		},
		
	maximize: function() {
		
		if(this.sizeState=="maximized") return;
		
		this.sizeState = "maximized";
			
		this.contentVisible = true;

		this.winButs[2].className = "minimizeButton minimizeIcon";
		this.winButs[2].title = "Minimize";
		this.winButs[1].className = "restoreButton restoreIcon";
		this.winButs[1].title = "Restore";
		
		resize(window);
		
		},
		
	restore: function() {

		if(this.sizeState=="normal") return;
		
		this.sizeState = "normal";

		this.resetSizeControls();
		
		resize(window);
		
		},
		
	close: function() {
		if(Panels.deletePanels) return this.ref.parentNode.removeChild(this.ref);
		
		if(!this.visible) return;
		this.visible = false;
		
		if(Info.layout.fresh && this.type=="pm") removeClass(getParentByClassName(this.ref, "panelInside"), "panelInside");
		
		this.postButton.disabled = true;
		this.previewButton.disabled = true;
		
		this.editor.body = "";
		this.preview.innerHTML = "";
		this.previewOn = false;
		this.subject = "";
		this.user = "";
		this.lock = false;
		this.lockRef.disabled = true;
		this.boardId = "";
		this.topicId = "";
		this.replyId = "";
		this.eventValidation = "";
		this.viewState = "";
		this.editor.clearButtonStates();
		
		this.restore();
		
		resize(window);
		customEvent(this.ref, "panelClosed");
		
		},
		
	open: function() {
		
		if(this.visible) return;
		this.editor.wysiwygOn = Editors.wysiwygDefault;
		this.visible = true;
		
		Panels.moveToEnd(this);
		
		resize(window);
		customEvent(this.ref, "panelOpened");
		
		}
	
	};


	
	
/*
handles ALL panels on the page, ALL new panels must be created through this object
	METHODS
	get(ref, lookForChild(op), type(op))
	getLast()
	open(parent, type, map(op)) (or quote(parent), reply(parent), etc.)
	close(ref)
	overlayWysiwyg(ref)

	PROPERTIES
	integrate
		replies
		topics
		pms
		edits
	strings
		topic
			camel, title, button, plural
		reply
			...
		edit
			...
		pm
			...
	follow
	autoClose
	deletePanels
*/
Panels = new function Panels_Obj() {
	
	//holds all Panel objects
	var panels = [];
	
	var find = function(ref) {
		for(var i=0, len=panels.length; i<len; i++)
			if(ref == panels[i].ref) return panels[i];
		return null;
		}
		
	var integrate = new function() {
		this.__defineGetter__("replies", function(){return GM_getValue("replyIntegration", true);});
		this.__defineGetter__("topics", function(){return GM_getValue("topicIntegration", true);});
		this.__defineGetter__("pms", function(){return GM_getValue("PMIntegration", true);});
		this.__defineGetter__("edits", function(){return true;});
		};
		
	this.__defineGetter__("integrate", function(){return integrate;});
		
	var hijack = new function() {
		this.__defineGetter__("topics", function(){return GM_getValue("topicHijacking", true);});
		this.__defineGetter__("replies", function(){return GM_getValue("replyHijacking", true);});
		this.__defineGetter__("quotes", function(){return GM_getValue("quoteHijacking", true);});
		this.__defineGetter__("pms", function(){return GM_getValue("PMHijacking", true);});
		this.__defineGetter__("edits", function(){return GM_getValue("editHijacking", true);});
		};
		
	this.__defineGetter__("hijack", function(){return hijack;});
	
	this.__defineGetter__("follow", function(){return GM_getValue("panelFollow", true);});
	this.__defineGetter__("autoClose", function(){return GM_getValue("autoClose", true);});
	this.__defineGetter__("scrollTo", function(){return GM_getValue("scrollToPanels", true);});
	this.__defineGetter__("deletePanels", function(){return GM_getValue("deletePanels", false);});
	this.__defineGetter__("selectionQuote", function(){return GM_getValue("selectionQuote", true);});
	this.__defineGetter__("strictSelectionQuote", function(){return GM_getValue("strictSelectionQuote", false);});
	this.__defineGetter__("strictSelectionQuoteAuthor", function(){return GM_getValue("strictSelectionQuoteAuthor", true);});
	
	function stringBundle(camel, title, button, plural) {
		this.camel = camel; this.title = title; this.button = button; this.plural = plural;
		}
	
	this.strings = new function() {
		this.topic = new stringBundle("postTopic", "Post Topic", "Post Topic", "topics");
		this.reply = new stringBundle("postReply", "Post Reply", "Post Reply", "replies");
		this.edit = new stringBundle("editReply", "Edit Reply", "Post Changes", "edits");
		this.pm = new stringBundle("privateMessage", "Private Message", "Send Message", "pms");
		};
		
	//for selection quoting, since opening a panel changes the selection/focus
	this.lastSelection = null;
	
	//when given a reference to an HTML element with className "panel", 
	//it returns the corresponding Panel object
	//when given a reference to an HTML element without that class,
	//it returns the Panel object of the parent panel of the given element
	//(unless lookForChild is true, then it finds a child panel)
	//if lookForChild is true, you can specify a certain type of panel to search for
	//when given a number, it returns the Panel object in that index
	this.get = function(ref, lookForChild, type) {
		
		if(!defined(ref) || ref==null || panels.length<1) return null;
		
		if(typeof ref == "object") {
			if(hasClass(ref, "panel")) {
				return find(ref);
				}
			else {
				if(!defined(lookForChild)) lookForChild = false;
				if(!lookForChild) type = null;
				
				return this.get( lookForChild ? getFirstByClassName(ref, type ? type : "panel")
												: getParentByClassName(ref, "panel"));
				}
			}
			
		else if(typeof ref == "number" && ref >= 0 && ref <= panels.length-1) 
			return panels[ref];
			
		return null;
		
		}
		
	this.getLast = function() {
		
		if(panels.length>0) {
	
			var thisPanel;
		
			for(var i = panels.length-1; i >= 0; i--) {
			
				thisPanel = panels[i];

				if(thisPanel!=null && thisPanel.visible && thisPanel.contentVisible)
					return thisPanel;
			
				}
			
			}
			
		return null;
		
		}
		
	//given a panel, it will move the panel from its current position
	//in the panels array to the end
	this.moveToEnd = function(panel) {
		
		var index = panels.indexOf(panel);
		if(index==-1) return;
		panels.splice(index,1);
		panels.push(panel);
		
		}
		
	//creates a new panel and tracks it, that's it
	//not recommended for public use
	this.newPanel = function(parent, type, map) {
		
		var newPanel = new Panel(parent, type, map);
		panels.push(newPanel);
		customEvent(newPanel.ref, "newPanel");
		return newPanel;
		
		}
		
	//highly sensitive code, huge bitch to debug
	//opens a panel of the given type as a child of the parent element
	//returns the Panel object of the new panel
	//map is an object, the properties of the panel will copy what's in the map
	this.open = function(parent, type, map, usual) {

		GM_time("Panel.open");
		if(!defined(usual)) usual = false;
		GM_time("p1");
		this.lastSelection = getSelectionCopy();
		GM_timeEnd("p1");
		GM_time("p2");
		var quote = type=="quote";
		if(quote) type = "reply";
		
		var intg = this.integrate[this.strings[type].plural];
		var wasVisible = false;
		if(parent.tagName=="BODY") intg = false;
		if(!intg && !quote) this.closeTopPanels(type);
		var existing = quote ? this.getLast() : null;
		if(!existing) existing = intg ? this.get(parent, true, type) : this.getTop(type);
		if(existing) {
			if(existing.floating) intg = false;
			wasVisible = existing.visible;
			}
		GM_timeEnd("p2");
		GM_time("newPanel");
		if(!existing) {
		
			if(type!="reply") {
				existing = this.newPanel(intg ? parent : document.body, type, map);
				}
				
			else if(intg && this.follow && !(existing = this.get(document.getElementById("boards_full_width"), true, type))) {
				existing = this.newPanel(intg ? parent : document.body, type, map);
				}
				
			else if(!intg || !this.follow) {
				if(!intg) this.closeTopPanels(type);
				existing = this.newPanel(intg ? parent : document.body, type, map);
				}
				
			}
		GM_timeEnd("newPanel");
		GM_time("p3");
		GM_time("p3.1");
		if(this.follow && intg && type == "reply") existing.moveTo(parent);
		GM_timeEnd("p3.1");
		GM_time("p3.2");
		if(existing.type!="edit" && !wasVisible)
			existing.editor.body = existing.editor.wysiwygOn ? Parse.boardCode(Parse.pretext.start + Parse.HTML(existing.editor.body) + Parse.pretext.end)
									: Parse.pretext.start + existing.editor.body + Parse.pretext.end;
		GM_timeEnd("p3.2");
		GM_time("p3.3");
		if(usual) existing[type](parent, wasVisible ? null : map, type=="reply" ? quote : undefined, type=="reply" ? wasVisible : undefined);
		else existing.standardInit(map);
		GM_timeEnd("p3.3");
		GM_time("p3.4");
		if(quote) existing.quote(parent, wasVisible ? null : map);
		GM_timeEnd("p3.4");
		GM_timeEnd("p3");
		GM_timeEnd("Panel.open");
		
		return existing;
		
		}
		
	//closes and deletes (if preferred) the given Panel or panel HTML element reference
	//returns true if deletion from memory was successful, false if not, null if not preferred
	this.close = function(ref) {
		
		var oldPanel = ref.ref ? ref : this.get(ref);
		if(oldPanel) oldPanel.close();
		
		if(this.deletePanels) {
			var oldIndex;
			
			oldIndex = panels.indexOf(oldPanel);
			var rv = delete panels[oldIndex];
			
			panels.splice(oldIndex, 1);
			
			return rv;
			}
			
		return null;
		
		}
		
	//so you can call Panels.quote(ref) instead of Panels.open(ref, "quote")
	this.quote = function(ref, map) {
		
		return this.open(ref, "quote", map, true);
		
		}
		
	this.reply = function(ref, map) {
		
		return this.open(ref, "reply", map, true);
		
		}
		
	this.edit = function(ref, map) {
		
		return this.open(ref, "edit", map, true);
		
		}
		
	this.pm = function(ref, map) {
		
		return this.open(ref, "pm", map, true);
		
		}
		
	this.topic = function(ref, map) {
		
		return this.open(ref, "topic", map, true);
		
		}
		
	this.getTop = function(type) {
		
		var p = getChildrenByClassName(document.body, type);
		return p ? this.get(p[p.length - 1]) : null;
		
		}
		
	this.closeTopPanels = function(except) {
		
		if(typeof except == "undefined") except = "none";
	
		var topPanel, allTypes = ["reply", "topic", "pm"];
	
		for(var i=0, type; type = allTypes[i]; i++)
			if(except!=type && (topPanel=this.getTop(type))) 
				this.close(topPanel);
		
		}
		
	this.getUser = function(ref) {
		
		return Info.layout.fresh ? getFirstByTagName(ref, "b").textContent : null;
		
		}
	
	}
	
Cleanup.add(function(){ Panels = null; });


Listeners.add(document, 'click', function(event) {

	if(event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;

	if(event.which!=1 || event.target.tagName!="A") return;

	var evt = event.target;

	var targetPanel = null, existingPanel = null;
	
	if(Panels.hijack.replies) {
		
		var parent = null, url = null;
		
		var isSubReplyLink = ((parent = evt.parentNode).className == "boards_thread_links" && evt.innerHTML == "Reply");
		var isTopReplyLink = !isSubReplyLink && isChildOf((parent = document.getElementById("boards_thread_header_links")), evt) && (url = new Url(evt.href)) && url.pageType=="postReply";
		var isQuickReplyLink = isSubReplyLink && evt.hasAttribute("onclick") && /quickpost/i.test(evt.getAttribute("onclick")) && evt.getAttribute("href")=="#";
		
		if( isTopReplyLink || (isSubReplyLink && !isQuickReplyLink) ) {
			
			event.preventDefault();
			Panels.reply(parent,
						{subject: document.title.slice(0, document.title.lastIndexOf('-')-1),
						topicId: Info.url.topicNumber,
						boardId: Info.url.boardNumber});
				
			}
			
		}

	if(Panels.hijack.quotes) {
    				
		if(evt.innerHTML == "Quote"
			&& !(evt.hasAttribute("onclick") && /quickpost/i.test(evt.getAttribute("onclick")) && evt.getAttribute("href")=="#")) {
		
			event.preventDefault();
			Panels.quote(evt.parentNode, 
						{subject: document.title.slice(0, document.title.lastIndexOf('-')-1),
						topicId: Info.url.topicNumber,
						boardId: Info.url.boardNumber});
				
			}
		
		}
	
	if(Panels.hijack.edits) {

		if(evt.href.indexOf("PostEdit.aspx?edit=") != -1) {
		
			event.preventDefault();
			Panels.edit(evt.parentNode, 
						{topicId: Info.url.topicNumber,
						boardId: Info.url.boardNumber,
						replyId: evt.href.split('edit=')[1]});
	
			}
		
		
		}
	
	if(Panels.hijack.pms) {

		if(evt.href.indexOf("/PrivateMessages/SendMessage.aspx?usr=") != -1) {
			
			event.preventDefault();
			
			if(evt.parentNode && hasClass(evt.parentNode, "boards_thread_links") || hasClass(evt.parentNode, "qtip-content")) 
				Panels.pm(evt.parentNode, 
					{subject: document.title.slice(0, document.title.lastIndexOf('-')-1)});
					
			else if(evt.parentNode && hasClass(evt.parentNode, "bottomLinks"))
				Panels.open(document.body, "pm", 
				{user: getFirstByTagName(getFirstByClassName(getParentByClassName(evt, "infoPanel"), "panelHeading"), "a").textContent});
					
			else {
				var map = {};
				if(evt.href.indexOf("usr")!=-1) map.user = evt.href.split("usr=")[1].split("&")[0];
				if(evt.href.indexOf("reply=")!=-1) map.subject = ("RE: " + decodeURIComponent(evt.href.split("reply=")[1].replace(/\+/g, " "))).replace("RE: RE: ", "RE: ");
				Panels.open(document.body, "pm", map);
				}
				
				
			}
		
		}
		
	if(Info.url.pageType=="board" && Panels.hijack.topics) {
		
		if(evt.href.indexOf("ign.com/PostTopic.aspx?brd=") != -1 && evt.href.indexOf("createpoll") == -1) {

			event.preventDefault();
			Panels.topic(evt.parentNode.parentNode,
						{boardId: Info.url.boardNumber});
		
			}
		
		}

	}, true);


//handles replying without entering and the thread preview reply button, panel control buttons
Listeners.add(document, 'click', function(event) {

	if(event.which!=1 || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
	
	var isPreview = false;
	var topic, evt = event.target;
	
	if((Info.url.pageType=="board" && defined(pageTopics) && (evt.className == "boards_board_list_row_icon" || evt.parentNode.className == "boards_board_list_row_icon") && defined(topic = pageTopics.get(evt))) 
		|| (isPreview = (evt.tagName=="A" && evt.innerHTML == "Reply" && evt.parentNode.className == "panelHeading"))) {
		
		event.preventDefault();
		
		var url = isPreview ? (new Url(evt.href)) : null;
		var map = {};
		
		map.topicId = isPreview ? url.getField("topic") : topic.id;
		map.boardId = isPreview ? url.getField("brd") : Info.url.boardNumber;
		map.subject = isPreview ? getFirstByClassName(evt.parentNode, "previewSubject").textContent : topic.subject;
		
		Panels.open(document.body, "reply", map);
		
		return;
		
		}
		
	var classes = getClasses(evt);
		
	for(var n=0, ln=classes.length; n<ln; n++) {
		
		var thisClass = classes[n];
			
		switch(thisClass) {
		
			case "minimizeButton":		
				Panels.get(evt).minimize();
				break;
				
			case "maximizeButton":		
				Panels.get(evt).maximize();
				break;
				
			case "restoreButton":		
				Panels.get(evt).restore();
				break;
				
			case "closeButton":
				if(Panels.get(evt)) Panels.close(evt);
				break;
				
			case "previewCloseButton":
				Panels.get(evt).previewOn = false;
				break;
				
			case "copyButton":
				Panels.get(evt).copyPreview();
				break;
				
			case "postButton":
				if(evt.disabled) break;
				var mypa = Panels.get(evt);
				if(!mypa) break;
				if(chrome) {
					//Chrome doesn't fire a focus event when this is clicked, so do it now (#252)
					mypa.editor.conditionallyAutocensor(mypa.type);
					}
				Message.post(mypa);
				break;
				
			case "previewButton":
				if(evt.disabled) break;
				var mypa = Panels.get(evt);
				if(!mypa) break;
				Message.post(mypa, null, null, true);
				break;
		
			}
		
		}

	}, true);

//tabbing between fields
Listeners.add(document, "keydown", function(e) {
	
	//tab
	if(e.which != 9) return;
	
	if(!e.target || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
	
	//in the subject field in a panel
	if(hasClass(e.target, "subject")) {
		
		var mypa = Panels.get(e.target);
		
		if(mypa && e.target == mypa.subjectRef) {
			e.preventDefault();
			mypa.editor.field.focus();
			mypa.editor.restoreSelection();
			return;
			}
	
		}
	
	//in the editor in a panel
	if(hasClass(e.target, "body") || hasClass(e.target, "wysiwyg")) {
		
		var mypa = Panels.get(e.target);
		
		if(mypa && e.target == mypa.editor.field) {
			e.preventDefault();
			mypa.postButton.focus();
			return;
			}
		
		}
	
	}, true);

