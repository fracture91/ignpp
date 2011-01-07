
var Parse = new function() {
		
	this.horizontalWhiteSpace = /[ \t\u00a0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000]/g;
	//2060 is a word joiner character used for creating empty links
	//feff is a zero width no break space, deprecated in favor of the above
	//both characters show up on IGN as "?"
	this.charactersToRemove = /[\u2060\ufeff]/g;

	this.validProtocolExp = /^(http|ftp)/i;
	this.innerLinkExp = /(^|[\s]+)(http:\/\/[^\[\]\{\}\(\)\s]+)/gi;
	
	this.linkText = function(text, href) {
		
		//IGN prevents linking links, like [link=http://google.com/]http://boards.ign.com/[/link]
		//I guess to prevent misleading people
		
		//yes, using a different protocol or including special crap directly after slashes
		//will defeat this regex.  This conforms to IGN's failure.
		//of special note: [link=http://google.com/]http://[b][/b]boards.ign.com/[/link]
		//the b tags aren't visible, but it'll still link to google
		//this fix isn't entirely accurate, as there are some bizarre grouping rules that IGN follows when you mix symbols
		
		//This doesn't fail entirely accurately.  Instead it reproduces code that the user
		//likely intended to show up while still following IGN's rules.
		
		var arr = text.split(this.innerLinkExp);
		var arr2 = [];
		
		//this splits the text up thusly:
		//arr[i + 0] = text before the matched link
		//arr[i + 1] = spaces before the link
		//arr[i + 2] = the matched link
		
		for(var i=0, len=arr.length; i<len; i+=3) {
			
			var spacesExist = defined(arr[i+1]);
			var hasMatch = spacesExist && defined(arr[i+2]);
			
			var inner = [];
			inner.push(arr[i], (hasMatch ? arr[i+1] : ""));
			inner = inner.join("");
			
			//we don't want a bunch of extraneous links, especially because of video embed
			if(inner.search(/\S/)!=-1) {
				
				arr2.push("[link=", href, "]", inner, "[/link]");
				
				}
			
			if(hasMatch) arr2.push(" ", arr[i+2], " ");
			else break;
			
			}
			
		return arr2.join("");
		
		}
	
	this.isBlockExp = /^(div|address|h[1-6]|table|tr|p|pre|center)$/i;
	this.isBlock = function(node) {
		if(node==null || !defined(node)) return null;
		if(node.nodeType != 1) return false;
		if(typeof node.tagName != "string") return null;
		return this.isBlockExp.test(node.tagName);
		}
	
	/*HTMLNode, HTML, handleBlock, and boardCode all based heavily
	on IGNBQ's parser, courtesy of heyf00L*/
	
	
	
	this.HTMLNode = function(node, depth) {

		var color, bgcolor, b, i, u;
		
		if(!depth) depth = 1;
		
		if(!node) return;
		
		//stuff we don't want to parse at all
		if(node.nodeType == 1) {
			
			var tag = node.tagName;
			
			switch(tag) {
				case "SPAN":
					//fastestfox inserts a span here sometimes - get rid of it, it has no user input
					if(hasClass(node, "smarterwiki-popup-bubble")) {
						node.textContent = "";
						return;
						}
					break;
				case "P":
					
					var fc = node.firstChild;
					
					if(fc && fc.nodeType==1) {
						//video embed click-to-plays
						if(fc.tagName=="A" && fc.href=="javascript:void(0)" && fc.textContent.toLowerCase()=="show embedded video") {
							node.textContent = "";
							return;
							}
						//embedded videos
						if(fc.tagName=="EMBED" && /^videoembed/.test(fc.id)) {
							node.textContent = "";
							return;
							}
						}
						
					break;
				}
			
			}
		
		if(node.nodeType==1) vlog(node.tagName + ", " + node.textContent);
		
		//if it has children, recurse on them
		var lastIsBlock, thisIsBlock;
		lastIsBlock = thisIsBlock = null;
		for(var i=0, len=node.childNodes.length, thisChild; thisChild = node.childNodes[i]; i++) {
			lastIsBlock = thisIsBlock;
			
			thisIsBlock = this.isBlock(thisChild);
			vlog(lastIsBlock + ", " + thisIsBlock);
			this.HTMLNode(thisChild, depth+1);
			
			if((lastIsBlock!=null && thisIsBlock) || (lastIsBlock && thisIsBlock!=null && !thisIsBlock)) {
				thisChild.textContent = "_block_break_" + thisChild.textContent;
				}
			
			}
		
		
		//at this point, all children are in boardcode
		
		if(node.nodeType == 1) {
			
			var match;
			
			try {
				var innerText = node.textContent;
				var tag = node.tagName;
				}catch(e){vlog("HTML Parsing error: " + e.message)}
				
			try {
				if(!node.style) node.style = []; //may not exist for some reason
				color = node.getAttribute('color');
				bgcolor = node.getAttribute('bgcolor');
				b = node.style.fontWeight == "bold";
				i = node.style.fontStyle == "italic";
				u = node.style.textDecoration == "underline";
				} catch(e){}
			
			//rgb2hex returns input without spaces if not recognized as rgb
			
			if(color || (node.style.color && (color = rgb2hex(node.style.color))))
				innerText = replaceNotSurrounded(innerText, /\[color\=[^\]]*]/gi, /\[\/color]/gi, "[color=" + color + "]$1[/color]");
			
			if(bgcolor || (node.style.backgroundColor && (bgcolor = rgb2hex(node.style.backgroundColor))))
				innerText = replaceNotSurrounded(innerText, /\[hl\=[^\]]*]/gi, /\[\/hl]/gi, "[hl=" + bgcolor + "]$1[/hl]");
			
			if(b) innerText = "[b]" + innerText.replace(/\[b]([^\[\/b\]]*)\[\/b]/gi, "$1") + "[/b]";
			if(i) innerText = "[i]" + innerText.replace(/\[i]([^\[\/i\]]*)\[\/i]/gi, "$1") + "[/i]";
			if(u) innerText = "[u]" + innerText.replace(/\[u]([^\[\/u\]]*)\[\/u]/gi, "$1") + "[/u]";
			
			switch(tag) {
			  case "B":
			  case "STRONG":
				if(!b) innerText = "[b]" + innerText + "[/b]";
				break;
			  case "I":
			  case "EM":
				if(!i) innerText = "[i]" + innerText + "[/i]";
				break;
			  case "U":
			  case "INS":
				if(!u) innerText = "[u]" + innerText + "[/u]";
				break;
			  case "A":
				if(node.href && this.validProtocolExp.test(node.href) && innerText.indexOf("[image=") != 0) {
					
					//old way of doing it
					/*this.innerLinkExp.lastIndex = 0;
					
					var after = "";
					
					var innerLinkMatch = this.innerLinkExp.exec(innerText);
					if(innerLinkMatch) {
						var innerLinkEnd = this.innerLinkExp.lastIndex;
						var innerLinkStart = innerLinkEnd - innerLinkMatch[0].length + innerLinkMatch[1].length;
						after = " " + innerText.slice(innerLinkEnd, innerText.length);
						innerText = innerText.slice(0, innerLinkStart);
						innerLinkMatch = innerLinkMatch[0];
						this.innerLinkExp.lastIndex = 0;
						}
					else innerLinkMatch = "";
					
					//this is how IGN breaks it up...
					innerText = "[link=" + node.href + "]" + innerText + "[/link]" + innerLinkMatch + after;*/
					
					innerText = this.linkText(innerText, node.href);
					
					}
				break;
			  case "IMG":
				var src = node.getAttribute("src");
				if(src) {
				  var faceMatch;
				  if(node.className && node.className == "BoardFace" && (faceMatch = src.match(/^http:\/\/media\.ign\.com\/boardfaces\/(\d+|facetal)\.gif$/i)))
					innerText = " [face_" + findFaceName(faceMatch[1]) + "] ";
				  else if(/^http:\/\/[^\s]*\.(?:jpe?g|gif|png|bmp)$/i.test(src))
					innerText = "[image=" + src + "]";
				  else innerText = "";
				}
				else innerText = "";
				break;
			  case "LI":
				innerText = "[li]" + innerText + "[/li]";
				break;
			  case "OL":
				innerText = "[ol]" + innerText + "[/ol]";
				break;
			  case "UL":
			  case "MENU":
			  case "DIR":
				innerText = "[ul]" + innerText + "[/ul]";
				break;
			  case "BLOCKQUOTE":
				try {
				  if(
					(!node.className || node.className!="BoardBlockquoteTag") && //[quote]s never have this class
					(match = innerText.match(/^\[b\]([^<>;&"]*?)\[\/b\] posted:\[hr\]([^]*)\[hr\]$/i))
					)
					innerText = "[quote=" + match[1] + "]" + match[2] + "[/quote]";
				  else innerText = "[blockquote]" + innerText + "[/blockquote]";
				} catch(e) {}
				break;
			  case "HR":
				innerText = "[hr]";
				break;
			  case "BR":
				innerText = (!node.type || node.type!="_moz") ? "_line_break_" : "";
				break;
			  case "Q":
				innerText = "\"" + innerText + "\"";
				// fallthrough
			  case "ADDRESS":
				innerText = "[i]" + innerText + "[/i]";
				break;
			  case "H1":
			  case "H2":
			  case "H3":
			  case "H4":
			  case "H5":
			  case "H6":
				innerText = "[b]" + innerText + "[/b]";
				break;
			  case "DIV":
			  case "TABLE":
			  case "TR":
			  case "P":
			  case "PRE":
			  case "CENTER":
			  //we don't want to add block text around the div that's just used as a container
				if(depth!=1 || tag!="DIV")
					innerText = innerText;
				break;
			  case "INPUT":
			  case "TEXTAREA":
			  case "SELECT":
			  case "OPTION":
			  case "FRAME":
			  case "IFRAME":
			  case "MAP":
			  case "APPLET":
			  case "AREA":
			  case "BASE":
			  case "BASEFONT":
			  case "HEAD":
			  case "META":
			  case "SCRIPT":
			  case "STYLE":
			  case "TITLE":
			  case "NOEMBED":
			  case "PARAM":
				innerText = "";
				break;

			}
				
			
			node.textContent = innerText;
			
			}
			
		//remove comment nodes
		//not sure if they're included in textContent, but just in case
		else if(node.nodeType == 8) node.parentNode.removeChild(node);
			
		//if it's a text node, remove any stupid line breaks (usually caused by formatting in HTML code itself)
		else if(node.nodeType == 3) node.nodeValue = node.nodeValue.replace(/\n/g, " ");
		
		}
	
	this.handleBlock = function(_match, $1, $2) {
		var check = ($1 && $2) ? '\n' : '';
		
		/*There's a bug in Firefox where $1 and $2 are "", but
		in other browsers they're undefined.  Change them to
		empty strings if necessary.*/
		
		if(!defined($1)) $1 = "";
		if(!defined($2)) $2 = "";
		return $1 + check + $2;
		}
		
	this.handleBreak = function(_match, $1) {
		var check = $1 ? '' : '\n';
		
		/*There's a bug in Firefox where $1 and $2 are "", but
		in other browsers they're undefined.  Change them to
		empty strings if necessary.*/
		
		if(!defined($1)) $1 = "";
		return check + $1;
		}
	
	this.HTML = function(input) {
		
		if(typeof input == "string" && input.length==0) return input;
		
		vlog("Parsing HTML");
		GM_time("html");
		
		var temp = document.createDocumentFragment();
		
		//handle both HTML strings and plain old HTML elements
		if(typeof input == "string") {
			var node = document.createElement('div');
			node.innerHTML = input;
			temp.appendChild(node);
			}
		else if(typeof input == "object") {
			temp.appendChild(input.cloneNode(true));
			}
			
		temp = temp.firstChild;
		vlog(input);
		this.HTMLNode(temp);
		
		text = temp.textContent+'';
		vlog(text);
		text = text
		.replace(/(?:_line_break_)(_block_break_)?/g, this.handleBreak) //line breaks
		.replace(/_block_break_/g, '\n') //line breaks
		/*
		find any number of consecutive _block_text_ strings and any surrounding characters that aren't whitespace
		if the block text strings are surrounded by non-whitespace, replace them with a line break
		otherwise, replace them with an empty string
		*/
		//.replace(/(\S)?(?:_block_start_)+(\S)?/g, this.handleBlock) //block text
		//.replace(/(\S)?(?:_block_end_)+(\S)?/g, this.handleBlock) //block text
		//.replace(/<(\/)?\w+((\s+\w+(\s*=\s*(?:"(.|\n)*?"|'(.|\n)*?'|[^'">\s]+))?)+\s*|\s*)(\/)?>/gi,"") //HTML entities
		.replace(this.charactersToRemove, "")
		.replace(this.horizontalWhiteSpace, " ") //convert any weird spacing to standard \u0020 spaces
		//.replace(/<![^>]*>/gim, "") //HTML comments
		.replace(/ {2,}/g, ' ') //eat multiple spaces
		.replace(/^ | $/gim, ""); //leading and trailing spaces, that m flag is important
		
		vlog("HTML parsed");
		GM_timeEnd("html");
		
		return text;

		}

	this.handleColor = function(match, sm1) {
		
		return '<span style="color: ' + (sm1.indexOf("#")==-1 ? sm1 : 'rgb(' + hex2rgb(sm1) + ')') + ';" class="BoardColorTag">';
		
		}
		
	this.handleHighlight = function(match, sm1) {
		
		return '<span style="background-color: ' + (sm1.indexOf("#")==-1 ? sm1 : 'rgb(' + hex2rgb(sm1) + ')') + ';" class="BoardHighlightTag">';
		
		}
		
	this.getFaceHTML = function(number, name) {
		
		return ' <img class="BoardFace" src="http://media.ign.com/boardfaces/' + number + '.gif" border="0" alt="' + name + '" hspace="0" vspace="0"> ';
		
		}
		
	this.handleFace = function(match, sm1) {
		
		var number;
		if((number = findFaceNumber(sm1)) != -1) {
			
			return Parse.getFaceHTML(number, sm1);
			
			}
			
		return match;
		
		}
		
	this.shortcutExp = '(^|\\s)(';
	for(var i = 1; i < faces.length; i++) this.shortcutExp += findFaceShortcut(i) + (i==faces.length-1 ? "" : "|");
	this.shortcutExp = new RegExp(this.shortcutExp+")", "g");
	//shortcutExp matches any face shortcut
	
	this.handleShortcut = function(match, sm1, sm2) {
		
		var number = shortcuts2.indexOf(sm2);
		if(number==61) number = "facetal";
		var name = findFaceName(number);
		
		return Parse.getFaceHTML(number, name);
		
		}
	
	this.boardCode = function(text) {
		
		if(text.length==0) return text;
		
		vlog("Parsing BoardCode");
		GM_time("boardcode");
		
		GM_time("bc.1");
		text = text
		.replace(this.charactersToRemove, "").replace(this.horizontalWhiteSpace," ")
		.replace(/&/gi,"&amp;").replace(/>/gi,"&#62;").replace(/</gi,"&#60;")//HTML entities
		.replace(/\[link\=[^\s\]]*]([\s]*)(?=(\[image=(http:\/\/[^\s\]]*\.(?:jpe?g|gif|png|bmp))]))/gi, "$1") //Remove any link surrounding an image
		.replace(/\[image\=(http:\/\/[^\s\]]*\.(?:jpe?g|gif|png|bmp))]([\s]*)?\[\/link\]/gi, "[image=$1]$2")
		.replace(/\[quote=((\[link=((?:f|ht)tps?:\/\/[^\s\]]*)\]([^;\]])*?\[\/link\])|(([^;\]])*))\]/gi, '<blockquote><strong>$1</strong> posted:<hr noshade="noshade">')
		.replace(/\[link=((?:f|ht)tps?:\/\/[^\s\]]*)\]/gi, '<a class="BoardRowBLink" target="boardLink" href="$1" title="$1">')
		.replace(/\[\/link]/gi, "</a>") //ending link tags	
		.replace(/\[image=(http:\/\/[^\s\]]*\.(?:jpe?g|gif|png|bmp))\]/gi, '<a class="BoardRowBLink" target="_blank" href="$1"><img src="$1" border="1" height="120" hspace="5" vspace="5" width="160"></a>')
		.replace(/\[color=([^\s;\]]*)\]/gi, this.handleColor)
		.replace(/\[hl=([^\s;\]]*)\]/gi, this.handleHighlight)
		.replace(/\[face_([a-z0-9!_]*)\]/gi, this.handleFace)
		.replace(this.shortcutExp, this.handleShortcut);
					
		GM_timeEnd("bc.1");
		
		GM_time("bc.2");
		text = text
		.replace(this.horizontalWhiteSpace, " ")
		.replace(/ {2,}/gi, " ") //eat multiple spaces
		.replace(/^ | $/gim, "") //leading and trailing spaces, that m flag is important
		.replace(/\n/gi, "<br>") //line breaks
		//These simple markup tags can easily be replaced here
		.replace(/\[((\/)?(ol|ul|li))\]/gi, "<$1>") //list stuff

		.replace(/\[\/quote]/gi, '<hr noshade="noshade"></blockquote>') //ending quote tags
		.replace(/\[hr]/gi, '<hr size="2" noshade="noshade">') //horizontal rules
		.replace(/\[blockquote]/gi, '<blockquote class="BoardBlockquoteTag">') //regular blockquotes
		.replace(/\[\/blockquote]/gi, "</blockquote>") //make sure you interpret normal quotes before doing this

		.replace(/\[i]/gi, '<span style="font-style: italic;">') //italics
		.replace(/\[u]/gi, '<span style="text-decoration: underline;">') //underline
		.replace(/\[b]/gi, '<span style="font-weight: bold;">') //make sure you interpret normal quotes before doing this
		.replace(/\[\/(i|u|b|color|hl)]/gi, "</span>")

		//extra span is necessary for when cursor is right after line break for some reason
		.replace(/\[cursor]/gi, '<span></span><span class="cursorSpan"></span>');
		
		GM_timeEnd("bc.2");
		
		GM_timeEnd("boardcode");
		vlog("BoardCode parsed");
		
		return text;
		
		}
		
	var pretext = new function() {
		
		var start = GM_getValue("pretextStart", ""),
			before = GM_getValue("pretextBefore", "[quote=[author]]"),
			after = GM_getValue("pretextAfter", "[/quote]\n[cursor]"),
			end = GM_getValue("pretextEnd", ""),
			edit = GM_getValue("pretextEdit", "");
		
		this.__defineGetter__("start", function(){ return start; });
		this.__defineGetter__("end", function(){ return end; });
		this.__defineGetter__("before", function(){ return before; });
		this.__defineGetter__("after", function(){ return after; });
		this.__defineGetter__("edit", function(){ return edit; });
		
		//given the old text (what's in the editor already) and the new text
		//(quoted stuff), return oldtext-endtext + newtext + endtext
		//basically wrapping the endtext back around everything, if it's still there
		this.moveEnd = function(oldtext, newtext) {
		
			//the start and end text will already be there, so [cursor]s will already be replaced
			var text = "", myEndText = this.end.replace(/\[cursor]/g, "");
		
			//if the user has no endtext, there's no need to proceed
			if(myEndText=="") return oldtext + newtext;
			
			var endTextLoc;
			//if the end text isn't there or isn't in the right place, there's no need to proceed
			if((endTextLoc = oldtext.lastIndexOf(myEndText)) + myEndText.length != oldtext.length) return oldtext + newtext;

			//return all the text with the end text at the end
			return oldtext.slice(0, endTextLoc) + newtext + myEndText;
				
			}
		
		//quote some boardcode in the author's name
		this.quote = function(author, text) {
		
			if(this.before=="" && this.after=="") return "[quote=" + author + "]" + text + "[/quote]\n";
		
			if(typeof author != "string") author = "someone";
			
			//replace [author]s with author names
			var myBeforeText = this.before.replace(/\[author]/g, author), myAfterText = this.after.replace(/\[author]/g, author);
			
			return myBeforeText + text + myAfterText;
			
			}
		
		};
		
	this.__defineGetter__("pretext", function(){ return pretext; });
	
	//returns title of the thread
	this.title = function(text) {
		
		var start = text.indexOf("<title>") + 7;
		if(start==6) return "";
		var end = text.indexOf(" -", start);
		if(end==-1) end = text.indexOf("</title>", start);
		if(end==-1) return "";
		
		//stuff inside the tags can have weird spacing around the title itself
		text = text.slice(start, end).match(/^\s*(\S.*)\s*$/);
		
		if(text && text.length>1)
			return text[1].replace(/&amp;/gi, "&")
							.replace(/&lt;/gi, "<")
							.replace(/&gt;/gi, ">")
							.replace(/&quot;/gi, '"');
		else return "";
		
		}
	
	//returns a div copy of the pagination area in some HTML
	this.pages = function(text) {
		
		var progress = 0, start = 0, end = 0, pid = "boards_pagination_wrapper";
	
		if((start = text.indexOf('id="' + pid + '"')) != -1) {
			start = text.indexOf('>', start) + 1;
			end = text.indexOf('</select>', start);
			end = text.indexOf('</div>', text.indexOf('</div>', end)+6);
			
			return createElementX('div', {
				id: pid,
				innerHTML: text.slice(start, end)
				});
			}
		
		return null;
		
		}
		
	//returns an array of Replies parsed from the given HTML, or null if it failed
	this.replies = function(text) {
		
		var start = text.indexOf('<!-- THREAD ROW -->'),
		end = text.lastIndexOf('<!-- /THREAD ROW -->')+20,
		progress = 0,
		rt = text.slice(start, end),
		arr = [];
		
		if(start == -1 || end == 19 || rt=="") return null;
		
		//populate the array
		while((start = rt.indexOf('<!-- THREAD ROW -->', progress)) != -1) {
		
			if((end = rt.indexOf('<!-- /THREAD ROW -->', start)) == -1) end = text.length;
			
			arr.push(new Reply(rt.slice(start, end)));
			
			progress = end;
		
			}
			
		return arr;
		
		}
		
	//returns the user that's being WUL'd
	this.WULUser = function(text) {
		
		var start = text.indexOf('class="InputSection"');
		if(start==-1) return "";
		start = text.indexOf('href="http://club.ign.com/b/about', start);
		//just in case this changes over
		if(start==-1) start = text.indexOf('href="http://people.ign.com/"');
		if(start==-1) return "";
		start = text.indexOf(">", start) + 1;
		if(start==0) return "";
		
		var end = text.indexOf("<", start);
		if(end==-1) return "";
		
		var rv = text.slice(start, end);
		
		if(!I.validUsername.test(rv)) return "";
		
		return rv;
		
		}
	
	//returns array of users already on watched user list
	//watched user list list, yeah yeah
	this.WULList = function(text) {
		
		var start = text.lastIndexOf('class="BoardColumn"');
		if(start==-1) return [];
		start = text.indexOf("<tr>", start);
		if(start==-1) return [];
		
		var end = text.lastIndexOf("</tr>");
		if(end==-1) return [];
		
		//set text equal to only the list of users
		text = text.slice(start, end);
		
		var progress = 0, arr = [];
		
		while((start = text.indexOf('href="http://club.ign.com/b/about', progress))!=-1 ||
				(start = text.indexOf('href="http://people.ign.com/', progress))!=-1) {
			
			start = text.indexOf(">", start) + 1;
			if(start==0) break;
			end = text.indexOf("<", start);
			if(end==-1) break;
			
			arr.push(text.slice(start, end));
			progress = end;
			
			}
			
		return arr;
		
		}
		
	//Cleanup.add(function(){ Parse = null; });
	
	}
