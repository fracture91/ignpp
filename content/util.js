

function vlog(t) { GM_log(t); }

function logError(n, e) {
	if(typeof n != "string") n = "General";
	vlog(n + " Error: " + (e.message ? e.message : e) + (e.name ? ", " + e.name : ""));
	}
	
// Determine if a reference is defined
function defined(o) {
	return (typeof(o)!="undefined");
	}
	
//Chrome will have defined window.chrome, but Firefox doesn't.
//Setting it to null lets us easily check if the browser is Chrome in an if statement.
if(!defined(window.chrome)) chrome = null;
	
	
//not done yet or tested properly
//plan to use for anonymous posting (need to delete and restore cookies)
//may not work if correct cookies are inaccessible, then I'd have to use the cookie monster
//http://www.michael-noll.com/wiki/Cookie_Monster_for_XMLHttpRequest
	
var Cookie = {
	
	get all(){return document.cookie},
	
	//put the data into a multidimensional array
	toArray: function(data){
		if(!defined(data)) data = this.all;
		data = data.replace(/ /g, "").split(";");
		var arr = [];
		for(var i=0, len=data.length; i<len; i++) {
			var split = data[i].split("=");
			if(split[0]=="") continue;
			arr.push([split[0], split[1]]);
			}
		return arr;
		},
	
	//delete everything in the cookie
	clear: function() {
		var arr = this.toArray();
		for(var i=0, len=arr.length; i<len; i++)
			this.set(arr[i][0], "");
		},
		
	get: function(key) {
		if(this.all.indexOf(key+"=")==-1) return;
		return this.all.split(key+"=")[1].split(";")[0];
		},
		
	//set the given key to the given value
	//can alternately pass in a string like "a=b;b=c;"
	//or a multidimensional array from toArray
	set: function(key, value) {
		if(!defined(key)) return false;
		var hasMultiple = false;
		if((typeof key == "object" && key!=null) || (hasMultiple = (typeof key == "string" && key.indexOf("=")!=-1))) {
			if(hasMultiple) key = this.toArray(key);
			for(var i=0, len=key.length; i<len; i++)
				this.set(key[i][0], key[i][1]);
			return this.all;
			}
		return document.cookie = key + "=" + (defined(value) ? value : "");
		},
	
	//set the whole cookie to this data
	set all(to) {
		this.clear();
		this.set(to);
		}
	
	}
	
function appendAllChildren(from, to) {
	var len = from.childNodes.length;
	for(var i=0; i<len; i++)
		to.appendChild(from.firstChild);
	return to;
	}

//returns an array of strings with all the classes on the object
function getClasses(obj) {
	return formatClassString(obj.className).split(" ");
	}
	
//remove multiple spaces and leading/trailing whitespace
function formatClassString(str) {
	return str.replace(/\s{2,}/gi, ' ').replace(/^\s|\s$/gi, '');
	}

// Determine if an object or class string contains a given class.
// If given no className, it will return true if the element has any class
function hasClass(obj,className) {
	if (!defined(obj) || obj==null || !RegExp) return false;
	if(!defined(className)) return (typeof obj == "string" ? obj : obj.className ? obj.className : '').replace(/\s/gi, '') != '';
	var re = new RegExp("(^|\\s)" + className + "(\\s|$)");
	if (typeof(obj)=="string") 
		return re.test(obj);
	else if (typeof(obj)=="object" && obj.className)
		return re.test(obj.className);
	return false;
	}
  
// Add a class to an object
function addClass(obj,className) {
	if (typeof(obj)!="object" || obj==null || !defined(obj.className)) return false;
	if (!hasClass(obj)) { 
		obj.className = formatClassString(className); 
		return true; 
		}
	if (hasClass(obj,className)) return true;
	obj.className = formatClassString(obj.className + " " + className);
	return true;
	}
  
// Remove a class from an object
function removeClass(obj,className) {
	if (typeof(obj)!="object" || obj==null || !defined(obj.className) || obj.className==null) return false;
	if (!hasClass(obj,className)) return false;
	var re = new RegExp("(^|\\s+)" + className + "(\\s+|$)");
	obj.className = formatClassString(obj.className.replace(re,' '));
	return true;
	}
  
// Fully replace a class with a new one
function replaceClass(obj,className,newClassName) {
	if (typeof(obj)!="object" || obj==null || !defined(obj.className) || obj.className==null) return false;
	removeClass(obj,className);
	addClass(obj,newClassName);
	return true;
	}
	
function getParentByClassName(el, name, depth) {
	if(typeof depth != "number") depth = -1;
	if(depth == 0) return null;
	var p = el.parentNode;
	if(!p || p.tagName == 'HTML') return null;
	else if(hasClass(p, name)) return p;
	else return getParentByClassName(p, name, depth-1);
	}
	
function getParentBy(el, func, depth) {
	
	if(typeof depth != "number") depth = -1;
	if(depth == 0) return null;
	var p = el.parentNode;
	if(!p || p.tagName == 'HTML') return null;
	else if(func(p, depth)) return p;
	else return getParentBy(p, func, depth-1);
	
	}
	
function getParentByTagName(el, name) {
	var p;
	if(!el || !(p = el.parentNode) || p.tagName == 'HTML') return null;
	else if(p.tagName==name.toUpperCase()) return p;
	else return getParentByTagName(p, name);
	}
	
function getFirstByClassName(el, name) {
	if(el && (el = el.getElementsByClassName(name)) && (el = el[0]))
		return el;
	return null;
	}
	
function getLastByClassName(el, name) {
	if(el && (el = el.getElementsByClassName(name)) && (el = el[el.length-1]))
		return el;
	return null;
	}
	
function getFirstByTagName(el, name) {
	if(el && (el = el.getElementsByTagName(name)) && (el = el[0]))
		return el;
	return null;
	}
	
function getNextByTagName(el, name) {
	if(!el || !(el=el.nextSibling)) return null;
	if(el.tagName==name.toUpperCase()) return el;
	return getNextByTagName(el, name);
	}
	
function getChildByClassName(el, name) {
	var children = el.childNodes;
	for(var i=0, len=children.length; i<len; i++) {
		var thisChild = children[i];
		if(hasClass(thisChild, name)) return thisChild;
		}
	return null;
	}
	
function getChildrenByClassName(el, name) {
	var children = el.childNodes, arr=[];
	for(var i=0, len=children.length; i<len; i++) {
		var thisChild = children[i];
		if(hasClass(thisChild, name)) arr.push(thisChild);
		}
	return arr.length>0 ? arr : null;
	}
	
function getChildrenByTextContent(el, tc) {
	var children = el.childNodes, arr=[];
	for(var i=0, len=children.length; i<len; i++) {
		var thisChild = children[i];
		if(thisChild.textContent==tc) arr.push(thisChild);
		}
	return arr.length>0 ? arr : null;
	}
	
function isChildOf(parent, child) {
	if(!child.parentNode) return false;
	if(parent == child.parentNode) return true;
	return isChildOf(parent, child.parentNode);
	}
	
function nextElementSibling(el) {
	el = el.nextSibling;
	if(el.nodeType!=1) return nextElementSibling(el);
	return el;
	}

function customEvent(el, name, data) {
	if(!el || !name) return null;
	if(!defined(data)) data = "ignpp";
	var evt = document.createEvent("MessageEvent");
	evt.initMessageEvent(name, true, false, data, window.location.href, 12, window);
	return el.dispatchEvent(evt);
	}
	
function mouseEvent(parent, type) {
	var evt = parent.ownerDocument.createEvent('MouseEvents');
	evt.initMouseEvent(type, true, true, parent.ownerDocument.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
	return parent.dispatchEvent(evt);
	}

function click(parent) {
	return mouseEvent(parent, 'click');
	}
	
function change(parent) {
	return mouseEvent(parent, 'change');
	}
	
function mouseOver(parent) {
	return mouseEvent(parent, 'mouseover');
	}
	
function mouseOut(parent) {
	return mouseEvent(parent, 'mouseout');
	}
	
function resize(parent) {
	//todo: fire second event after timer to compensate for late reflow
	var evt = document.createEvent('HTMLEvents');
	evt.initEvent("resize", true, false);
	return parent.dispatchEvent(evt);
	}
	
function xpath(query) {
	return document.evaluate(query, document, null,
		XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
	}
	
//returns an array holding all ranges in Selection object
//returned by window.getSelection(), null if no ranges
function getSelectionCopy() {
	
	var sel = window.getSelection();
	var copy = null;
	var len = sel.rangeCount;
	if(len>0) {
		var i=-1;
		copy = [];
		while(++i<len) copy.push(sel.getRangeAt(i));
		}
		
	return copy;
	
	}

//restores selection from a copy (array of ranges)
function restoreSelection(copy) {
	
	var sel = window.getSelection();
	sel.removeAllRanges();
	
	for(var i=0, len=copy.length; i<len; i++)
		sel.addRange(copy[i]);
		
	return sel;
	
	}
	
function debugString(string) {

	var debug = top.document.createElement("div");
	debug.id = "debug";
	debug.innerHTML = '<textarea value="' + string + '"></textarea>';
	top.document.body.appendChild(debug);

	}
	
function findPos(obj) {
	var curleft = curtop = 0;
	if (obj.offsetParent) {
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
			} while (obj = obj.offsetParent);
		}
	return [curleft,curtop];
	}
	
function createElementX(type, map) {
	var temp = document.createElement(type);
	for(var i in map) temp[i] = map[i];
	return temp;
	}
	
//object that provides lots of information about an element's position relative to the window

/*
Usage : var pos = new Position(document.body);



*/
	
function Position(el) {
	
	this.el = el;
	this.pos = findPos(el);
	this.x = this.l = this.pos[0];
	this.y = this.t = this.pos[1];
	this.h = el.offsetHeight;
	this.w = el.offsetWidth;
	this.b = this.t + this.h;
	this.r = this.l + this.w;
	
	this.window = {
		top: window.pageYOffset,
		left: window.pageXOffset
		}
	
	this.window.width = window.innerWidth;
	this.window.height = window.innerHeight;
	this.window.bottom = this.window.top + this.window.height;
	this.window.right = this.window.left + this.window.width;
	
	var that = this;
	
	function side(pos, horiz) {
		
		if(!defined(horiz)) horiz = false;
		
		this.before = horiz ? pos < that.window.left : pos < that.window.top;
		this.after = horiz ? pos > that.window.right : pos > that.window.bottom;
		this.enclosed = !this.before && !this.after;
		
		}
		
	side.prototype.getVisibility = function(otherDirection) {
		
		this.someVisible = this.enclosed && otherDirection.someVisible;
		this.allVisible = this.enclosed && otherDirection.allVisible;
		
		}
	
	this.top = new side(this.t);
	this.bottom = new side(this.b);
	this.left = new side(this.l, true);
	this.right = new side(this.r, true);
	
	this.sides = [this.top, this.right, this.bottom, this.left];
	
	//lower and higher are sides
	//lower must have a position mathematically lower than higher's position
	//valid input is (this.top, this.bottom) or (this.left, this.right)
	function direction(lower, higher) {
		
		//both sides are before/after the window
		this.before = lower.before && higher.before;
		this.after = lower.after && higher.after;
		//the window encloses both sides
		this.allEnclosed = lower.enclosed && higher.enclosed;
		//the window encloses at least one side
		this.someEnclosed = lower.enclosed || higher.enclosed;
		//the window is between the two sides
		this.encloser = lower.before && higher.after;
		//the window is close enough in this direction to see at least part of the element
		this.near = this.someEnclosed || this.encloser;
		
		}
		
	direction.prototype.getVisibility = function(otherDirection) {
	
		//the window is enclosed by the two sides and the element is at least partially visible
		this.within = this.encloser && otherDirection.near;
		//at least one of the sides are visible
		this.someVisible = this.near && otherDirection.near;
		//both sides are visible
		this.allVisible = this.allEnclosed && otherDirection.near;
		
		}
	
	this.vert = new direction(this.top, this.bottom);
	this.horiz = new direction(this.left, this.right);
	
	this.vert.getVisibility(this.horiz);
	this.horiz.getVisibility(this.vert);
	
	this.directions = [this.horiz, this.vert];
	
	for(var i=0, len=this.sides.length; i<len; i++)
		this.sides[i].getVisibility(i%2==0 ? this.horiz : this.vert);
	
	//the entire element is visible in the window
	this.allVisible = this.vert.allVisible && this.horiz.allVisible;
	//some of the element is visible in the window
	this.someVisible = this.vert.someVisible || this.horiz.someVisible;
	//the window is entirely within the element
	this.within = this.vert.within && this.horiz.within;
	
	}
	
	
function scrollToEl(el, force) {

	var pos = new Position(el);

	if(force || !pos.allVisible) {
		var wh = pos.window.height;
		var ww = pos.window.width;
		var h = pos.h;
		var w = pos.w;
		var x = pos.window.left;
		var y = pos.window.top;
		
		if(!pos.horiz.allVisible) {
			
			x = pos.x;
			
			var goleft = pos.window.left < pos.x;
			
			if(ww>w) x = (!goleft ? pos.l : pos.r - ww) + //put right of el at right of window
						(ww-w)/(9 * (goleft ? 1 : -1)) //plus padding
						;
			
			}
		
		if(!pos.vert.allVisible) {
		
			y = pos.y;
			
			var goup = pos.window.top < pos.y;
			
			if(wh>h) y = (!goup ? pos.y : pos.b - wh) + 
						(wh-h)/(5 * (goup ? 1 : -1))
						;
			
			}

		window.scrollTo(x, y);
		}

	}

var trimExp = /^\s+|\s+$/gim;
	
//http://www.mredkj.com/javascript/nfbasic.html
function addCommas(nStr) {
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) x1 = x1.replace(rgx, '$1' + ',' + '$2');
	return x1 + x2;
	}
	
//replaces any text that's not surrounded by the left and right delimiters with newString
//assumes that each leftDelim is accompanied by a rightDelim
//nested delimiters are not supported or guaranteed to work
//newString can contain "$1" to refer to matched text
/*Ex:
replaceNotSurrounded("dfgf[b]dfgdfg[/b]fdgg[b]dfgfd[/b]dfgfd", /\[b]/, /\[\/b]/, "[i]$1[/i]", false)
returns
"[i]dfgf[/i][b]dfgdfg[/b][i]fdgg[/i][b]dfgfd[/b][i]dfgfd[/i]"
*/
function replaceNotSurrounded(text, leftDelim, rightDelim, newString, replaceEmpty) {
	
	var progress = 0, len = text.length, newText = [], start = 0, end = 0, leftMatch, rightMatch, lastRightIndex = 0;
	
	function getNewString(str) {
		return (str!="" || replaceEmpty) ? newString.replace(/\$1/g, str) : "";
		}
	
	while(text!="") {
	
		leftDelim.lastIndex = 0;
		leftMatch = leftDelim.exec(text);
		start = leftDelim.lastIndex;
		if(leftMatch!=null) progress = (start -= leftMatch[0].length);
		else progress = 0;
		
		rightDelim.lastIndex = progress;
		rightMatch = rightDelim.exec(text);
		end = rightDelim.lastIndex;
		
		//there is no right delimiter present - all text is not surrounded
		if(rightMatch==null) {
			newText.push(getNewString(text));
			text = "";
			}
		else if(start>=0) {
			newText.push(getNewString(text.slice(0, start)));
			newText.push(text.slice(start, end));
			text = text.substring(end);
			}
		
		}
		
	return newText.join("");
	
	}
	
//alert(replaceNotSurrounded("[b][b][b]dfgdfg[/b]fdgg[/b]dfgfd", /\[b]/gi, /\[\/b]/gi, "[i]$1[/i]", false));

//changes an array of booleans into a bitfield (32 bit signed integer)
//[true, false, false, true, true, false] becomes
//...000100110, or 38 in base 10
//all extra bits are zeroes
//maximum length of boolean array is 31
//can call like ([true, false]) or (true, false)
function bools2bits(bools) {

	if(!defined(bools.length)) bools = Array.prototype.slice.call(arguments);
	
	if(bools.length>31) return -1;
	
	var integer = 0;
	for(var i=bools.length-1, n=0; i>=0; i--, n++)
		if(bools[i]) integer |= (1<<n);
		
	return integer;
	
	}

//dec2hex and rgb2hex from IGNBQ by heyf00L, modified a bit
function dec2hex(dec) {
    var hex = parseInt(dec).toString(16);
    while(hex.length < 2) hex = "0" + hex;
    return hex;
	}
	
function rgb2hex(str) {
	var output = str;
	if(str.indexOf("rgb(") != -1 && str.indexOf(")") != -1) {
		str = str.substring(4, str.length - 1);
        var colors = str.split(",");
        output = "#" + dec2hex(colors[0]) + dec2hex(colors[1]) + dec2hex(colors[2]);
		}
	return output.replace(/\s/g, "");
	//replace is important for returning colors that aren't translated into triplets
	//like rgba, hsl, hsla
	}

	
var b16s = ["0","1","2","3","4","5","6","7","8","9",
			"A","B","C","D","E","F"];
	
//returns base 10 integer when given base 16 character
function base16base10(_num) {

	_num = _num.toUpperCase();
	
	var result = b16s.indexOf(_num);
	
	return result==-1 ? 0 : result;

	}
	
//returns formatted rgb color when given valid CSS hexadecimal string
function hex2rgb(_color) {

	_color = _color.replace("#","");
	var l = _color.length;
	if((l != 6) && (l != 3)) return "0, 0, 0";
	//expand 3 character colors
	if(l == 3) _color = _color[0] + _color[0] + _color[1] + _color[1] + _color[2] + _color[2];
	
	//split into pairs
	var _pairs = [], _rgb= [];
	_pairs[0] = _color.substring(0,2);
	_pairs[1] = _color.substring(2,4);
	_pairs[2] = _color.substring(4);
	
	//convert pairs to base 10
	for(var i=2; i >= 0; i--) {
		_rgb[i] = base16base10(_pairs[i][0]) * 16;
		_rgb[i]+= base16base10(_pairs[i][1]);
		}
		
	return _rgb[0] + ", " + _rgb[1] + ", " + _rgb[2];
	
	}
	
//rgb is a string of the form "rgb(x, x, x)", as used in CSS
//can alternatively use "x, x, x"
//returns the perceived brightness of the color (0-255), using this formula:
// brightness  =  sqrt( .241 R^2 + .691 G^2 + .068 B^2 )
// http://www.nbdtech.com/Blog/archive/2008/04/27/Calculating-the-Perceived-Brightness-of-a-Color.aspx
function colorBrightness(rgb) {
	rgb = rgb.replace(/(rgb\()|(\))|(\s*)/gi, "");
	rgb = rgb.split(",");
	var r = +rgb[0], g = +rgb[1], b = +rgb[2];
	return Math.sqrt( (.241 * r * r) + (.691 * g * g) + (.068 * b * b) );
	}
	

//faces and shortcuts from IGNBQ by heyf00L
	
var faces = 
[null, "happy", "sad", "wink", "grin", "batting", "confused", "love", "blush", "tongue",
"kiss", "shock", "angry", "mischief", "cool", "worried", "devil", "cry", "laugh", "plain",
"raised_brow", "angel", "nerd", "talk_hand", "sleep", "rolling_eyes", "sick", "shhh",
"not_talking", "clown", "silly", "tired", "drooling", "thinking", "doh!", "applause",
"pig", "cow", "monkey", "chicken", "rose", "good_luck", "flag", "pumpkin", "coffee",
"idea", "skull", "alien_1", "alien_2", "frustrated", "cowboy", "praying", "hypnotized",
"money_eyes", "whistling", "liarliar", "beatup", "peace", "shame_on_you", "dancing", "hugs", "tal"];

//used for regular expression
var shortcuts = 
[null, ":\\)", ":\\(", ";\\)", ":D", ";;\\)", ":-/", ":x", ":8}", ":p",
":\\*", ":O", "X-\\(", ";\\\\", "B-\\)", ":-s", "\\]:\\)", ":_\\|", ":\\^O", ":\\|",
"/:\\)", "O:\\)", ":-B", "=;", "I-\\)", "8-\\|", ":-8", ":-\\$",
"\\[-\\(", ":o\\)", "8-\\}", "\\(:\\|", "=P~", ":-\\?", "#-o", "=D=",
":@\\)", "3:-O", ":\\{\\|\\}", "~:-", "@\\};-", "%%-", "\\*\\*==", "\\(~~\\)", "~o\\)",
"\\*-:\\)", "8-X", "=:\\}", "\\]-\\}", ":-L", "\\]\\):\\)", "\\[-o\\|", "@-\\)",
"\\$-\\)", ":-oo", ":\\^o", "b-\\(", "=\\}=", "\\[-X", "\\\\:D/", "\\[:D\\]", "::tal::"];

//regular text
var shortcuts2 = shortcuts.slice(0);
shortcuts2.forEach(function(e, i, a) {
	
	if(typeof e != "string") return;
	a[i] = e.replace(/\\{2}/g, "1").replace(/\\/g, "").replace(/1/g, "\\");
	
	});
	
	
//returns the image number of a particular face string
//returns -1 if string is not a valid face
function findFaceNumber(_face) {
	if(_face=="tal") return "facetal";
	return faces.indexOf(_face);
	}
	
function findFaceShortcut(_face) {
	
	if(_face=="facetal") return shortcuts[61];
	if(typeof _face != "number") _face = parseInt(_face);

	if(isNaN(_face) || _face < 1 || _face > faces.length-1) return "unknown";
	
	return shortcuts[_face];
	
	}

//returns a face name when given an image number
//returns "unknown" is number is not valid
function findFaceName(_face) {

	if(_face=="facetal") return faces[61];
	if(typeof _face != "number") _face = parseInt(_face);

	if(isNaN(_face) || _face < 1 || _face > faces.length-1) return "unknown";
	
	return faces[_face];

	}
	
	
//object through which you can better manage event listeners
/*
add
remove
removeAll
*/
var Listeners = new function() {

	function listener(target, type, func, capture) {
		this.target = target;
		this.type = type;
		this.func = func;
		this.capture = capture;
		}
		
	listener.prototype = {
		
		equals: function(other) {
			
			return this.type == other.type &&
				this.capture == other.capture &&
				this.target == other.target &&
				this.func == other.func;
			
			}
		
		}
	
	//array of all listeners added
	var listeners = [];
	
	//adds an event listener to a target, just like target.addEventListener
	//if capture is omitted, it is assumed false
	this.add = function(target, type, func, capture) {
		if(!defined(target) || !defined(type) || !defined(func)) return false;
		if(!target.addEventListener) return false;
		if(!defined(capture)) capture = false;
		
		/*
		If you try to add an identical event listener to something,
		the new listener is ignored by the browser but still added to listeners.
		This doesn't really matter.  removeEventListener will be called multiple times
		in removeAll even though it only needs to be called once, but these calls
		are ignored by the browser.  So, I won't waste time making sure it
		doesn't already exist.
		*/
		target.addEventListener(type, func, capture);
		var newLis = new listener(target, type, func, capture);
		listeners.push(newLis);
		return newLis;
		}
	
	//removes an event listener from a target, just like target.removeEventListener
	//if capture is omitted, it is assumed false
	//can also pass in a reference to a listener as the first parameter instead
	//and that listener will be removed
	this.remove = function(target, type, func, capture) {
		
		var present = false;
		
		if(target instanceof listener) {
			present = listeners.indexOf(target);
			target.target.removeEventListener(target.type, target.func, target.capture);
			if(present!=-1) listeners.splice(present, 1);
			present = present != -1;
			}
		else target = new listener(target, type, func, capture);

		if(!present) {
			
			for(var i=0, len = listeners.length; i<len; i++) {
				
				if(listeners[i].equals(target)) {
					present = true;
					target.target.removeEventListener(target.type, target.func, target.capture);
					listeners.splice(i, 1);
					break;
					}
				
				}
			
			}
			
		return present;
		
		}
	
	//remove all event listeners
	this.removeAll = function() {
		
		for(var i=0, len=listeners.length; i<len; i++) {
			this.remove(listeners[0]);
			}
			
		return len > 0;
		
		}
		
	this.list = function() {
		
		return inspect(listeners, 1);
		
		}
	
	
	/*	return true if the event's modifiers match up with one of the allowed ones
		in the allowed array
		ignore will ignore all bits set to 1
		alsoAllowed lets you pass in an array of extra modifiers that are allowed
		(useful if you don't know if allowed is an array or one value)
			-1 = any
			1 = control
			2 = alt
			4 = shift
			8 = meta
		ex: [1, 1 | 2] alt or alt and shift are okay
	*/
	this.modifiersAllowed = function(allowed, event, ignore, alsoAllowed) {
		
		if(!defined(allowed))
			allowed = [0];
		
		if(!defined(allowed.length))
			allowed = [allowed];
			
		if(defined(alsoAllowed)) {
			
			if(!defined(alsoAllowed.length))
				alsoAllowed = [alsoAllowed];
				
			allowed = allowed.concat(alsoAllowed);
			
			}
			
		if(allowed.length==0) return false;
		
		if(!defined(ignore))
			ignore = 0;
		
		var modifiers = bools2bits(event.metaKey, event.shiftKey, event.altKey, event.ctrlKey);
		
		//to ignore bits, we will have them always set to false
		//and all allowed modifiers will have them set to false
		ignore = ~ignore;
		modifiers &= ignore;
		
		for(var i=0, len=allowed.length; i<len; i++) {
			var thisAllowed = allowed[i];
			
			//-1, any combination of modifiers is allowed
			if(thisAllowed == -1) return true;
			
			thisAllowed &= ignore;
			//set all bits except rightmost four to 0
			//we must ignore them
			thisAllowed &= 15;
			
			if(thisAllowed == modifiers) return true;
			
			}
			
		return false;
		
		}
		
	this.isKb = function(e) {
		return /^key(down|up|press)$/i.test(e.type);
		}
		
	this.isMouse = function(e) {
		return /^((dbl)?click|mouse(down|up|over|out|move))$/i.test(e.type);
		}

	}
	
var Cleanup = new function() {
	
	var funcs = [];
	
	this.add = function(func) {
		funcs.push(func);
		}
	
	this.run = function() {
		
		for(var i=0, len=funcs.length; i<len; i++) {
			funcs[0]();
			funcs.splice(0, 1);
			}
			
		this.funcs = null;
		
		}
	
	//clean up all hanging objects/listeners/timers on unload as an attempt to fix this:
	// http://github.com/fracture91/ignpp/issues#issue/48
	//functions are added later near relevant parts of code
	Listeners.add(window, "unload", function(e) {
		
		Cleanup.run();
		
		}, true);
	
	}
	
Cleanup.add(function() { Listeners.removeAll(); });
