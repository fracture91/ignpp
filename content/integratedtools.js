
var Integratedtools = new function() {
	
	this.__defineGetter__("searchInTab", function(){return GM_getValue("searchInTab", true);});
	this.__defineGetter__("vestiWikiSearch", function(){return GM_getValue("vestiWikiSearch", true);});
	this.__defineGetter__("googleSearch", function(){return GM_getValue("googleSearch", true);});
	this.__defineGetter__("integrateControls", function(){return GM_getValue("integrateControls", true);});
	this.__defineGetter__("extraBoardOptions", function(){return GM_getValue("extraBoardOptions", true);});
	
	this.wikiUrl = "http://vestiwiki.yabd.org/wiki/index.php";
	
	var search = document.getElementById("boards_search_container");
	var form = getFirstByTagName(search, "form");
	var input = document.getElementById('boards_search_input');
	
	this.addSearchInTab = function() {
		
		if(form) form.target = "_blank";
		
		}
		
	this.addVestiWikiSearch = function() {
		
		if(!search) return;
		addClass(search, "searchTweak" + (I.layout.name=="white" ? " white" : ""));
		
		var button = createElementX('input', {
			id: 'wikiSearchButton',
			type: 'submit',
			value: 'Vesti Wiki'
			});

		search.appendChild(button);
		
		}
		
	this.addGoogleSearch = function() {
		
		if(!form) return;
		form.action = "http://www.google.com/search";
		
		var hidden = form.getElementsByTagName("input")[1];
		if(!hidden) return;
		hidden.name = "sitesearch";
		hidden.value = "boards.ign.com";
		
		}
		
	this.addIntegratedControls = function() {
		
		var temp = createElementX("li", {
			className: "vtControls",
			innerHTML: GM_getFile("chrome://vestitools/content/controls.html")
			});
		
		var links = temp.getElementsByTagName("a");
		links[0].href = I.url.topicUrl;
		links[1].href = I.url.replyUrl;

		var target = document.getElementById("nav-global");
		target = getFirstByTagName( getFirstByClassName( getFirstByClassName(target, "home"), "upcoming-top"), "ul");
		if(target) target.appendChild(temp);
		
		}
		
	this.addExtraOptions = function() {
		
		var temp = createElementX("div", {
			innerHTML: GM_getFile("chrome://vestitools/content/extra.html")
			});

		var upcoming = getFirstByClassName( getFirstByClassName(document.getElementById("nav-global"), "home"), "upcoming-top");
		if(!upcoming) return;
		var bottom = upcoming.nextSibling.nextSibling;
		if(!bottom) return;
		
		for(var i=0, len = temp.childNodes.length; i<len; i++)
			upcoming.parentNode.insertBefore(temp.firstChild, bottom);
		
		}
		
	if(this.searchInTab) this.addSearchInTab();
	if(this.vestiWikiSearch) this.addVestiWikiSearch();
	if(this.googleSearch) this.addGoogleSearch();
	if(this.integrateControls) this.addIntegratedControls();
	if(this.extraBoardOptions) this.addExtraOptions();
	
	this.doVestiWikiSearch = function() {
		
		//go to the main page if there's no search query, but if there is, go to the search page
		var url = this.wikiUrl + (input.value=="" ? "?title=Main_Page" : ('?search=' + input.value));
		this.searchInTab ? window.open(url) : window.location.href = url;
		
		}
		
	this.topic = function() {
		
		Panels.open(document.body, "topic", {boardId: I.url.boardNumber});
		
		}
		
	this.reply = function() {
		
		Panels.open(document.body, "reply", 
			{subject: document.title.slice(0, document.title.lastIndexOf('-')-1),
			boardId: I.url.boardNumber,
			topicId: I.url.topicNumber});
		
		}
		
	this.pm = function() {
		
		Panels.open(document.body, "pm");
		
		}
		
	this.settings = function() {
		
		GM_showOptions();
		
		}
		
	
	}


//for some reason, this also gets called when you submit the search bar form
//by pressing enter on the wiki search button...oh well, it's desirable
Listeners.add(document, 'click', function(event) {
	
	Autorefresh.inFocus = true;
	
	if(event.which!=1 || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;

	switch(event.target.id) {
		case "wikiSearchButton":
			Integratedtools.doVestiWikiSearch();
			break;
		case "postTopicButton":
			Integratedtools.topic();
			break;
		case "postReplyButton":
			Integratedtools.reply();
			break;
		case "privateMessageButton":
			Integratedtools.pm();
			break;
		case "settingsButton":
			Integratedtools.settings();
			break;
		}
	
	}, true);
	
Listeners.add(document, "keydown", function(e) {
	
	if(e.altKey || e.shiftKey || e.metaKey) return;
	
	//control + backspace
	if(e.ctrlKey && e.which==8 && I.url.pageType=="topic") {
	
		window.location.href = 'http://' + I.url.host + '/' + I.url.boardName + '/b' + I.url.boardNumber + '/p1';
	
		}
	
	}, true);
