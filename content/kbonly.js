
var selectorBox = new function() {
	
	if(!GM_getValue("keyboardBrowsing", false)) return;
	
	this.init = function() {
		
		this.top = document.createElement("div");
		this.top.className = "selectorBox";
		this.top.id = "sbTop";
		this.top.style.top = this.top.style.left = this.top.style.width = this.top.style.height = "0px";
		this.right = this.top.cloneNode(false);
		this.bottom = this.top.cloneNode(false);
		this.left = this.top.cloneNode(false);
		this.right.id = "sbRight";
		this.bottom.id = "sbBottom";
		this.left.id = "sbLeft";
		document.body.appendChild(this.top);
		document.body.appendChild(this.right);
		document.body.appendChild(this.bottom);
		document.body.appendChild(this.left);
		
		this.frameCount = 15;
		this.mspf = 10;
		this.curFrame = 0;
		this.barWidth = parseInt(this.left.offsetWidth);
		
		this.curEl = document.body;
		
		Listeners.add(document, 'keydown', this.keyHandler, true);
	
		this.setPosition(0 + this.barWidth, 
						0 + this.barWidth, 
						window.innerWidth - (2*this.barWidth),
						window.innerHeight - (2*this.barWidth));
		
		}
	
	this.moveTo = function(el) {
	
		var elP = findPos(el), elW = el.offsetWidth, elH = el.offsetHeight;
		if(el!=this.curEl) mouseOut(this.curEl);
		
		var w = this.barWidth;
		
		this.animateTo(elP[0], elP[1], elW, elH);
		this.curEl = el;
		mouseOver(el);
		
		};
		
	this.animateTo = function(x, y, w, h) {
		
		if(this.animateID) clearInterval(this.animateID);
		this.curFrame = 0;
		
		var ts = this.top.style;
		var bw = this.barWidth;
		
		this.xStep = (x - ts.left.split("px")[0] - bw)/this.frameCount;
		this.yStep = (y - ts.top.split("px")[0] - bw)/this.frameCount;
		this.wStep = (w - ts.width.split("px")[0] + 2*bw)/this.frameCount;
		this.hStep = (h - this.left.style.height.split("px")[0])/this.frameCount;
		
		this.animateID = setInterval(function(that){that.animateToWorker();}, this.mspf, this);
		
		};
		
	this.animateToWorker = function() {
		
		var w = this.barWidth;
		
		if(this.curFrame >= this.frameCount) {
			this.curFrame = 0;
			var pos = findPos(this.curEl);
			var ce = this.curEl;
			this.setPosition(pos[0], pos[1], ce.offsetWidth, ce.offsetHeight);
			clearInterval(this.animateID);
			}
			
		else {
			
			var t = this.top.style;
			
			this.curFrame++;

			this.setPosition(
				parseFloat(t.left.split("px")[0]) + w + this.xStep,
				parseFloat(t.top.split("px")[0]) + w + this.yStep,
				parseFloat(t.width.split("px")[0]) - 2*w + this.wStep,
				parseFloat(this.left.style.height.split("px")[0]) + this.hStep
				);
				
			
			
			}
		
		};
		
	//given the coordinates and width of a target, move the selectorBox so it is around that target
	this.setPosition = function(x, y, w, h) {
		
		var bw = this.barWidth;
		
		var t = this.top.style;
		var b = this.bottom.style;
		var l = this.left.style;
		var r = this.right.style;
		
		t.top = y - bw + "px";
		l.top = r.top = y + "px";
		t.left = l.left = b.left = x - bw + "px";
		b.top = y + h + "px";
		r.left = x + w + "px";
		t.width = b.width = w + (2*bw) + "px";
		l.height = r.height = h + "px";
		
		};
		
	this.isValidNode = function(el) {
		
		if(!el) return false;
		
		if(el.nodeType!=1 || window.getComputedStyle(el, null).display=="none") return false;
		else {
			var tag = el.tagName.toLowerCase();
			
			switch(tag) {
				case "script":
				case "link":
				case "b":
				case "i":
				case "u":
				case "head":
				case "title":
				case "style":
				case "noscript":
					return false;
				
				default:
					return true;
				
				}
			
			}
		
		};
		
	this.findValidChild = function(el) {
	
		var pChild = el.childNodes[0];
	
		if(!pChild) return el;
		
		if(this.isValidNode(pChild)) return this.isValidForVesti(pChild).child;
	
		else {
			
			while(pChild = pChild.nextSibling) {
				if(this.isValidNode(pChild)) return this.isValidForVesti(pChild).child;
				}
			
			return el;
			
			}
	
		};
		
	this.findValidNextSibling = function(el) {
		
		var pSibling = el.nextSibling;
		
		if(!pSibling) return this.findValidParent(el); 
		
		if(this.isValidNode(pSibling)) return this.isValidForVesti(pSibling).next;
		
		var n = this.findValidNextSibling(pSibling);
		if(n!=pSibling) return n;
			
		return this.findValidParent(el);
		
		};
		
	this.findValidPrevSibling = function(el) {
		
		var pSibling = el.previousSibling;
		
		if(!pSibling) return this.findValidParent(el);
		
		if(this.isValidNode(pSibling)) return this.isValidForVesti(pSibling).prev;
		
		var p = this.findValidPrevSibling(pSibling);
		if(p!=pSibling) return p;
		
		return this.findValidParent(el);
		
		};
		
	this.findValidParent = function(el) {
		
		var pParent = el.parentNode;
		
		if(!pParent) return el;
		
		if(this.isValidNode(pParent)) return this.isValidForVesti(pParent).parent;
		
		var p = this.findValidParent(pParent);
		if(p!=pParent) return p;
		
		return el;
		
		};
		
	this.isActionable = function(el) {
		
		if(el.tagName) var tag = el.tagName.toLowerCase();
		else return false;
		
		switch(tag) {
			case "a":
			case "textarea":
				return true;
			
			case "input":
				var type = el.type;
				switch(type) {
					case "checkbox":
					case "submit":
					case "image":
					case "text":
						return true;
					default:
						return false;
					}
					
			default:
				return false;
			
			}
		
		};
		
	//consumes an element
	//produces the actionable element in that element's subtree, or false if one cannot be found
	this.findValidActionableElement = function(el) {
		
		var pChild = this.findValidChild(el);
			
			while(pChild!=el) {
				vlog(pChild.innerHTML);
				if(this.isActionable(pChild)) return pChild;
				else {
					var a = this.findValidActionableElement(pChild);
					if(a) return a;
					}
					
				var newChild = this.findValidNextSibling(pChild);
				if(newChild==pChild) break;
				else pChild = newChild;
				}
				
			return false;
		
		};
		
	this.findClosestSubLink = function(el, matches) {
		
		var area;
		
		if(area = el.getElementsByClassName("boards_thread_links")[0]) {
			
			var links = area.getElementsByTagName("A");
			var len = links.length;
			
			for(var i=0; i<len; i++) {
				if(matches(links[i])) return links[i];
				}
				
			return false;
			
			}
			
		else if(el.parentNode) return this.findClosestSubLink(el.parentNode, matches);
		else return false;
		
		};
		
	this.isValidForVesti = function(el) {
		
		if(el.className) {
			
			if(el.className=="clear") {
				var n = this.findValidNextSibling(el);
				if(n==el) n = this.findValidPrevSibling(el);
				if(n==el) n = this.findValidParent(el);
				return {valid:false, child:n, parent:this.findValidParent(el), next:n, prev:this.findValidPrevSibling(el)};
				}
			
			}
			
		if(el.id) {
			
			if(el.id=="navigation_content_gutter") {
				var n = this.findValidNextSibling(el);
				return {valid:false, child:n, parent:n, next:n, prev:this.findValidPrevSibling(el)};
				}
				
			else if(el.id=="boards_board_list_table") {
				var c = this.findValidChild(el);
				var p = this.findValidPrevSibling(el);
				return {valid:false, child:c, parent:p, next:c, prev:c};
				}
				
			else if(el.id=="boards_full_width_background") {
				var c = el.childNodes[3];
				var p = document.getElementById("nav_channel");
				return {valid:false, child:c, parent:p, next:c, prev:p};
				}
			
			}
			
		return {valid:true, child:el, parent:el, next:el, prev:el};
		
		};
		
	this.keyHandler = function(e) {
	
		var key = e.which;
		var evt = e.target;
		
		if(!evt.tagName || (evt.tagName!="INPUT" && evt.tagName!="TEXTAREA" && (!evt.className || evt.className!="wysiwyg"))) {
		
			if(!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
			
				switch(key) {
				
					//enter
					case 13:
						e.preventDefault();
						var target = selectorBox.findValidChild(selectorBox.curEl);
						if(target!=selectorBox.curEl) selectorBox.moveTo(target);
						else {
							var notCanceled = click(target);
							if(target.tagName=="A" && notCanceled) window.location.href = target.href;
							}
						break;
					
					//down, right
					case 40:
					case 39:
						e.preventDefault();
						var curEl = selectorBox.curEl;
						var pos = new Position(curEl);
						if(!pos.bottom.enclosed && !pos.vert.before) window.scrollTo(pos.window.left, pos.window.top+(3*pos.window.height/4));
						else selectorBox.moveTo(selectorBox.findValidNextSibling(curEl));
						break;
						
					//up, left
					case 38:
					case 37:
						e.preventDefault();
						var curEl = selectorBox.curEl;
						var pos = new Position(curEl);
						if(!pos.top.enclosed && !pos.vert.after) window.scrollTo(pos.window.left, pos.window.top-(3*pos.window.height/4));
						else selectorBox.moveTo(selectorBox.findValidPrevSibling(curEl));
						break;
						
					//a
					case 65:
						e.preventDefault();
						var target = selectorBox.isActionable(selectorBox.curEl) ? selectorBox.curEl : selectorBox.findValidActionableElement(selectorBox.curEl);
						if(target) {
							selectorBox.moveTo(target);
							var notCanceled = click(target);
							if(target.tagName=="A" && notCanceled) window.location.href = target.href;
							vlog(target.tagName);
							}
						break;
						
					//r
					case 82:
						e.preventDefault();
						function replyMatch(el) {
							return el.href.indexOf("PostReply")!=-1 && el.href.indexOf("quote")==-1;
							}
						click(selectorBox.findClosestSubLink(selectorBox.curEl, replyMatch));
						selectorBox.moveTo(selectorBox.curEl);
						break;
						
					//q
					case 81:
						e.preventDefault();
						function quoteMatch(el) {
							return el.href.indexOf("PostReply")!=-1 && el.href.indexOf("quote")!=-1;
							}
						click(selectorBox.findClosestSubLink(selectorBox.curEl, quoteMatch));
						selectorBox.moveTo(selectorBox.curEl);
						break;
				
					}
			
				}
				
			else if(e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
			
				switch(key) {
				
					//enter
					case 13:
						e.preventDefault();
						selectorBox.moveTo(selectorBox.findValidParent(selectorBox.curEl));
						break;
				
					}
			
				}
			
			}
	
		}
		
	//Cleanup.add(function(){ selectorBox = null; });

	}
	
if(GM_getValue("keyboardBrowsing", false)) {

	selectorBox.init();
	switch(I.url.pageType) {
		case "board":
			selectorBox.moveTo(document.getElementById("boards_board_list_header"));
			break;
		
		case "topic":
			selectorBox.moveTo(document.getElementById("boards_thread_header_links"));
			break;
			
		default:
			selectorBox.moveTo(document.getElementById("boards_container"));
			break;
		
		}
	

	}
