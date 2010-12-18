
//functions for dealing with posting stuff

var Message = new function Message_Obj() {

	var redirect = new function(){
		this.__defineGetter__("topics", function(){return GM_getValue("topicRedirection", false);});
		this.__defineGetter__("replies", function(){return GM_getValue("replyRedirection", false);});
		this.__defineGetter__("repliesWE", function(){return GM_getValue("replyWERedirection", false);});
		this.__defineGetter__("edits", function(){return GM_getValue("editRedirection", false);});
		this.__defineGetter__("goHome", function(){return GM_getValue("goHome", false);});
		};
		
	this.__defineGetter__("redirect", function(){return redirect;});
	
	this.bseExp = /<title>\s*Board System Error\s*<\/title>/i;
	
	this.getViewState = function(text) {

		var start = text.indexOf('id="__VIEWSTATE"');
		if(start!=-1) start = text.indexOf('value="', start);
		else return "";
		if(start!=-1) start += 7;
		else return "";
		
		var end = text.indexOf('"', start);
		if(end!=-1) return text.slice(start, end);
		else return "";

		}
		
		
	this.getEventValidation = function(text) {

		var start = text.indexOf('id="__EVENTVALIDATION"');
		if(start!=-1) start = text.indexOf('value="', start);
		else return "";
		if(start!=-1) start += 7;
		else return "";
		
		var end = text.indexOf('"', start);
		if(end!=-1) return text.slice(start, end);
		else return "";

		}
		
	this.getLocked = function(text) {
		
		return text.indexOf('chkTopicIsLocked" checked="checked"')!=-1;
		
		}
	
	this.lastBlock = function(text) {
		var end = text.lastIndexOf("|");
		var start = text.lastIndexOf("|", end-1) + 1;
		return text.slice(start, end);
		}
		
	this.getRedir = function(text, allow) {
		
		if(typeof allow!="boolean") allow = true;
		
		if(!GM_getValue("goHome", false) || !allow) {
			return "http://" + I.url.host + this.lastBlock(text);
			}
			
		else return "http://" + I.url.host + "/" + I.url.boardName + "/b" + I.url.boardNumber + "/p1";

		}
		
	this.handleRedir = function(type, text) {
		
		switch(type) {
					
			case "topic":
				if(this.redirect.topics) window.location.href = this.getRedir(text, false);
				break;
			case "reply":
				if(I.url.pageType!="board") {
					if(this.redirect.replies) window.location.href = this.getRedir(text);
					}
				else if(I.url.pageType=="board") {
					if(this.redirect.repliesWE) window.location.href = this.getRedir(text);
					}
				break;
			case "edit":
				if(this.redirect.edits) window.location.href = this.getRedir(text);
				break;
				
			}
		
		}
		
	this.getPreview = function(text, type) {
		
		var startText = type=="pm" ? 'ccSendPMContent_bcPreviewBody">' : "<!-- PreviewBodySkin -->";
		var endText = type=="pm" ? '</span>' : "<!-- /PreviewBodySkin -->";
		
		var start = text.indexOf(startText) + startText.length;
		if(start==startText.length-1) return "";
		var end = text.indexOf(endText, start);
		if(end==-1) return "";
		
		return text.slice(start, end);
		
		}
		
	//these values differ slightly between boards and betaboards
	this.SMHidden = "ctl00_ctl00_cphMain_cphMain_tkScriptManager1_HiddenField=%3B%3BIGN.Boards.Web.Controls%3Aen-US%3A3f4fdf86-7726-4150-aef4-6cda1afa20b8%3A";
	this.betaSMHidden = this.SMHidden + "edd87cc5";
	this.SMHidden += "5cdf82d5";
	
	this.currentSMHidden = I.url.host == "betaboards.ign.com" ? this.betaSMHidden : this.SMHidden;
		
	/*posts a message
	panel
		Panel object to get the message info from and log to
	map
		object with necessary properties of a panel
	callback
		function that consumes the source (panel or map), details of the xhr, and success of posting, called after post
		
	either a panel or a map must be specified in order to post
	*/
	
	//previews look almost exactly like posts, so I'm just shoving that functionality in here
	
	this.post = function(panel, map, callback, preview) {
		var type, eventValidation, viewState, subject, body, user, boardId, topicId, replyId, lock;
		var _data = '', page = '';
		
		//returns false if the string is not valid
		function vals(text){
			text += '';
			text = text.replace(Parse.horizontalWhiteSpace, "").replace(/\s/g, "")+'';
			if(typeof text!="string" || !text) return false;
			return true;
			}
		
		//returns false if the number is not valid
		function valn(text){
			if(text==null || text==undefined | text=='') return false;
			text /= 1;
			if(typeof (text)!="number" || isNaN(text)) return false;
			return true;
			}
			
		function valb(val) {
			if(typeof (!val)!="boolean") return false;
			return true;
			}
			
		function messError(name) {
			messErrorGen(name + ' Error');
			}
			
		function messErrorGen(t) {
			logError("Message", panel ? (panel.info = '<span class="error">' + t + '</span>') : t);
			}
		
		if(panel && !panel.ref) {
			//they left out a panel but have a map, "shift" everything to the right
			callback = map;
			map = panel;
			panel = null;
			}
		if(map && typeof map == "function") {
			//they left out a map but have a callback
			callback = map;
			map = null;
			}
			
		if(!panel && !map) messError("No Source");
		if(typeof callback != "function") callback = function(s, d, ps){};
		if(!defined(preview)) preview = false;
		
		var source = panel ? panel : map ? map : null;
		
		//get all the data from our source
		try{
		
			//if wysiwyg is on, parse and dump into the textarea
			if(panel) source.editor.sync(true);
		
			type = source.type;
			eventValidation = source.eventValidation;
			viewState = source.viewState;
			subject = source.subject;
			body = panel ? source.editor.textarea.value : source.body;
			if(type=="pm") user = source.user;
			boardId = source.boardId;
			topicId = source.topicId;
			replyId = source.replyId;
			if(type=="edit") lock = source.canLock && source.lock;
		
			} catch(e) { return logError('Message', 'Bad source'); }
			
			
		var lockedString = lock ? "&ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostEdit%24ccTemplateModuleContent%24ucPostBody%24ccPostBodyModuleContent%24ucPostOptions%24ccPostOptionsModuleContent%24chkTopicIsLocked=on" : "";
		
			if(!vals(type)) {
				messError("Type");
				return;
				}
			if(!vals(user)) {
				user = "(no user)";
				if(type=="pm") {
					messError("User");
					return;
					}
				}
			if(!vals(subject)) {
				messError("Subject");
				return;
				}
			if(!vals(body)) {
				messError("Body");
				return;
				}
			if(!valn(boardId)) {
				boardId = "0";
				if((type=="topic") || (type=="reply")) {
					messError("BoardId");
					return;
					}
				}
			if(!valn(topicId)) {
				topicId = "0";
				if(type=="reply") {
					messError("TopicId");
					return;
					}
				}
			if(!valn(replyId)) {
				replyId = "0";
				if(type=="edit") {
					messError("ReplyId");
					return;
					}
				}
			if(!valb(lock)) {
				lock = false;
				if(type=="edit") {
					messError("Lock");
					return;
					}
				}
			if(!vals(eventValidation)) {
				messError("eventValidation");
				//getKey(parent, true);
				return;
				}
			if(!vals(viewState)) {
				messError("viewState");
				//getKey(parent, true);
				return;
				}
				
		if(panel) panel[preview ? "previewButton" : "postButton"].disabled = true;
		if(panel && preview) panel.previewOn = true;
		
		switch(type) {
		
			case "topic":
				page = 'http://' + I.url.host + '/PostForms/PostTopic.aspx?brd=' + boardId;
				break;
				
			case "reply":
				page = 'http://' + I.url.host + '/PostForms/PostReply.aspx?brd=' + boardId + '&topic=' + topicId;
				break;
				
			case "edit":
				page = 'http://' + I.url.host +'/PostForms/PostEdit.aspx?edit=' + replyId;
				break;
				
			case "pm":
				page = 'http://' + I.url.host + '/PrivateMessages/SendMessage.aspx?';
				break;
				
			default:
				messError("Type");
				return;
		
			}
			
		
		if(type == "topic") {
			_data += 'ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostTopic%24ccTemplateModuleContent%24ucPostSubject%24ccPostSubjectModuleContent%24txtMessageSubject=' + encodeURIComponent(subject);
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostTopic%24ccTemplateModuleContent%24ucPostBody%24ccPostBodyModuleContent%24ccPostTextModuleContent%24txtMessageBody=' + encodeURIComponent(body);
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24ScriptManager1=ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24updPanelPost%7Cctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostButtons%24ccPostButtonsContent%24' + (preview ? 'btnPreview' : 'btnSubmit');
			_data += '&' + this.currentSMHidden;
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostButtons%24ccPostButtonsContent%24' + (preview ? 'btnPreview=%20Preview%20' : 'btnSubmit=%20Post%20Topic%20');
			}
			
		else if(type == "reply") {
			_data += 'ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostReply%24ccTemplateModuleContent%24ucPostSubject%24ccPostSubjectModuleContent%24txtMessageSubject=' + encodeURIComponent(subject);
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostReply%24ccTemplateModuleContent%24ucPostBody%24ccPostBodyModuleContent%24ccPostTextModuleContent%24txtMessageBody=' + encodeURIComponent(body);
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24tkScriptManager1=ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24updPanelPost%7Cctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostButtons%24ccPostButtonsContent%24' + (preview ? 'btnPreview' : 'btnSubmit');
			_data += '&' + this.currentSMHidden;
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostButtons%24ccPostButtonsContent%24' + (preview ? 'btnPreview=%20Preview%20' : 'btnSubmit=%20Post%20Reply%20');
			}
		
		else if(type == "pm") {
			_data += 'ctl00%24ctl00%24cphMain%24cphMain%24ccSendPMContent%24txtUserName=' + encodeURIComponent(user);
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24ccSendPMContent%24txtSubject=' + encodeURIComponent(subject);
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24ccSendPMContent%24txtBody=' + encodeURIComponent(body);
			_data += '&ctl00%24ctl00%24cphMain%24cphMenu1%24ScriptManager1=ctl00%24ctl00%24cphMain%24cphMain%24UpdatePanel1%7Cctl00%24ctl00%24cphMain%24cphMain%24ccSendPMContent%24' + (preview ? 'btnPreview' : 'btnSend');
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24ccSendPMContent%24' + (preview ? 'btnPreview=%20Preview%20' : 'btnSend=Send%20Private%20Message');
			}
			
		else if(type == "edit") {
			_data += 'ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostEdit%24ccTemplateModuleContent%24ucPostSubject%24ccPostSubjectModuleContent%24txtMessageSubject=' + encodeURIComponent(subject);
			_data += lockedString;
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostEdit%24ccTemplateModuleContent%24ucPostBody%24ccPostBodyModuleContent%24ccPostTextModuleContent%24txtMessageBody=' + encodeURIComponent(body);
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24tkScriptManager1=ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24updPanelPost%7Cctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostButtons%24ccPostButtonsContent%24' + (preview ? 'btnPreview' : 'btnSubmit');
			_data += '&' + this.currentSMHidden;
			_data += '&ctl00%24ctl00%24cphMain%24cphMain%24ccContent%24ccPostEntryContent%24ucPostButtons%24ccPostButtonsContent%24' + (preview ? 'btnPreview=%20Preview%20' : 'btnSubmit=%20Post%20Changes%20');
			}
			
		_data += '&__VIEWSTATE=' + encodeURIComponent(viewState);
		_data += '&__EVENTVALIDATION=' + encodeURIComponent(eventValidation);
		_data += '&__EVENTTARGET=&__EVENTARGUMENT=&_LASTFOCUS=&selMarkupColor=&__ASYNCPOST=true';
		
		if(panel) panel.info = '<img class="loadingIcon">' + (preview ? 'Previewing' : 'Posting') + '...';
		
		//callback needs a way to reference Messages
		var that = this;
		
		GM_xmlhttpRequest({
			method: "POST",
			url: page,
			data: _data,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Host" : I.url.host,
				"User-Agent": navigator.userAgent,
				"Accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,*\/*;q=0.8",
				"Cache-Control" : "no-cache, no-cache",
				"Content-Length" : _data.length,
				"Cookie" : document.cookie,
				"Pragma" : "no-cache",
				},
			onload: function(details) {
				
				if(panel) {
					panel.info = preview ? "Previewed." : 'Posted.';
					panel[preview ? "previewButton" : "postButton"].disabled = false;
					}
					
				var dr = details.responseText, postSuccess, highFreq;
				
				//debugString(dr);
				
				if(!(postSuccess = dr.search(that.bseExp) == -1)) {
					messErrorGen('Board System Error');
					if(dr.indexOf("state information")!=-1) messError("Key");
					}
					
				else if(!preview) {
					
					if((highFreq = dr.indexOf("_vldPostTimer")) != -1) {
						postSuccess = false;
						var text = dr.indexOf("wait", highFreq);
						text = text==-1 ? "" : ', ' + dr.slice(text, dr.indexOf(".", text)+1); //, wait x seconds.
						messErrorGen('Freq Error' + text);
						}
					
					if((type=="pm" && dr.indexOf('vldUserIsBanned" style="color:Red;"')!=-1) ||
						(type!="pm" && dr.search(/user is banned/i)!=-1)) {  //can't confirm that this works...
							postSuccess = false;
							messErrorGen("User is banned.");
							}
						
					}
					
				if(postSuccess) {
				
					if(!preview) {
				
						that.handleRedir(type, dr);
							
						if(panel && Panels.autoClose) {
							Panels.close(panel);
							}
							
						if(I.url.pageType=="topic" && Autorefresh.replies && (type=="reply" || type=="edit") && pageReplies) {
							
							//change page refresh target to url with reply id if we're on the last page
							if(type=="edit" || pageReplies.currentPage == pageReplies.lastPage) {
								Autorefresh.page.target = "http://" + I.url.host + that.lastBlock(dr);
								if(Autorefresh.repliesAfterPosting) Autorefresh.page.action();
								}
							
							}
							
						}
						
					else {
						
						if(panel.previewOn) panel.preview.innerHTML = that.getPreview(dr, type);
						
						}
				
					}
					
				else {
					vlog("MESSAGE ERROR DUMP:\n" + dr);
					if(panel.previewOn) panel.preview.innerHTML = ""; //to get rid of loading gif
					}
					
				callback(source, details, postSuccess);
				
				}
			});

		}
		
		

		
		
	/*gets the necessary keys for posting stuff
	panel
		Panel object to get the message info from, log to, and dump keys to
	map
		object with necessary properties of a panel
	callback
		function that consumes the source (panel or map), details of the xhr, view state, and event validation
		
	either a panel or a map must be specified in order to get keys
	*/
		
	this.getKeys = function(panel, map, callback){

		var type, boardId, topicId, replyId, user;
		var page = '';

		if(panel && !panel.ref) {
			//they left out a panel but have a map, "shift" everything to the right
			callback = map;
			map = panel;
			panel = null;
			}
		if(map && typeof map == "function") {
			//they left out a map but have a callback
			callback = map;
			map = null;
			}
			
		if(!callback) callback = function(s, d, vs, ev){};
		
		var source = panel ? panel : map ? map : null;
		
		if(source) {
		
			type = source.type;
			boardId = source.boardId;
			topicId = source.topicId;
			replyId = source.replyId;
			user = source.user;
		
			}
		
		if(!type) return;
		if(!boardId || boardId=="") boardId = 0;
		if(!topicId || topicId=="") topicId = 0;
		if(!replyId || replyId=="") replyId = 0;
		
		switch(type) {
		
			case "topic":
				page = 'http://' + I.url.host + '/PostForms/PostTopic.aspx?brd=' + boardId;
				break;
				
			case "reply":
				//keys will still be found even if boardId is incorrect or missing, though errors may be misleading
				page = 'http://' + I.url.host + '/PostForms/PostReply.aspx?brd=' + boardId + '&topic=' + topicId;
				break;
				
			case "edit":
				page = 'http://' + I.url.host + '/PostForms/PostEdit.aspx?edit=' + replyId;
				break;
				
			case "pm":
				page = 'http://' + I.url.host + '/PrivateMessages/SendMessage.aspx?' + (!isNaN(user/1) ? "usr=" + user : "");
				break;
				
			default:
				if(source.url) page = source.url;
				else return;
		
			}
			
		if(panel) panel.info = '<img class="loadingIcon">Getting Keys...';

		function messError(name) {
			messErrorGen(name + ' Error');
			}
			
		function messErrorGen(t) {
			logError("Message", panel ? (panel.info = '<span class="error">' + t + '</span>') : t);
			}
		
		var that = this;
		
		GM_xmlhttpRequest({
			method: "GET",
			url: page,
			headers: {
				"Host" : I.url.host,
				"User-Agent": navigator.userAgent,
				"Accept" : "text/html, text/plain",
				},
			onload: function(details) {
				var dr = details.responseText;
				var viewState = that.getViewState(dr);
				var eventValidation = that.getEventValidation(dr);
				var locked = type=="edit" && that.getLocked(dr);
				var finalUrl = new Url(details.finalUrl);
				
				if(panel) {
					panel.eventValidation = eventValidation;
					panel.viewState = viewState;
					panel.lock = locked;
					panel.lockRef.disabled = false;
					panel.postButton.disabled = false;
					panel.previewButton.disabled = false;
					panel.info = 'Keys Found, Ready to Post.';
					
					//quote parameter is never used, so you don't have to worry about post
					//content interfering with dr.search
					
					//old login page that works is at login.ign, new broken one at my.ign
					if(finalUrl.host=="login.ign.com" || (finalUrl.host=="my.ign.com" && finalUrl.pathname.indexOf("/login")!=-1)) {
						messErrorGen("User not logged in.");
						}
					else {
					
						if(finalUrl.pageType=="denied") messErrorGen("Topic moved.");
						else {
							
							//note to self: don't forget to use that instead of this, derp derp derp
							if(dr.search(that.bseExp) != -1) messErrorGen("Board System Error.");
							else {
								if(dr.search(/ccPostEntryError_lblErrorTitle"/i)!=-1) messErrorGen("Post Entry Error.");
								if((type=="edit" || type=="reply") && dr.search(/topic was not found/i)!=-1) messErrorGen("Topic not found.");
								if(type!="pm" && dr.search(/board was not found/i)!=-1) messErrorGen("Board not found.");
								if(type!="pm" && dr.search(/topic is locked/i)!=-1) messErrorGen("Topic is locked.");
								if(type!="pm" && dr.search(/user is banned/i)!=-1) messErrorGen("User is banned.");
								if(type=="edit" && dr.search(/time allowed to edit/i)!=-1) messErrorGen("Edit time expired.");
								if(type=="edit" && dr.search(/not your message/i)!=-1) messErrorGen("Not your message.");
								}
								
							}
						
						}
					
					//Console.output.value = dr;
					//Console.fit(Console.output);
					
					}
				callback(source, details, viewState, eventValidation);
				}
			});

		}
		
	};
	
Cleanup.add(function(){ Message = null; });
