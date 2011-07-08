
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
	var dropDownBottom = getFirstByClassName( getFirstByClassName(document.getElementById("nav-global"), "home"), "sub-nav-display-sub");
	
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
		
		var temp = createElementX("div", {
			innerHTML: GM_getFile("extension://content/controls.html")
			});
		
		var links = temp.getElementsByTagName("a");
		links[0].href = I.url.topicUrl;
		links[1].href = I.url.replyUrl;
		if(chrome) {
			links[3].href = chrome.extension.getURL("content/options/gchromeoptions.html");
			}

		dropDownBottom.parentNode.insertBefore(temp.firstChild, dropDownBottom);
		
		}
		
	this.addExtraOptions = function() {
		
		var temp = createElementX("div", {
			innerHTML: GM_getFile("extension://content/extra.html")
			});
		
		for(var i=0, len = temp.childNodes.length; i<len; i++)
			dropDownBottom.parentNode.insertBefore(temp.firstChild, dropDownBottom);
			
		//we also want to get rid of Board Options link and replace with Help
		var firstGroup = dropDownBottom.parentNode.firstElementChild;
		var columns = firstGroup.getElementsByTagName("ul");
		columns[0].removeChild(columns[0].getElementsByTagName("li")[2]);
		columns[0].appendChild(columns[1].getElementsByTagName("li")[3]);
		
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
Listeners.add(document, 'click', function(e) {
	
	if(e.which!=1 || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;

	var wasControl = true;
	switch(e.target.id || e.target.parentNode.id) {
		case "wikiSearchButton": Integratedtools.doVestiWikiSearch();
			break;
		case "postTopicButton": Integratedtools.topic();
			break;
		case "postReplyButton": Integratedtools.reply();
			break;
		case "privateMessageButton": Integratedtools.pm();
			break;
		case "optionsButton": Integratedtools.settings();
			break;
		default: wasControl = false;
			break;
		}
	if(wasControl) {
		e.preventDefault();
		}
	
	}, false);
	
Listeners.add(document, "keyup", function(e) {
	
	if(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
	
	//b
	if(e.which==66 && I.url.pageType=="topic") {
	
		if(Listeners.elementAcceptsInput(e.target)) return;
		window.location.href = 'http://' + I.url.host + '/' + I.url.boardName + '/b' + I.url.boardNumber + '/p1';
	
		}
	
	}, true);
