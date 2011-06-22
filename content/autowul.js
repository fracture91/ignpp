
var Autowul = new function() {
	
	this.__defineGetter__("enabled", function(){return GM_getValue("autoWUL", true);});
	
	//regex that matches a WUL link
	this.patt = /http:\/\/(betaboards|boards|forums)\.ign\.com\/UserPages\/WatchedUsers\.aspx\?usr=\d{1,20}&action=(update|remove)/i;
	
	this.colors = {
		start: "rgba(255,240,240, 0.5)",
		keys: "rgba(255,255,100, 0.5)",
		done: "rgba(100,255,100, 0.5)",
		WUL: "rgba(0,50,200, 0.5)",
		deWUL: "rgba(200,15,100, 0.5)"
		}
		
	//return value of url's "usr" field
	this.getUid = function(url) {
		return url.getField("usr");
		}
	
	//return true if url's "action" field is "remove", false otherwise
	this.getRemove = function(url) {
		return url.getField("action") == "remove"; 
		}
	
	//autoWUL the user indicated by the link or remove/uid arguments
	//link is an anchor element
	//must provide either (link) or (remove and uid) or (url)
	//remove, uid, and url override what link.href points to
	//remove and uid override what url points to
	this.doIt = function(link, remove, uid, url) {
		
		if(!uid) {
			if((!link || !link.href) && !url) return;
			uid = this.getUid(url ? url : (url = new Url(link.href)));
			if(uid==null) return;
			}
			
		if(!defined(remove)) {
			if((!link || !link.href) && !url) return;
			remove = this.getRemove(url ? url : (url = new Url(link.href)));
			}
		
		//with betaboards transitioning to MyIGN, this page will just redirect to the user's MyIGN profile
		//so we won't use whatever subdomain the user is on
		var href = "http://boards.ign.com/UserPages/WatchedUsers.aspx?usr=" + uid + "&action=" + (remove ? "remove" : "update");
		
		var type = remove ? "Remove" : "Update";
		
		var style = link ? link.style : null;
		if(style) {
			style.backgroundColor = this.colors.start;
			style.outline = "1px dotted transparent";
			style.outlineColor = remove ? this.colors.deWUL : this.colors.WUL;
			}
			
		var that = this;

		vlog(type + " AutoWULing " + uid);
		
		GM_xmlhttpRequest({
			method: "GET",
			url: href,
			headers: {
				"Accept" : "text/html, text/plain"
				},
			onload: function(details) {
				var rt = details.responseText;
				var viewState = Message.getViewState(rt);
				var eventValidation = Message.getEventValidation(rt);
				var present = false;
				
				if(style) {
					
					style.backgroundColor = that.colors.keys;
					
					var user = Parse.WULUser(rt);
					var list = Parse.WULList(rt);
					
					vlog("user: " + user + ";\nlist: " + list.join(", "));
					
					if(user!="") {
						present = list.indexOf(user) != -1;
						style.outlineStyle = present == remove ? "solid" : "dashed";
						}
					
					}
				
				var _data = '';
				_data += '__VIEWSTATE=' + encodeURIComponent(viewState);
				_data += '&__EVENTVALIDATION=' + encodeURIComponent(eventValidation);
				_data += '&ctl00%24ctl00%24cphMain%24ccFormFieldsContainer%24cphMain%24btn' + type + '=' + type;
				
				GM_xmlhttpRequest({
					method: "POST",
					url: href,
					data: _data,
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
						"Accept" : "text/html, text/plain"
						},
					onload: function(details) {
						
						if(style) style.backgroundColor = that.colors.done;
						
						vlog(type + " AutoWUL'd " + uid + ", " + (present==remove));
						
						}
						
					});
				
				
				}
			});
		
		}
	
	}

Listeners.add(document, 'click', function(e) {

	if(e.which!=1 || e.ctrlKey || e.shiftKey || e.metaKey) return;
	
	var evt = e.target;

	if(!Autowul.enabled || !evt || evt.tagName != "A" || !evt.href ||
			evt.href.search(Autowul.patt) == -1 ||
			getParentByClassName(evt, "wysiwyg") != null)
		return;
	
	e.preventDefault();

	var url = new Url(evt.href);
	var remove = Autowul.getRemove(url);
	if(e.altKey) remove = !remove;

	Autowul.doIt(evt, remove, undefined, url);

	});
