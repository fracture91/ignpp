
var Infopanel = function(id, heading, content, classes, x, y) {
	
	this.id = id;
	
	this.ref = document.createElement("div");
	
	classes = classes || [];
	this.classes = classes;
	
	this.x = x || 0;
	this.y = y || 0;
	this.z = Infopanels.lastZ++;
	
	this.headingRef = createElementX("div", {className: "panelHeading"});
	this.contentRef = createElementX("div", {className: "panelContent"});
	
	this.ref.appendChild(this.headingRef);
	this.ref.appendChild(this.contentRef);
	
	this.heading = heading;
	this.content = content;
	
	document.body.appendChild(this.ref);
	
	}
	
Infopanel.prototype = {
	
	closeButtonString: '<img class="closeButton closeIcon" title="Close">',
	
	get heading(){ return this.headingRef.innerHTML.slice(0, this.headingRef.innerHTML.lastIndexOf(this.closeButtonString)); },
	set heading(s){
		this.headingRef.innerHTML = s + this.closeButtonString;
		this.closeButton = this.headingRef.lastChild;
		},
	
	get content(){ return this.contentRef.innerHTML; },
	set content(s){ this.contentRef.innerHTML = s; },
	
	get classes(){
		var classes = getClasses(this.ref);
		classes.splice(classes.indexOf(), 1);
		return classes;
		},
	set classes(a){ this.ref.className = this.className + (a.length>0 ? " " : "") + a.join(" "); },
	
	get x(){ return this.ref.style.left.split("px")[0]; },
	set x(n){ this.ref.style.left = n + "px"; },
	
	get y(){ return this.ref.style.top.split("px")[0]; },
	set y(n){ this.ref.style.top = n + "px"; },
	
	get z(){ return this.ref.style.zIndex; },
	set z(n){ this.ref.style.zIndex = n; },
	
	close: function(){ this.ref.parentNode.removeChild(this.ref); },
	
	}
	
	
var Infopanels = new function() {
	
	var infopanels = [];
	
	this.lastZ = 1;
	
	var find = function(func) {
		for(var i=0, len=infopanels.length; i<len; i++)
			if(func(infopanels[i])) return infopanels[i];
		return null;
		}
		
	this.className = "infoPanel";
		
	this.get = function(ref, lookForChild) {
		
		if(!defined(ref) || ref==null || infopanels.length<1) return null;
		
		if(typeof ref == "object") {
			if(hasClass(ref, this.className)) {
				return find(function(p) {
					return ref == p.ref;
					});
				}
			else {
				if(!defined(lookForChild)) lookForChild = false;
				
				return this.get( lookForChild ? getFirstByClassName(ref, this.className)
												: getParentByClassName(ref, this.className));
				}
			}
			
		else if(typeof ref == "number" && ref >= 0 && ref <= infopanels.length-1) 
			return infopanels[ref];
			
		else if(typeof ref == "string")
			return find(function(p){
				return ref == p.id
				});
			
			
		return null;
		
		}
		
	this.open = function(id, heading, content, classes, x, y) {
		
		var existing;
		if(existing = this.get(id)) {
			
			existing.heading = heading;
			existing.content = content;
			existing.classes = classes;
			existing.x = x;
			existing.y = y;
			existing.z = this.lastZ++;
			
			return existing;
			
			}
		
		var newPanel = new Infopanel(id, heading, content, classes, x, y);
		infopanels.push(newPanel);
		return newPanel;
		
		}
		
	this.close = function(ref) {
		
		var oldPanel = ref.ref ? ref : this.get(ref);
		if(oldPanel) oldPanel.close();
		
		var oldIndex;
		
		oldIndex = infopanels.indexOf(oldPanel);
		var rv = delete infopanels[oldIndex];
		
		infopanels.splice(oldIndex, 1);
		
		return rv;
		
		}
	
	}
	
Infopanel.prototype.className = Infopanels.className;

Listeners.add(document, 'click', function(event) {
	
	var evt = event.target;
	
	var existing = Infopanels.get(evt);
	//raise this infopanel above all others when clicked
	if(existing) existing.z = Infopanels.lastZ++;
	else return;
	
	if(event.which!=1 || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
		
	if(hasClass(evt, "closeButton")) {
		
		Infopanels.close(existing);
		return;
		
		}
	
	}, true);
