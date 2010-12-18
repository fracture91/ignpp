
var Quickstats = new function() {
	
	this.__defineGetter__("showUsercolors", function(){return GM_getValue("showUsercolorsQuickstats", false);});
	
	this.patt = /http:\/\/club\.ign\.com(\/b)?\/about/;
	this.patt2 = /http:\/\/people\.ign\.com\//;
	
	this.defaultTime = "0001-01-01T00:00:00.000";
	this.defaultIcon = "http://media.ignimgs.com/boards/img/default/icon_default_80.jpg";
	
	this.monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
	
	this.getLeafByTag = function(el, name, unk) {
		if(!defined(unk)) unk = "Error";
		if(	el &&
			(el = el.getElementsByTagName(name)) &&
			(el = el[0]) &&
			(el = el.firstChild) &&
			(el = el.nodeValue))
			return el;
		return unk;
		}
		
	this.pair = function(label, value, title, title2) {
		function v(t) { return t ? ' title="' + t + '"' : ""; }
		title = v(title); title2 = v(title2);
		return '<tr><td' + title + '>' + label + '</td><td' + title2 + '>' + value + '</td></tr>';
		}
		
	this.parseTime = function(str) {
		var t = str.split('T');
		var t2 = t[0].split('-');
		var min = t[1];
		var maj = this.monthNames[parseInt(t2[1].replace(/^0/, "")) - 1] + ' ' + t2[2].replace(/^0/, "") + ', ' + t2[0];
		return [maj, min];
		}
		
	this.type = function(label, className, el, name, unk) {
		if(!defined(unk)) unk = "false";
		var result = this.getLeafByTag(el, name, unk);
		if(result!="true") return "";
		return '<tr><td></td><td class="' + className + '">' + label + '</td></tr>'
		}
	
	this.doIt = function(user, x, y) {
		
		var href = "http://club.ign.com/b/about?";
		var unData = "username=" + user;
		var whData = "which=boards";
		//usercolors will fail on a profile link if the data is out of order
		href += this.showUsercolors ? (unData + "&" + whData) : (whData + "&" + unData);
		
		var panel = Infopanels.open((user + 'QuickStats'), ('<a href="' + href + '">' + user + '</a>'), '<img class="loadingIcon">', [], x, y);
		
		var qs = this;
		
		GM_xmlhttpRequest({
		method: 'GET',
		url: 'http://boards.ign.com/ServicesV31/UserServices.asmx/GetUserDetails?username=' + user + '&viewingusername=' + I.username,
		headers: {
			'User-agent': navigator.userAgent,
			'Accept': 'text/xml, text/html, text/plain',
			},
		onload: function(details) {
			
			if(!panel) return;
			
			var dt = details.responseText;
			var dx = details.responseXML = new DOMParser().parseFromString(dt, "text/xml");
			
			var result, style = qs.getLeafByTag(dx, "Style", ""), html = "<table>";
				
				
			if(result = qs.getLeafByTag(dx, "Title", false)) html += qs.pair("Title:", result);
			html += qs.pair("Posts:", addCommas(qs.getLeafByTag(dx, "VirtualPostTotal")));
			
			var watchedUsers = dx.getElementsByTagName("WatchedUser"), len=0;
			html += qs.pair("WULs:", addCommas(qs.getLeafByTag(dx, "WatchedByCount")) + " / " + addCommas(len = watchedUsers.length));
			
			if((result = qs.getLeafByTag(dx, "NewPMCount", 0)) > 0) html += qs.pair("PMs:", result, "Unread PMs");
			
			var time = qs.parseTime(qs.getLeafByTag(dx, "DateAdded", qs.defaultTime));	
			html += qs.pair("Reg:", time[0], "Date Registered", time[1]);
			
			html += qs.type("Banned", "banned in", dx, "IsBanned");
			html += qs.type("Admin", "admin in", dx, "IsAdministator");
			html += qs.type("Manager", "manager in", dx, "IsManager");
			result = qs.type("Mod", "mod in", dx, "IsModerator");
			html += result=="" ? qs.type("ModType", "modType in", dx, "IsModType") : result;
			//not sure what modType means, but all mods seem to have it
			html += qs.type("VIP", "vip in", dx, "IsVip");
			result = qs.type("Insider", "insider in", dx, "IsSubscriber");
			html += result=="" ? qs.type("Outsider", "outsider in", dx, "IsOutsider", "true") : result;
			//there is no "IsOutsider" node, but I know that they're an outsider since they're not an insider
			//just using the function for its HTML generation purposes
			
			var wuldBy = false;
			for(var i=0; i<len; i++) {
				if(qs.getLeafByTag(watchedUsers[i], "Name", "") == I.username) {
					wuldBy = true;
					break;
					}
				}
				
			if(wuldBy) html += qs.type("WUL'd By", "wuldby in", dx, "IDontExist", "true");
			
			//all this seems good for is checking Homer's real post count
			html += qs.pair("RPC:", addCommas(qs.getLeafByTag(dx, "PostsCount")), "Real Post Count");
			
			var uid;	
			html += qs.pair("UID:", uid = qs.getLeafByTag(dx, 'UserID', "0"), "User ID");
			
			time = qs.parseTime(qs.getLeafByTag(dx, "LastLoginDate", qs.defaultTime));	
			html += qs.pair("Login:", time[0], "Last Login Date", time[1]);
			
			time = qs.parseTime(qs.getLeafByTag(dx, "LastPostDate", qs.defaultTime));	
			html += qs.pair("Post:", time[0], "Last Post Date", time[1]);
				
			time = qs.parseTime(qs.getLeafByTag(dx, "DateUpdated", qs.defaultTime));	
			html += qs.pair("Update:", time[0], "Last Profile Update Date...or something...", time[1]);
		
			html += '</table>' +
			'<div class="bottomLinks">' +
				'<a href="http://boards.ign.com/UserPages/WatchedUsers.aspx?usr=' + uid + '&action=update">WUL</a> | ' +
				'<a href="http://boards.ign.com/UserPages/WatchedUsers.aspx?usr=' + uid + '&action=remove">deWUL</a> | ' +
				'<a id="privateMessageButton" href="http://boards.ign.com/PrivateMessages/SendMessage.aspx?usr=' + uid + '">PM</a> | ' +
				'<a href="http://boards.ign.com/UserPages/PostHistory.aspx?usr=' + uid + '">History</a> | ' +
				'<a href="http://vestiwiki.yabd.org/wiki/index.php?title=' + user + '">Wiki</a>' + 
			'</div>';
			
			var icon = dx.getElementsByTagName('Icon')[0];
			if(!icon) html += '<div class="icon">No Icon</div>';
			else {
				var url = qs.getLeafByTag(icon, "ImageURL", qs.defaultIcon);
				var alt = qs.getLeafByTag(icon, "Alias");
				var height = qs.getLeafByTag(icon, "Height", "80");
				var type = (height=="120") ? "MegIcon" : "TinIcon";
				html += '<div class="icon"><img src="' + url + '" alt="' + type + ' - ' + alt + '" title="' + type + ' - ' + alt + '"></div>';
				}
			
			panel.headingRef.firstChild.style.cssText = style;
			panel.content = html;
			
			}
			
		});
		
		}
	
	}
	
	
Listeners.add(document, 'click', function(e) {

	if(e.which!=1 || !e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
		
	var evt = e.target;
	var targetLink;

	if(!evt.tagName) return;

	if((evt.tagName=="A" && (targetLink = evt)) || (targetLink = getParentByTagName(evt, "a"))) {
		var isPeopleLink = false;
		if(
			targetLink.href.search(Quickstats.patt)==-1 && 
			!(isPeopleLink = targetLink.href.search(Quickstats.patt2)!=-1)
			) return;
	
		var url = new Url(targetLink.href), 
		user = isPeopleLink ? url.pathname.substring(1) : url.getField("username");
		//alert(user);
		if(!isPeopleLink && !user) user = I.username;
		if(!I.validUsername.test(user)) return;
		
		e.preventDefault();
		
		Quickstats.doIt(user, e.pageX, e.pageY+1);
		
		}

	}, true);
