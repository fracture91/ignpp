
function Replies(ref, after) {

	if(!ref) return null;

	var replies = [];
	
	this.__defineGetter__("length", function(){ return replies.length; });
	
	var find = function(ref) {
		for(var i=0, len=replies.length; i<len; i++)
			if(ref == replies[i].ref) return replies[i];
		return null;
		}
	
	this.get = function(ref, lookForChild) {
		
		if(!defined(ref) || ref==null || replies.length<1) return null;
		if(!defined(lookForChild)) lookForChild = false;
		
		//get by place in document tree
		if(typeof ref == "object") {
		
			if(hasClass(ref, this.className))
				return find(ref);
			
			else return this.get(lookForChild ? getFirstByClassName(ref, this.className) : this.getRow(ref));
			
			}
			
		//get by index in array
		else if(typeof ref == "number" && ref >= 0 && ref <= replies.length-1) 
			return replies[ref];
			
		//get by reply id
		//must be a string like "#123456"
		else if(typeof ref == "string" && ref.length>1 && /^#\d+$/.test(ref)) {
			
			ref = +ref.substring(1);
			
			for(var i=0, thisReply; thisReply=pageReplies.get(i); i++)
				if(thisReply.id==ref)
					return thisReply;
			
			}
			
		return null;
		
		}
		
	this.newReply = function(ref) {
	
		if(!ref) return null;
		var newReply = new Reply(ref);
		replies.push(newReply);
		return newReply;
		
		}
		
	this.add = function(newReply) {
		
		newReply.append(replies[replies.length-1]);
		replies.push(newReply);
		
		}
		
	//use with caution - intended for optimizing augment when called
	//on a new Replies object from autorefresh
	this.erase = function(lower, upper) {
	
		if(!defined(upper)) upper = lower;
		
		if(!defined(lower) || lower<0 || lower>replies.length-1 || upper<0 || upper>replies.length-1) return null;
		
		var howmany = upper-lower + 1;
		
		if(howmany < 1) return null;
		
		delete replies.splice(lower, howmany);
			
		vlog(replies);
		
		}
		
	this.forEachReply = function(func) {
		
		if(!defined(func)) return;
		
		for(var i=0, len=replies.length; i<len; i++)
			if(replies[i]) func.call(this, replies[i], i, len);
			//for some reason, calling it normally will lead to "this"
			//in the function pointing to the window object
		
		}
		
	if(typeof ref == "string") {
		replies = Parse.replies(ref);
		this.pages = Parse.pages(ref);
		}
	else {
		var els = ref.getElementsByClassName(this.className);
		for(var i=0, len=els.length; i<len; i++) this.newReply(els[i]);
		this.pages = Parse.pages(ref.innerHTML);
		}
		
	if(this.pages) {
		this.lastPage = +getLastByClassName(this.pages, "prevnext").parentNode.previousElementSibling.textContent;
		this.currentPage = getFirstByClassName(this.pages, "currentpage");
		if(this.currentPage) {
			this.currentPage = +this.currentPage.textContent;
			}
		else {
			/*
			IGN has a bug where this class and the current page don't show up in fast threads.
			For example, url says p3, but paginator shows [Prev][1][2][Next]   - See issue #241.
			This seems to happen when the current page should be the last page, so increment lastPage as well.
			*/
			this.currentPage = ++this.lastPage;
			}
		}
	else {
		this.lastPage = this.currentPage = 1;
		}
	
	}
	
//Cleanup.add(function(){ Replies = null; });
	
Replies.prototype = {
	
	className: "boards_thread_row",
	
	getRow: function(ref) {
	
		if(!defined(ref) || ref==null) return null;
	
		if(hasClass(ref, this.className)) return ref;
		else if(I.layout.fresh) return getParentByClassName(ref, this.className);
		else if((ref.tagName && ref.tagName == "TR") || 
				(ref.nodeType != 1 && ref.previousSibling.tagName && ref.previousSibling.tagName=="TR")) return this.getRow(ref.previousSibling);
		else return this.getRow(getParentByTagName(ref, "tr"));
		
		return null;
		
		},
		
	get WULLinks(){return GM_getValue("WULLinks", true);},
	get ignoreLinks(){return GM_getValue("ignoreLinks", true);},
	get missingLinks(){return GM_getValue("missingLinks", true);},
	get ignoreReplies(){return GM_getValue("ignoreReplies", true);},
	get wikiLinks(){return GM_getValue("wikiLinks", true);},
	get replyNumbers(){return GM_getValue("replyNumbers", true);},
	
	get scrollToReplyOnLoad(){return GM_getValue("scrollToReplyOnLoad", true);},
	get scrollToReplyOnClick(){return GM_getValue("scrollToReplyOnClick", true);},
		
	get ignoreList(){return GM_getValue("ignoreList", "");},
	set ignoreList(s){return GM_setValue("ignoreList", s);},
	
	/*
	Given a Reply or a username, ignore that username or the Reply's author.
	If unIgnore is true, unIgnore the user instead (defaults to false).
	*/
	ignore: function(reply, unIgnore) {
		if(!defined(unIgnore)) unIgnore = false;
		var user = typeof reply == "string" ? reply : reply.author;
		
		var list = this.ignoreList;
		//if this.ignoreList == "", split returns [""], which is an invalid list
		list = list == "" ? [] : list.split(",");
		
		if(unIgnore) {
			var target = list.indexOf(user);
			if(target!=-1) {
				list.splice(target, 1);
				this.ignoreList = list.join(",");
				}
			}
		else if(list.indexOf(user)==-1) {
			list.push(user);
			this.ignoreList = list.join(",");
			}
			
		//hide/show all other replies by this user in this Replies object
		this.forEachReply(function(r) {
			if(r.author == user) {
				if(unIgnore) r.unIgnore();
				else r.ignore();
				}
			});
		
		},
		
	unIgnore: function(reply) {
		
		return this.ignore(reply, true);
		
		},
		
	augment: function(previousReplies) {
	
		GM_time("augment");
		
		if(this.length<1) return;
		
		if(!this.WULLinks && !this.ignoreLinks && !this.ignoreReplies && !this.missingLinks && !this.wikiLinks && !this.replyNumbers)
			return;
		
		var list = this.ignoreList.split(",");
		
		if(this.replyNumbers) {
			
			var replyNumberBase = 1; //reply number of the first reply on this page
			
			//for augmentation from autorefresh
			if(previousReplies) {
				if(previousReplies.currentPage!=1 || previousReplies.length!=1)
					replyNumberBase = previousReplies.get(previousReplies.length-1).replyNumber + 1;
				}
			
			//if we aren't on the first page, we need to know how many replies are on the previous pages
			//so that the reply numbers are accurate
			else if(this.pages && this.currentPage!=1) {
			
				//if we aren't on the last page, we can find out the user's ppp by counting the replies on this page
				//otherwise, we need to rely on the last measure of ppp
				var ppp = (this.currentPage!=this.lastPage) ? this.length : I.postsPerPage;
				
				//if ppp is definitely inaccurate
				if(ppp < this.length) {
					ppp = this.length;
					
					//all possible ppps are divisible by five
					if(ppp % 5 != 0) {
						ppp = Math.ceil(ppp/5) * 5;
						}
					}
				
				replyNumberBase = ppp*(this.currentPage-1) + 1;
				
				}
			
			}
		
		this.forEachReply(function(r, i) {
			
			if(this.ignoreLinks) r.addIgnoreLinks();
			if(this.WULLinks) r.addWULLinks();
			
			if(this.ignoreReplies && !this.ignoreLinks) {
				
				if(list.indexOf(r.author)!=-1) {
					r.addIgnoreLinks(true); //this calls r.ignore
					}
				
				}
				
			if(this.missingLinks) r.addMissingLinks();
			if(this.wikiLinks) r.addWikiLink();
			if(this.replyNumbers) {
				if(!previousReplies && this.currentPage==1 && i==0)
					replyNumberBase--;
				else r.replyNumber = replyNumberBase + i;
				}
			
			});
		
		GM_timeEnd("augment");
		
		},
		
	scrollTo: function(ref) {
		
		var thisReply = this.get(ref);
		if(!thisReply) return 1;
		return thisReply.scrollTo();
		
		}
	
	}
	
//ref must be an element with className Replies.className, or a string of HTML containing such an element
function Reply(ref) {
	
	if(typeof ref == "string") {
		
		var temp = createElementX( (I.layout.fresh ? "div" : "table"), {innerHTML: ref});
		this.ref = temp.getElementsByClassName(Replies.prototype.className)[0];
		
		}
	else this.ref = ref;
		
	this.rows = [];
		
	if(!I.layout.fresh) {
			
		this.rows[0] = this.ref;
		this.rows[1] = getNextByTagName(this.rows[0], "tr");
		this.rows[2] = getNextByTagName(this.rows[1], "tr");
		
		}
	else this.rows[0] = this.rows[1] = this.rows[2] = null;
	
	this.authorLink = getFirstByClassName(this.ref,
										(I.layout.fresh ? "boards_thread_user_profile_info" : "boards_thread_user_name_stars"))
					.getElementsByTagName("a")[0];
	
	this.author = this.authorLink.textContent;
					
	this.subjectRef = getFirstByClassName(this.ref, "boards_thread_subject");
	if(!I.layout.fresh) this.subjectRef = this.subjectRef.lastChild;

	this.postRef = I.layout.fresh ? this.ref : this.rows[1];
	this.postRef = getFirstByClassName(this.postRef, I.layout.fresh ? "boards_thread_post" : "boards_thread_post_wrapper");
	
	this.editRef = getFirstByClassName(this.postRef, "boards_message_edited");
	
	this.pollRef = getFirstByTagName(this.postRef, "form");
	
	this.subLinks = getFirstByClassName( (I.layout.fresh ? this.ref : this.rows[2]), "boards_thread_links");
	
	var script;
	var qpdiv = getFirstByClassName(this.subLinks, "boards_quick_post_inline");
	if(qpdiv) this.id = qpdiv.id.replace("quick_post_", "");
	else if(script = getFirstByTagName(this.ref, "script")) {
		var ih = script.innerHTML;
		var start = ih.indexOf("userprofile") + 11;
		var end = ih.indexOf('"', start);
		this.id = ih.slice(start, end);
		}
	else this.id = -1;
	
	
	}
	
//Cleanup.add(function(){ Reply = null; });
	
Reply.prototype = {
	
	ref: null,
	rows: null,
	
	hideLink: null,
	ignoreLink: null,
	
	subjectRef: null,
	get subject(){return I.layout.fresh ? this.subjectRef.textContent : this.subjectRef.nodeValue.substr(1)},
	set subject(s){I.layout.fresh ? (this.subjectRef.textContent = s) : (this.subjectRef.nodeValue = " "+s)},
	
	//dispatch a custom event to indicate that the hidden option has been destroyed
	//so that the hidden option script can catch it and apply itself again
	pollChange: function() {
		
		if(!this.pollRef) return;
		return customEvent(this.pollRef, "pollChange");
		
		},
	
	get poll(){ return this.pollRef ? this.pollRef.innerHTML : null; },
	set poll(s){
		if(!this.pollRef) return;
		var oldSelection = this.pollSelection;
		this.pollRef.innerHTML = s;
		this.pollChange();
		this.pollSelection = oldSelection;
		},
	
	get votes(){ return this.pollRef ? this.pollRef.getElementsByClassName("boards_poll_info")[0].firstChild.nextSibling.nextSibling.nodeValue/1 : -1; },
	
	get editCount(){
		if(!this.editRef) return 0;
		var con = this.editRef.textContent, start = con.indexOf("(")+1, end = con.indexOf(" ", start);
		return con.slice(start, end)/1;
		},
		
	append: function(after) {

		after = (I.layout.fresh ? after.ref : after.rows[2]).nextSibling;
		after.parentNode.insertBefore(this.ref, after);
		if(!I.layout.fresh) {
			after.parentNode.insertBefore(this.rows[1], after);
			after.parentNode.insertBefore(this.rows[2], after);
			}
		
		},
		
	//the getter gets the actual reply text, but the setter sets the innerHTML of the whole post (reply text, poll, signature)
	get postContent() {
		
		var textcontent = this.postRef.innerHTML;
															
		var endtc = textcontent.indexOf('<div class="boards_message_edited">'); //stop at edit info if there
		if(endtc == -1) endtc = I.layout.fresh ? textcontent.indexOf('<br class="clear">')
												: textcontent.indexOf('<p>&nbsp;</p>'); //otherwise stop before the clearing line break/p
		if(endtc == -1) endtc = textcontent.length;
		var starttc = textcontent.indexOf('<!-- MESSAGE BODY -->') + 21;
		if(starttc < 21) starttc = 0;
		
		return textcontent.slice(starttc, endtc).replace("<!-- /MESSAGE BODY -->", "").replace(/(^\s*)|(\s*$)/g, "");
		
		},
		
	get allPostContent(){ return this.postRef.innerHTML; },
		
	set postContent(s){
		var oldSelection = this.pollSelection;
		this.postRef.innerHTML = s;
		//this will destroy some of the old references, so we need to get them again
		this.pollRef = getFirstByTagName(this.postRef, "form");
		this.editRef = getFirstByClassName(this.postRef, "boards_message_edited");
		this.pollChange();
		this.pollSelection = oldSelection;
		},
	
	get pollSelection(){
		if(!this.pollRef) return -1;
		var inputs = this.pollRef.getElementsByTagName("input");
		for(var i=0, len=inputs.length; i<len; i++) if(inputs[i].checked) return i;
		return -1;
		},
		
	set pollSelection(n){
		if(n<0 || !this.pollRef) return;
		var inputs = this.pollRef.getElementsByTagName("input");
		if(n<inputs.length-1 && inputs[n]) inputs[n].checked = true;
		},
		
	get uid() {
		
		//TODO: move into method of Reply
		if(I.layout.fresh) {
			//only place you can find the UID is in a script tag in the reply
			var script = this.ref.getElementsByTagName("SCRIPT")[0].innerHTML;
			return script.slice(script.indexOf('usr=')+4, script.indexOf('">'));
			}
		else {
			//TODO: this is dumb and breaks easily, fix it
			var td = this.rows[2].getElementsByTagName("td")[0];
			if(!td) return -1;
			var candidates = getChildrenBy(td, function(e, i) {
				return e.href && e.href.indexOf("usr=") != -1;
				});
			if(candidates) return candidates[0].href.split("usr=")[1].split("&")[0];
			return -1;
			}
		
		},
		
	addWULLinks: function() {

		var temp = document.createDocumentFragment();
		var link = createElementX("a", {
			href: 'http://boards.ign.com/UserPages/WatchedUsers.aspx?usr=' + this.uid + '&action=update',
			title: 'Add this user to your Watched User List',
			innerHTML: "WUL"
			});
		temp.appendChild(this.WULLink = link.cloneNode(true));
		temp.appendChild(document.createTextNode(" | "));
		link.href = link.href.replace("update", "remove");
		link.title = "Remove this user from your Watched User List";
		link.innerHTML = "deWUL";
		temp.appendChild(this.deWULLink = link);
		
		I.layout.fresh ? this.subLinks.appendChild(temp)
						: this.subLinks.insertBefore(temp, getFirstByClassName(this.subLinks, "boards_quick_post_inline"));
		
		},
		
	addIgnoreLinks: function(alreadyChecked) {
		
		if(!defined(alreadyChecked)) alreadyChecked = false;
		
		var temp = document.createDocumentFragment();
		
		this.hideLink = createElementX("a", {
			className: "hideReply",
			innerHTML: I.layout.fresh ? "Hide" : "Hide Reply",
			href: "http://" + I.url.host + "/" + I.url.boardName + "/b" + I.url.boardNumber + "/" + I.url.topicNumber + "/" + (this.id==-1 ? "p" + I.url.pageNumber : "r" + this.id),
			});
		temp.appendChild(this.hideLink);
		
		var separator = document.createTextNode(" | ");
		temp.appendChild(separator);
		
		this.ignoreLink = createElementX("a", {
			className: "ignoreUser",
			innerHTML: I.layout.fresh ? "Ignore" : "Ignore User"
			});
		temp.appendChild(this.ignoreLink);
		
		I.layout.fresh ? this.subLinks.appendChild(temp)
						: this.subLinks.insertBefore(temp, getFirstByClassName(this.subLinks, "boards_quick_post_inline"));
		
		if(alreadyChecked || Replies.prototype.ignoreList.split(",").indexOf(this.author)!=-1) this.ignore();
		
		},
	
	//add a link to the sublinks area with given textcontent and href with separators added if necessary
	//if target is given, link will be inserted before it
	//otherwise link is inserted before first link
	//returns the left-most (firstest child) node that's inserted
	addLink: function(tc, href, target) {
		
		var that = this;
		
		//return true if a separator is necessary
		function good(el, right) {
			//to require a separator, adjacent node must be a text node with only spaces or an anchor lacking a margin
			return el && ((el.nodeType == 3 && el.nodeValue.replace(/\s/g, "")=="" && (!right || nextElementSibling(el) != that.subLinks.getElementsByTagName("A")[0])) || 
						(el.tagName=="A" && window.getComputedStyle(el,null).getPropertyValue("margin-" + (right ? "right" : "left")).split("px")[0] <= 0));
			}
		
		//default target
		if(!defined(target)) {
			target = this.subLinks.getElementsByTagName("a");
			if(!target || !(target = target[0])) target = this.subLinks.firstChild.nextSibling;
			}
			
		var rv;

		//add separators if necessary
		if(good(target, false))
			target = this.subLinks.insertBefore(document.createTextNode(" | "), target);
		if(good(target.previousSibling, true))
			rv = this.subLinks.insertBefore(document.createTextNode(" | "), target);
			
		var link = createElementX("a", {href: href, textContent: tc, className: "missing"});
		if(!rv) rv = link;
			
		this.subLinks.insertBefore(link, target);
		
		return rv;
		
		},
	
	//if thread is locked, edit/quote/reply links will be missing
	//add em back in
	addMissingLinks: function() {
	
		var target = !I.layout.fresh ? undefined : this.hideLink ? this.hideLink : this.WULLink ? this.WULLink : undefined,
		existing, isAuthor;
	
		if((isAuthor = this.author==I.username) && !(existing = getChildrenByTextContent(this.subLinks, "Edit")))
			target = this.addLink("Edit", "/PostEdit.aspx?edit=" + this.id, target);
		else if(isAuthor && existing) target = existing;
		
		if(!(existing = getChildrenByTextContent(this.subLinks, "Quote")))
			target = this.addLink("Quote", "/PostReply.aspx?brd=" + I.url.boardNumber + "&topic=" + I.url.topicNumber + "&quote=" + this.id, target);
		else target = existing;
		
		if(!(existing = getChildrenByTextContent(this.subLinks, "Reply")))
			target = this.addLink("Reply", "/PostReply.aspx?brd=" + I.url.boardNumber + "&topic=" + I.url.topicNumber, target);
		else target = existing;

		},
		
	addWikiLink: function() {
		
		var parent = I.layout.fresh ? this.subLinks : getFirstByClassName(this.rows[0], "boards_thread_user_info");
		
		var nextEl = I.layout.fresh ? null : parent.getElementsByTagName("a")[1].nextSibling;
		
		var link = createElementX("a", {
			href: "http://vestiwiki.yabd.org/wiki/index.php?title=" + this.author,
			innerHTML: "Wiki"
			});
			
		if(!I.layout.fresh) parent.insertBefore(document.createTextNode(" | "), nextEl);
		
		parent.insertBefore(link, nextEl);
		
		},
		
	get replyNumber() {
		
		if(!this.replyNumberRef) return -1;
		return +this.replyNumberRef.textContent.replace(/,/g, "");
		
		},
		
	set replyNumber(num) {
		
		if(!defined(num)) return;
		
		if(num==null) {
			if(this.replyNumberRef) this.replyNumberRef.parentNode.removeChild(this.replyNumberRef);
			return;
			}
			
		function simpleSet(n) {
			if(isNaN(n=+n)) return;
			n = Math.floor(n);
			if(n<0) n *= -1;
			n = (n<=999 ? n : addCommas(n));
			this.replyNumberRef.textContent = n;
			return this.replyNumberRef.title = "#" + n;
			}
			
		if(this.replyNumberRef) {
			return simpleSet.call(this, num);
			}
		
		this.replyNumberRef = createElementX("div", {className: "replyNumber"});
		var rv = simpleSet.call(this, num);
		
		var parent = I.layout.fresh ? getFirstByClassName(this.ref, "boards_thread_post_wrapper")
									: getFirstByClassName(this.rows[1], "boards_thread_post_column");
		
		var before = I.layout.fresh ? this.subLinks : null;
		
		parent.insertBefore(this.replyNumberRef, before);
		
		return rv;
		
		},
	
	//IGN adds embeds to the page through document.write instead of just including them in the source
	//so we have to fix them before adding them to the page (stupid, stupid, stupid)
	fixEmbeds: function() {
		
		var embeds = this.postRef.getElementsByClassName("embedvideo");
		
		if(embeds.length==0) return;
		
		for(var i=0, len = embeds.length; i<len; i++) {
			
			var thisEmbed = embeds[i];
			
			var script = getFirstByTagName(thisEmbed, "script");
			if(!script) continue;
			
			//document.write("<embed src='http://videomedia.ign.com/ev/ev.swf' flashvars='" + "object_ID=926419&downloadURL=http://xbox360movies.ign.com/xbox360/video/article/110/1100123/e3awards_spc_061710_flvlowwide.flv&allownetworking=%22all%22".replace(/\s/, "") + "' type='application/x-shockwave-flash' width='433' height='360' ></embed>");
			
			var match = script.innerHTML.match(/document\.write\("<embed src='([^']*)' flashvars='" \+ "([^"]*)"\.replace\(\/\\s\/, ""\) \+ "' type='([^']*)' width='([^']*)' height='([^']*)' ><\/embed>"\)/);
			if(!match) continue;
			script.parentNode.removeChild(script);
			
			//if there's already an embed here, we'll assume nothing else has to be done
			var existingEmbed = getFirstByTagName(thisEmbed, "embed");
			if(existingEmbed) continue;
			
			var properEmbed = createElementX("embed", {
				src: match[1],
				type: match[3],
				width: +match[4],
				height: +match[5]
				});
				
			//don't even know why IGN has a replace there, but whatever
			properEmbed.setAttribute("flashvars", match[2].replace(/\s/, ""))
				
			thisEmbed.appendChild(properEmbed);
			
			}
		
		},
		
	hide: function(show) {
		
		if(!defined(show)) show = false;
			
		this.hideLink.innerHTML = this.hideLink.innerHTML.replace(show ? "Show" : "Hide", show ? "Hide" : "Show");
		replaceClass(this.hideLink, show ? "showReply" : "hideReply", show ? "hideReply" : "showReply");
	
		show ? removeClass(this.ref, "hiddenReply") :
				addClass(this.ref, "hiddenReply");
				
		resize(window);
		
		},
		
	show: function() {
		
		return this.hide(true);
		
		},
		
	//alone, this method just changes link innerHTML and class and hides the reply
	//the method in Replies actually ignores the user
	ignore: function(unIgnore) {
		
		if(!defined(unIgnore)) unIgnore = false;
			
		this.ignoreLink.innerHTML = this.ignoreLink.innerHTML.replace(unIgnore ? "unIgnore" : "Ignore", unIgnore ? "Ignore" : "unIgnore");
		replaceClass(this.ignoreLink, unIgnore ? "unIgnoreUser" : "ignoreUser", unIgnore ? "ignoreUser" : "unIgnoreUser");
		
		if(!Replies.prototype.ignoreReplies) return;
		
		if(unIgnore) this.show();
		else this.hide();
		
		},
		
	unIgnore: function() {
		
		return this.ignore(true);
		
		},
		
	scrollTo: function() {
		
		var pos = findPos(this.ref);
		return window.scrollTo(pos[0], pos[1]);
		
		}
	
	
	}
	
	
if(I.url.pageType=="topic") {
	var pageReplies = new Replies(document.getElementById("boards_full_width"));
	pageReplies.augment();
	
	if(pageReplies.currentPage!=pageReplies.lastPage)
		I.postsPerPage = pageReplies.length + (pageReplies.currentPage==1 ? -1 : 0);
		
	//if the url has a reply number and the page isn't already scrolled too much
	if(pageReplies.scrollToReplyOnLoad && I.url.replyNumber && window.scrollY<101)
		pageReplies.scrollTo("#" + I.url.replyNumber);
	
	//if you click a link to a topic that points to a reply on the page you're already on
	//prevent the default action (going to the page) and just scroll to the reply
	Listeners.add(document, "click", function(e) {
		
		if(e.which!=1 || e.altKey || e.shiftKey || e.metaKey)
			return;
		
		if(!pageReplies || !pageReplies.scrollToReplyOnClick || !e.target || e.target.tagName!="A" 
			|| hasClass(e.target, "hideReply") || hasClass(e.target, "showReply") || Panels.get(e.target))
			return;
		
		var url = new Url(e.target.href);
		
		if(url.pageType == "topic" && url.replyNumber && url.topicNumber==I.url.topicNumber) {
			
			var reply = pageReplies.get("#" + url.replyNumber);
			if(!reply) return;
			
			reply.scrollTo();
			e.preventDefault();
			
			}
		
		}, true);
		
		
	Cleanup.add(function(){ pageReplies = null; });
	}
	

Listeners.add(document, 'click', function(event) {
	
	if(event.which!=1 || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;

	var evt = event.target;

	if(!evt.className) return;
	
	switch(evt.className) {
	
		case "hideReply":
		case "showReply":
			
			var myre = pageReplies.get(evt);
			if(!myre) break;
			if(Panels.get(evt)) break;
			
			event.preventDefault();
			
			var show = evt.className == "showReply";
			
			if(!show) myre.hide();
			else myre.show();
			
			break;
			
		case "ignoreUser":
		case "unIgnoreUser":
			
			var myre = pageReplies.get(evt);
			if(!myre) break;
			if(Panels.get(evt)) break;
			
			var unIgnore = evt.className == "unIgnoreUser";
			
			if(!unIgnore) pageReplies.ignore(myre);
			else pageReplies.unIgnore(myre);
			
			break;
			
		}

	}, true);	
