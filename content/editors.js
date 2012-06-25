
//out of date
/**
@class Editor
	Adds an editor to the given parent element
	parent must contain a textarea that the editor is controlling
@params
	parent
		element that will become the new editor element
		the editor class is added to this element and elements are inserted
	map
		optional map to override the properties of the editor upon creation
		ex: {wysiwygOn: false} makes the editor not use the wysiwyg editor by default, overriding user preference
@properties
	references
		ref - main editor element, container of everything
		wysiwygContainer, textarea, wysiwyg, buttons, faces
	wysiwygOn
		indicates/sets visibility of the wysiwyg editor

@methods
	sync(to)
		syncs the textarea and wysiwyg div contents
		if to is true, only the wysiwyg content is synced to the textarea if necessary
		if to is false, only the textarea content is syned to the wysiwyg editor if necessary
	moveCursor()
		moves the cursor to the special cursor text/element for pretext
		does not work properly for wysiwyg
*/

function Editor(parent, map) {
	
	this.ref = parent;
	addClass(this.ref, "editor");
	GM_time("wysiwyg.html");
	var frag = document.createDocumentFragment();
	var div = document.createElement("div");
	frag.appendChild(div);
	div.innerHTML = GM_getFile("extension://content/wysiwyg.html");
	while(div.firstChild) {
		this.ref.appendChild(div.firstChild);
		}
	GM_timeEnd("wysiwyg.html");
	this.wysiwygContainer = getFirstByClassName(this.ref, "wysiwygContainer");
	
	this.textarea = getFirstByTagName(this.ref, "textarea");
	this.wysiwyg = getFirstByClassName(this.wysiwygContainer, "wysiwyg");
	
	//make it so images and stuff can't be resized
	try {
		
		//should be supported by Firefox 3.0+, Chrome doesn't support
		document.execCommand("enableObjectResizing", false, false);
		
		} catch(e) {GM_log(e.message);}
	
	this.buttonsRef = getFirstByClassName(this.ref, "buttons");
	this.faces = getFirstByClassName(this.ref, "faces");
	
	var wysiwygOn = false;
	
	this.buttonRefs = {};
	
	for(var i in this.buttons)
		this.buttonRefs[i] = getFirstByClassName(this.buttonsRef, i + "Button");
	
	if(!Editors.wysiwygDefault) {
		this.wysiwygContainer.style.display = "none";
		}
	else {
		this.sync();
		}
	
	wysiwygOn = Editors.wysiwygDefault;
	this.buttonRefs.toggle.setAttribute("state", wysiwygOn);
	
	this.__defineGetter__("wysiwygOn", function(){return wysiwygOn;});
	this.__defineSetter__("wysiwygOn", function(b){
		if(b!=wysiwygOn) {
			
			this.sync();
			
			this.wysiwygContainer.style.display = wysiwygOn ? "none" : "block";
			
			(wysiwygOn ? this.textarea : this.wysiwyg).focus();
			if(!wysiwygOn) this.restoreSelection(true);
			else this.lastSelection = null;
			
			this.clearButtonStates();
			this.buttonRefs.toggle.setAttribute("state", !wysiwygOn);
			
			wysiwygOn = !wysiwygOn;
			
			}
		});
		
	this.lastSelection = null;
		
	if(map)
		for(var i in map)
			this[i] = map[i];
	
	}
	
Cleanup.add(function(){ Editor = null; });
	
Editor.prototype = {
	
	ref: null,
	wysiwygContainer: null,
	textarea: null,
	wysiwyg: null,
	buttons: null,
	faces: null,
	
	get field(){return this.wysiwygOn ? this.wysiwyg : this.textarea;},
	
	//these handle all the initial line break weirdness in wysiwyg
	get body(){return this.wysiwygOn ? this.wysiwyg.innerHTML.replace(/^\<br\>$/i, "") : this.textarea.value;},
	set body(s){this.wysiwygOn ? this.wysiwyg.innerHTML = s || "<br>" : this.textarea.value=s;},
	
	get notBody(){return this.wysiwygOn ? this.textarea.value : this.wysiwyg.innerHTML.replace(/^\<br\>$/i, "");},
	set notBody(s){this.wysiwygOn ? this.textarea.value=s : this.wysiwyg.innerHTML = s || "<br>";},
	
	/*
	Each button's name "x" corresponds with an element in .editor > .buttons 
	that has the classes "editorButton" and "xButton"
	
	When an Editor is instantiated, references to each button element are stored in Editor.buttonRefs.name
	
	button.state is optional.  state is either:
		A string that's passed to document.queryCommandState to determine state, or
		A function that accepts a reference to the button and returns the button's state
	The button's state is determined with each keyup/mouseup in the editor.  It's reflected in 
	the actual element's "state" attribute, and is styled with CSS according to it.
	
	button.clear is optional.  It's a function that Editor.clearButtonStates will run and 
	pass a reference to the button.  The function should clear the state of the button to its default value.
	If not provided, the button element's "state" attribute is set to false, or removed if button.state
	does not exist.
	
	*/
	
	buttons: {
		
		bold: {
			state: "bold"
			},
			
		italic: {
			state: "italic"
			},
			
		underline: {
			state: "underline"
			},
			
		link: {
			state: function(ref) {
				//queryCommandState("createlink") fails, 
				//"unlink" always returns false
				//I think that is incredibly stupid
				
				var selection = window.getSelection();
				
				for(var i=0, len=selection.rangeCount; i<len; i++) {
					var range = selection.getRangeAt(i);
				
					var start = range.startContainer, end = range.endContainer;
					if(range.collapsed || start == end) {
						if(!this.isLinkOrChildOfLink(start)) return false;
						}
					else if(!this.isLinkOrChildOfLink(start) || !this.isLinkOrChildOfLink(end)) return false;
						
					}
				
				return true;
				
				},
				
			isLink: function(el) {
				if(el.nodeType!=1) return false;
				if(el.tagName=="A" && el.hasAttribute("href")) return true;
				return false;
				},
				
			isLinkOrChildOfLink: function(el) {
				if(this.isLink(el)) return el;
				return getParentBy(el, this.isLink);
				}
			},
			
		image: {
			},
			
		bq: {
			state: function(ref) {
				
				//queryCommandEnabled always returns true for outdent on Chrome
				if(chrome) {
					var anc = window.getSelection().getRangeAt(0).commonAncestorContainer;
					return anc.tagName=="BLOCKQUOTE" || !!getParentByTagName(anc, "blockquote");
					}
					
				return document.queryCommandEnabled("outdent");
				
				}
			},
		
		hr: {
			},
		
		highlight: {
			state: function(ref) {
				var value = document.queryCommandValue(chrome ? "backcolor" : "hilitecolor");
				var valid = value && value != "transparent";
				ref.style.backgroundColor = valid ? value : "";
				ref.style.color = valid ? colorBrightness(value) < 130 ? "white" : "black" : "";
				return valid;
				},
			clear: function(ref) {
				ref.setAttribute("state", false);
				ref.style.backgroundColor = "";
				ref.style.color = "";
				}
			},
		
		color: {
			state: function(ref) {
				var value = document.queryCommandValue("forecolor");
				var valid = value && value != "rgb(0, 0, 0)" && value != "";
				ref.style.backgroundColor = valid ? value : "";
				ref.style.color = valid ? colorBrightness(value) < 130 ? "white" : "black" : "";
				return valid;
				},
			clear: function(ref) {
				ref.setAttribute("state", false);
				ref.style.backgroundColor = "";
				ref.style.color = "";
				}
			},
		
		ol: {
			state: "insertorderedlist"
			},
		
		ul: {
			state: "insertunorderedlist"
			},
		
		quote: {
			},
		
		erase: {
			},
		
		toggle: {
			}
			
		},
		
	checkButtonStates: function() {
		
		//state is not checked in code view
		if(!this.wysiwygOn) return;
		
		for(var i in this.buttons) {
		
			var thisButton = this.buttons[i];
			var thisState = thisButton.state;
			if(!defined(thisState)) continue;
			
			var thisButtonRef = this.buttonRefs[i];
			if(!thisButtonRef) continue;
			
			if(typeof thisState == "string")
				thisButtonRef.setAttribute("state", document.queryCommandState(thisState));
			else if(typeof thisState == "function")
				thisButtonRef.setAttribute("state", thisState.call(thisButton, thisButtonRef));
			
			}
		
		},
		
	clearButtonStates: function() {
		
		for(var i in this.buttons) {
		
			var thisButton = this.buttons[i];
			var thisState = thisButton.state;
			var thisClear = thisButton.clear;
			
			var thisButtonRef = this.buttonRefs[i];
			if(!thisButtonRef) continue;
			
			if(typeof thisClear == "function")
				thisClear(thisButtonRef);
			else {
					
				if(defined(thisState))
					thisButtonRef.setAttribute("state", false);
				else thisButtonRef.removeAttribute("state");
				
				}
			
			}
		
		},
	
	sync: function(to) {
		
		if(defined(to) && typeof to != "boolean" && typeof to != "number" && to != null) to = undefined;
		
		if(this.wysiwygOn && (!defined(to) || to))
			this.notBody = Parse.HTML(this.body);
		else if(!this.wysiwygOn && (!defined(to) || !to))
			this.notBody = Parse.boardCode(this.body);
		
		},
	
	//restore last selection with window.restoreSelection,
	//create default selection if no last selection
	restoreSelection: function(force) {
		
		if(!this.wysiwygOn && !force) return;
		
		if(!this.lastSelection) {
			//make ls = default selection
			this.lastSelection = [];
			var range = document.createRange();
			range.selectNode(this.wysiwyg.firstChild);
			range.collapse(true);
			this.lastSelection.push(range);
			}
		
		restoreSelection(this.lastSelection);
		
		},
	
	moveCursor: function() {
		
		if(!this.wysiwygOn) {
			var cursorIndex;
			if((cursorIndex = this.body.indexOf("[cursor]"))!=-1) {
				this.body = this.body.replace(/\[cursor]/g, "");
				this.field.focus();
				this.field.selectionStart = this.field.selectionEnd = cursorIndex;
				}
			}
				
		else {
		
			//this works now, yay!
			//very painfully made to work in Chrome and FF
			var cursorSpan = getFirstByClassName(this.field, "cursorSpan");
			
			if(cursorSpan) {
				this.field.focus();
				var ran, sel = window.getSelection();
				
				//in Chrome, rangecount will be zero if there's no selection,
				//rather than holding some default selection like in FF
				if(sel.rangeCount<1) {
					ran = document.createRange();
					sel.addRange(ran);
					}
					
				//for some reason, we must modify an existing range, rather than using
				//removeAllRanges, createRange, and addRange
				ran = sel.getRangeAt(0);
				ran.selectNode(cursorSpan);
				
				//without this, the cursor is invisible until you type in Firefox
				ran.deleteContents();
				//ran.collapse(false);
				
				//if you use getSelectionCopy instead of manually constructing the range array,
				//a random ass text node in the header is shown as selected in Chrome, WHHHYYYYY
				//cursorSpan is accurate. ran.startContainer seems accurate.  bug in getSelectionCopy?
				//first iteration in loop, getRangeAt returns the random range.  Weeeiiiird.
				this.lastSelection = [ran];
				}
			
			}
		
		},
		
	/*
	Autocensor only if the user prefers it for the given type of panel.
	*/
	conditionallyAutocensor: function(type) {
		if(Editors.autocensor.posts && /^(topic|reply|edit)$/.test(type) || Editors.autocensor.pms && type=="pm") {
			this.autocensor();
			}
		},
		
	autocensor: function() {
		
		var text = this.body;

		if(Editors.autocensor.asterisks) {
			
			text = text.replace(/(fuck|shit|cunt|gook|\bspic\b|\bkike\b)/gi,"****")
					.replace(/(nigga|fagot)/gi,"*****")
					.replace(/\bchinks\b/gi,"*****s")
					.replace(/(\bspics\b|\bkikes\b)/gi,"****s")
					.replace(/(nigger|faggot)/gi, "******")
					.replace(/fag/gi, "***");
			if(Editors.autocensor.contextual) {
				text = text.replace(/(you|you're an?|,) asshole/gi,"$1 *******")
						.replace(/rape you/gi, "**** you");
				}
			
			}
		
		else {
			
			text = text.replace(/fuck/gi,"funk")
					.replace(/shit/gi,"ship")
					.replace(/cunt/gi,"bunt")
					.replace(/gook/gi,"geek")
					.replace(/\bspic(s)?\b/gi,"spin$1")
					.replace(/\bchink(s)?\b/gi,"chunk$1")
					.replace(/\bkike(s)?\b/gi,"kite$1")
					.replace(/nigg(er|a)/gi,"digg$1")
					.replace(/fag(g)?ot/gi,"fanbot")
					.replace(/fag/gi,"bag");
			if(Editors.autocensor.contextual) {
				text = text.replace(/(you|you're an?|,) asshole/gi,"$1 asspole");
				text = text.replace(/rape you/gi,"tape you");
				}
			
			}
		
		this.body = text;
			
		this.field.scrollTop = this.field.scrollHeight;
		
		return text;
		
		},
	
	//add a tag to the editor in code view
	addTag: function(tag, param, contentIfEmpty) {
		
		if(this.wysiwygOn) return;
		
		var ta = this.field;
		
		if(defined(param))
			param = (tag == "face" ? "_" : "=") + param;
			
		else param = "";

		var singularTags = /^(image|hr|face)$/i;
		var isSingular = singularTags.test(tag);
		
		var start = ta.selectionStart;
		var end = ta.selectionEnd;
		var scroll = ta.scrollTop;
		var isAtBottom = (scroll >= (ta.scrollHeight - ta.offsetHeight));
		
		var inner = ta.value.slice(start, end);
		var before = ta.value.slice(0, start);
		var after = ta.value.substr(end);
		
		var emptyContentReplaced = false;
		if(!isSingular && inner=="" && contentIfEmpty) {
			inner = contentIfEmpty;
			emptyContentReplaced = true;
			}
		
		var spaceBefore = (tag=="face" && before!="" && before[before.length-1]!=" ") ? " " : "";
		var spaceAfter = (tag=="face" && before!="" && after[after.length-1]!=" ") ? " " : "";
		
		var startTag = spaceBefore + "[" + tag + param + "]" + spaceAfter;
		var endTag = "";
		if(!isSingular) endTag = "[/" + tag + "]";
		
		var wrapped = [];
		wrapped.push(startTag, inner, endTag);
		wrapped = wrapped.join("");
		
		var all = [];
		all.push(before, wrapped, after);
		all = all.join("");
		
		ta.value = all;
		
		if(emptyContentReplaced) {
			ta.selectionStart = start + startTag.length;
			ta.selectionEnd = ta.selectionStart + inner.length;
			}
		else if(start!=end) {
			ta.selectionStart = start;
			ta.selectionEnd = start + wrapped.length;
			}
		else ta.selectionStart = ta.selectionEnd = start + startTag.length;
		
		ta.scrollTop = (isAtBottom) ? ta.scrollHeight : scroll;
		
		ta.focus();
		
		},
	
	//insert a text node at the current cursor position and select it
	insertTextNode: function(text) {
		
		var sel = window.getSelection();
		var range = sel.getRangeAt(0);
		var node = document.createTextNode(text);
		range.insertNode(node);
		range.selectNode(node);
		sel.removeAllRanges();
		sel.addRange(range);
		return node;
		
		},
	
	//format text in some way, call no matter the state of this.wysiwygOn
	//e is optional, should be an event but can be any custom object
	//if provided, e.eventDefault will be called, and some information from it is used
	//(see default object)
	format: function(format, e) {
		
		if(typeof e != "object") {
			
			//a default object
			e = {
				type: "click",
				target: {
					title: "null"
					},
				preventDefault: function(){},
				stopPropagation: function(){}
				}
			
			}
			
		e.preventDefault();
		
		format = format.toLowerCase();
		
		this.field.focus();
		//Chrome destroys your selection upon the wysiwyg editor losing focus
		//so if you click a button, we need to restore the last selection
		if(this.wysiwygOn && Listeners.isMouse(e))
			this.restoreSelection();
		
		//this.actions[format].func can contain prompt()s
		//it seems like if there's a prompt in an event handler, preventDefault doesn't work
		//using setTimeout gets around this
		var that = this;
		setTimeout(function(){
			if(that.actions[format] && that.actions[format].func)
				that.actions[format].func(that, e);
			
			that.field.focus();
			},0);
		},
	
	//b - bold
	//i - italics
	//u - underline
	//L - link
	//m - iMage
	//q - quote
	//r - horizontal Rule
	//j - faces
	//o - cOlor
	//h - highlight
	
	//an object that holds all editor actions
	actions: {
		
		//actions are crap that the editor does when a button is clicked
		//or a keyboard shortcut is pressed
		
		/*
		uniquename (lowercase): {
		
			Optional:
		
			key: number, represents the key code of the keyboard key
				that's pressed along with Control to perform the action.
				Don't include if you don't want a keyboard shortcut.
			modifiers: an array of (or just one) acceptable modifier combinations.
				Control must always be true for keyboard shortcuts, 
				if it's included it only applies to clicks.
				The case where no modifiers are used (as in, plain clicking or Control + key) is always allowed.
				Each combination is represented by an integer (see Listeners.modifiersAllowed).
				If not provided, no modifiers are allowed.
			button: string that represents a button name (Editor.buttons.name)
				The button with this name will perform the action.
				Don't include if you don't want to map this action to a button.
			otherCheck: function that's passed the editor and event
				return true if it's okay to proceed with action, false otherwise
				
			One of the following are mandatory:
				
			func: function that's run when Editor.format("uniquename") is called
				function is passed event object from Editor.format, if applicable.
				Next argument is the action object. 
				Function is called so that "this" refers to the applicable Editor.
			override: function that will be run directly from the handler
				instead of Editor.format("uniquename").
				function is passed applicable editor and event object from the handler.

			}
		*/
		
		bold: {
			key: 66, //b
			button: "bold",
			func: function(editor, e) {
				
				if(editor.wysiwygOn)
					document.execCommand("bold", false, null);
					
				else editor.addTag("b");
				
				}
			},
			
		italic: {
			key: 73, //i
			button: "italic",
			func: function(editor, e) {
				
				if(editor.wysiwygOn)
					document.execCommand("italic", false, null);
					
				else editor.addTag("i");
				
				}
			},
			
		underline: {
			key: 85, //u
			button: "underline",
			func: function(editor, e) {
				
				if(editor.wysiwygOn)
					document.execCommand("underline", false, null);
					
				else editor.addTag("u");
				
				}
			},
			
		createlink: {
			key: 76, //l
			modifiers: [2, 4],
			button: "link",
			func: function(editor, e) {
			
				if(e.shiftKey) {
					
					if(editor.wysiwygOn) document.execCommand("unlink", false, null);
					return;
					
					}
			
				var validSelection = false, validUsername = false;
				var username = "";
				var range = window.getSelection().getRangeAt(0);
				
				if(e.altKey) {
					
					//see if a username is already selected
					
					if(editor.wysiwygOn) {
						
						if(!range.collapsed) {
							username = range.toString();
							validSelection = true;
							}
						
						}
						
					else {
						
						var field = editor.field,
							start = field.selectionStart,
							end = field.selectionEnd;
							
						if(start != end) {
							username = field.value.slice(start, end);
							validSelection = true;
							}
						
						}
						
					if(validSelection) {
						username = username.replace(trimExp, "");
						validUsername = Info.validUsername.test(username);
						}
					
					}
				

				if(!e.altKey || !validSelection || !validUsername) {
				
					//if this is a normal link operation or no username was selected, ask for the url/username
					
					var changeExistingHref = false, containingLink = null;
					if(!e.altKey && range.collapsed && editor.wysiwygOn && (containingLink = editor.buttons.link.isLinkOrChildOfLink(range.startContainer))) {
						changeExistingHref = true;
						}
					
					var text = "Link URL", value = "http://";
					
					if(e.altKey) {
						text = "Profile link username";
						value = Info.username;
						}
					else if(changeExistingHref) {
						text = "Change existing link URL";
						value = containingLink.href;
						}
					
					var linkHref = prompt(text, value);
					//if they press cancel, do nothing
					if(linkHref==null || (editor.wysiwygOn && linkHref=="")) return;
					
					if(e.altKey) {
						username = linkHref.replace(trimExp, "");
						validUsername = Info.validUsername.test(username);
						if(!validUsername) return;
						}
						
					}
				
				if(e.altKey) linkHref = "http://club.ign.com/b/about?username=" + username + "&which=boards";
				
				if(editor.wysiwygOn) {
				
					//just in case we're already in a link, unlink what's linked
					//Chrome destroys the selection at some point upon unlinking, so we have to it this way
					//instead of calling document.execCommand directly.  Not entirely sure why this works.
					editor.format("unlink", e);
	
					var collapsed = range.collapsed;
					var textNode;
					
					if(e.altKey && !validSelection) {
						//insert the username, then select it to be linked later
						textNode = editor.insertTextNode(username);
						}
					
					//if it's a regular link operation and there's no selection,
					//we need to insert some default text and select it
					//because the default createlink behavior won't create a link if there's no selection.
					//Chrome will insert the link url in this case, so ignore chrome
					if(!chrome && !e.altKey && collapsed && !changeExistingHref) {
						//insert a word-joiner character that takes up no space
						textNode = editor.insertTextNode("\u2060");
						}
						
					if(changeExistingHref) {
						containingLink.href = linkHref;
						return;
						}
					else document.execCommand("createlink", false, linkHref);
					
					var range = window.getSelection().getRangeAt(0);
					var parent;
					//select within the appropriate link
					if( (textNode && (parent = getParentByTagName(textNode, "A"))) ||
						((range.startContainer!=range.endContainer || range.startContainer.tagName != range.endContainer.tagName != "A") && (parent = range.startContainer.nextSibling)) ) {
						range.selectNodeContents(parent);
						}
					
					//if we don't collapse the selection afterwards,
					//the cursor is invisible
					if(!e.altKey && collapsed)
						range.collapse(true);

					}
				
				else editor.addTag("link", linkHref, e.altKey ? username : undefined);
				
				}
			},
			
		insertimage: {
			key: 77, //m
			button: "image",
			func: function(editor, e) {
				
				var imageSrc = prompt("Image URL", "http://");
				if(imageSrc == null) return;
				
				if(editor.wysiwygOn) {
					if(imageSrc!="") document.execCommand("insertimage", false, imageSrc);
					}
				else editor.addTag("image", imageSrc);
				
				}
			},
			
		blockquote: {
			button: "bq",
			func: function(editor, e) {
				
				if(editor.wysiwygOn) {
					//using formatblock prevents you from doing nested blockquotes in Chrome
					//but using indent on Firefox only makes a div with a margin
					if(chrome) {
						document.execCommand("indent", false, null);
						}
					else {
						document.execCommand("formatblock", false, "<blockquote>");
						}
					}
				
				else editor.addTag("blockquote");
				
				}
			},
			
		horizontalrule: {
			key: 82, //r
			button: "hr",
			func: function(editor, e) {
				
				if(editor.wysiwygOn)
					document.execCommand("inserthtml", false, '<hr size="2" noshade="noshade">');
				
				else editor.addTag("hr");
				
				}
			},
			
		hilitecolor: {
			key: 72, //h
			button: "highlight",
			func: function(editor, e) {
				
				var highlight = prompt("Highlight text (any valid CSS color)", GM_getValue("lastHighlightWysiwyg", "black"));
				
				if(highlight==null) return;
				
				var emptyString = highlight=="";
				if(emptyString) highlight = "transparent";
				
				if(editor.wysiwygOn) {
				
					if(chrome && window.getSelection().getRangeAt(0).collapsed) {
						//this fixes this case in Chrome for some reason, otherwise nothing happens
						editor.insertTextNode("\u2060");
						window.getSelection().getRangeAt(0).collapse(false);
						}
						
					document.execCommand("hilitecolor", false, highlight);
					
					}
				else editor.addTag("hl", highlight);
				
				if(!emptyString) GM_setValue("lastHighlightWysiwyg", highlight);
					
				}
			},
			
		forecolor: {
			key: 79, //o
			button: "color",
			func: function(editor, e) {

				var color = prompt("Color text (any valid CSS color)", GM_getValue("lastColorWysiwyg", "#C1C2C9"));
				
				if(color==null) return;
				
				var emptyString = color=="";
				if(emptyString) color = "black";
				
				if(editor.wysiwygOn) document.execCommand("forecolor", false, color);
				else editor.addTag("color", color);
				
				if(!emptyString) GM_setValue("lastColorWysiwyg", color);
				
				}
			},
			
		insertorderedlist: {
			button: "ol",
			func: function(editor, e) {
				
				if(editor.wysiwygOn)
					document.execCommand("insertorderedlist", false, null);
					
				else editor.addTag("ol");
				
				}
			},
			
		insertunorderedlist: {
			button: "ul",
			func: function(editor, e) {
				
				if(editor.wysiwygOn)
					document.execCommand("insertunorderedlist", false, null);
					
				else editor.addTag("ul");
				
				}
			},
			
		quote: {
			key: 81, //q
			modifiers: 2,
			button: "quote",
			func: function(editor, e) {
				
				var username = prompt("Quoted username", "");
				if(username == null) return;
				
				if(editor.wysiwygOn) {
					
					//get the range object
					var range = window.getSelection().getRangeAt(0);
					//range.extractContents gives us a document fragment.  We can't get the innerhtml of a frag, so lets make a container
					var middle = document.createElement('div');
					//append the selected fragment while simultaneously removing it from the editor
					middle.appendChild(range.extractContents());
					//get the html
					middle = middle.innerHTML;
					
					var middleIsEmpty = middle=="";
					if(middleIsEmpty) middle = '<span></span><span class="cursorSpan"></span><br>';
					
					if(e.altKey) {
						document.execCommand("inserthtml", false, Parse.boardCode(Parse.pretext.quote(username, Parse.HTML(middle))));
						}
					else {
						//and, finally, insert it formatted with the inserthtml command
						document.execCommand("inserthtml", false, "<br><blockquote><strong>" + username + '</strong> posted:<hr noshade="noshade">' + middle + '<hr noshade="noshade"></blockquote><br>');
						}
					
					if(middleIsEmpty || e.altKey) {
						editor.moveCursor();
						editor.restoreSelection();
						}
					
					}
				
				// !editor.wysiwygOn
				else {
				
					if(e.altKey) {
						
						//todo - move this functionality into a different function that
						//can also be used by addTags
						
						var start = editor.field.selectionStart,
							end = editor.field.selectionEnd,
							scroll = editor.field.scrollTop,
							atBottom = scroll >= (editor.field.scrollHeight - editor.field.offsetHeight),
							before = editor.body.slice(0, start),
							middle = Parse.pretext.quote(username, editor.body.slice(start, end)),
							after = editor.body.slice(end, editor.body.length);
						
						editor.body = before + middle + after;
						
						editor.field.selectionStart = editor.field.selectionEnd = (before + middle).length;
						
						editor.moveCursor();
						
						editor.field.scrollTop = atBottom ? editor.field.scrollHeight : scroll;
						
						}
					
					else editor.addTag("quote", username);
					
					}
				
				}
			},
			
		removeformat: {
			key: 69, //e
			button: "erase",
			func: function(editor, e) {
				
				if(editor.wysiwygOn) {
					
					if(chrome && window.getSelection().getRangeAt(0).collapsed) {
						//this fixes this case in Chrome for some reason, otherwise nothing happens
						editor.insertTextNode("\u2060");
						window.getSelection().getRangeAt(0).collapse(false);
						}
					
					document.execCommand("removeformat", false, null);
					
					}
					
				//no support for code view
				
				}
			},
			
		togglewysiwyg: {
			key: 83, //s
			button: "toggle",
			override: function(editor, e) {
				
				e.preventDefault();
				editor.wysiwygOn = !editor.wysiwygOn;
				
				}
			},
			
		face: {
			key: 74, //j
			otherCheck: function(editor, e) {
				
				return e.type!="click" || (e.target.tagName == "IMG" && getParentByClassName(e.target, "faces", 1));
				
				},
			func: function(editor, e) {
				
				var faceName;
				if(e.type=="keydown") {
					faceName = prompt("Face name", "mischief");
					if(faceName == null) return;
					}
				else faceName = e.target.title;
				
				if(editor.wysiwygOn) {
					var html = ' <img title="' + faceName + '" class="BoardFace" src="http://media.ign.com/boardfaces/' + findFaceNumber(faceName) + '.gif" alt="' + faceName + '"> ';
					document.execCommand("inserthtml", false, html);
					}
				else editor.addTag("face", faceName);
				
				}
			}
		
		}
	
	};
	
/**
@static Editors
	Manager of all editors on the page
@methods
	get(ref, lookForChild)
		given a child element in the document of the editor or the editor itself, 
		find the Editor object of its parent
		alternatively, if lookForChild is true, a parent element can be given
	open(parent, map)
		same as Editor's constructor
*/

Editors = new function Editors_Obj() {
	
	var editors = [];
	
	this.__defineGetter__("wysiwygDefault", function(){return GM_getValue("wysiwygDefault", true);});
	
	var autocensor = new function() {
		this.__defineGetter__("posts", function(){return GM_getValue("autocensorPosts", true);});
		this.__defineGetter__("pms", function(){return GM_getValue("autocensorPMs", false);});
		this.__defineGetter__("asterisks", function(){return GM_getValue("autocensorAsterisks", true);});
		this.__defineGetter__("contextual", function(){return GM_getValue("autocensorContextual", false);});
		};
	
	this.__defineGetter__("autocensor", function(){return autocensor;});
	
	this.__defineGetter__("length", function(){return editors.length;});
	
	var find = function(ref) {
		for(var i=0, len=editors.length; i<len; i++)
			if(ref == editors[i].ref) return editors[i];
		return null;
		}
		
	this.get = function(ref, lookForChild) {
		
		if(!defined(ref) || ref==null || editors.length<1) return null;
		
		if(typeof ref == "object") {
			if(hasClass(ref, "editor")) {
				return find(ref);
				}
			else {
				if(!defined(lookForChild)) lookForChild = false;
				
				return this.get( lookForChild ? getFirstByClassName(ref, "editor")
												: getParentByClassName(ref, "editor"));
				}
			}
			
		else if(typeof ref == "number" && ref >= 0 && ref <= editors.length-1) 
			return editors[ref];
			
		return null;
		
		}
		
	this.open = function(parent, map) {
		
		var newEditor = new Editor(parent, map);
		editors.push(newEditor);
		return newEditor;
		
		}
		
	this.actionHandler = function(e) {
		
		if(!e.target) return;
		
		var isKb = Listeners.isKb(e), 
			isMouse = !isKb && Listeners.isMouse(e);
		
		if(isKb) {
			if(!e.ctrlKey) return;
			if(e.target.className!="wysiwyg" && e.target.className!="body")
				return;
			}
		else if(isMouse) {
			if(e.which != 1) return;
			if(!getParentByClassName(e.target, "buttons", 1) && !getParentByClassName(e.target, "faces", 1))
				return;
			}
		
		var myed = Editors.get(e.target);
		
		if(!myed) return;
		
		var actionPerformed = false;
		
		//go through all the actions to see if the key combination matches
		for(var i in myed.actions) {
			var thisAction = myed.actions[i];
			
			//make sure the key matches
			if(isKb && (!defined(thisAction.key) || thisAction.key != e.which))
				continue;
			
			var hasOverride = typeof thisAction.override == "function",
				hasFunc = typeof thisAction.func == "function";
			
			//make sure it has a function
			if(!hasOverride && !hasFunc)
				continue;
			
			//make sure the button matches
			if(isMouse && thisAction.button) {

				var ref = myed.buttonRefs[thisAction.button];
				if(!ref || e.target != ref) continue;
				
				}
			
			if(typeof thisAction.otherCheck == "function" && !thisAction.otherCheck(myed, e))
				continue;
			
			//make sure the modifiers are allowed
			//ignore Control if this is a keyboard shortcut
			//the default case with no modifiers is always allowed
			if(Listeners.modifiersAllowed(thisAction.modifiers, e, isKb ? 1 : 0, 0)) {
				actionPerformed = true;
				if(hasOverride) thisAction.override(myed, e);
				if(hasFunc) myed.format(i, e);
				//I could break the loop here, but it's possible that there's a different
				//action mapped to the same key
				}
			
			}
			
		if(actionPerformed) myed.checkButtonStates();
		
		}
		
	this.stateHandler = function(e) {
	
		if(!e.target) return;
		
		var closestElement = e.target;
		
		//state is not monitored in code view
		if(closestElement.tagName == "TEXTAREA" && closestElement.className == "body")
			return;

		if(e.target.className!="wysiwyg")
			if(Listeners.isKb(e) || !(closestElement = getParentByClassName(e.target, "wysiwyg")))
				return;
				
		var myed = Editors.get(closestElement);
		if(myed) myed.checkButtonStates();
		
		}
	
	//accepts a Selection or a copy of one
	//returns Editor if entire selection is within a wysiwyg editor
	//returns false otherwise, including when there's no selection
	this.selectionInEditor = function(sel) {
		
		if(!sel) return false;
		
		var len = defined(sel.rangeCount) ? sel.rangeCount : defined(sel.length) ? sel.length : 0;
		
		if(!len) return false;
		
		var editor = null;
		for(var i=0; i<len; i++) {
			
			var thisRange = sel.getRangeAt ? sel.getRangeAt(i) : sel[i];
			if(!thisRange) return false;
			
			var field = thisRange.commonAncestorContainer;
			
			if(hasClass(field, "wysiwyg") || (field = getParentByClassName(field, "wysiwyg")))
				if((editor && this.get(field)==editor) || (!editor && (editor=this.get(field))))
					continue;
				
			return false;
			
			}
			
		return editor;
		
		}
		
	Listeners.add(document, "keydown", this.actionHandler, true);
	Listeners.add(document, "click", this.actionHandler, true);
	
	Listeners.add(document, "keyup", this.stateHandler, true);
	Listeners.add(document, "mouseup", this.stateHandler, true);
	
	Listeners.add(document, "mousedown", function(e) {
		
		if(e.which!=1 || !e.target) return;
			
		var copy = getSelectionCopy();
		if(!(myed=Editors.selectionInEditor(copy))) return;
			
		myed.lastSelection = copy;
		//vlog(inspect(myed.lastSelection));
		
		}, true);
	
	
	};

Cleanup.add(function(){ Editors = null; });
	

//autocensor when post button is focused
//Chrome doesn't fire this when the button is clicked (#252)
Listeners.add(document, 'focus', function(e) {

	if(!e.target || e.target.className != "postButton")
		return;

	var mypa = Panels.get(e.target);
	if(!mypa || e.target != mypa.postButton) return;

	mypa.editor.conditionallyAutocensor(mypa.type);

	}, true);
