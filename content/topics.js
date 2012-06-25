
var Topic = function(ref) {
	
	this.ref = ref;
	
	this.iconRef = getFirstByClassName(this.ref, this.prefix + "icon");
	this.subjectRef = getFirstByTagName( getFirstByClassName(this.ref, this.prefix + "subject"), "a");
	this.authorRef = getFirstByTagName( getFirstByClassName(this.ref, this.prefix + "username"), "a");
	this.repliesRef = getFirstByClassName(this.ref, this.prefix + "replies");
	this.lastPostRef = getFirstByClassName(this.ref, this.prefix + "lastpost");
	
	}
	
Topic.prototype = {
	
	prefix: "boards_board_list_row_",
	
	get subject(){ return this.subjectRef.textContent },
	get id(){ return this.subjectRef.href.split( '/' )[5] },
	get author(){ return this.authorRef.textContent }
	
	}
	
	
var Topics = function(parent) {
	
	if(!parent) return null;

	var topics = [];
	
	this.__defineGetter__("length", function(){ return topics.length; });
	
	var find = function(ref) {
		for(var i=0, len=topics.length; i<len; i++)
			if(ref == topics[i].ref) return topics[i];
		return null;
		}
	
	this.get = function(ref, lookForChild) {
		
		if(!defined(ref) || ref==null || topics.length<1) return null;
		if(!defined(lookForChild)) lookForChild = false;
		
		if(typeof ref == "object") {
		
			if(hasClass(ref, this.className) || hasClass(ref, this.altClassName)) {
				return find(ref);
				}
			else {
				var try1 = lookForChild ? getFirstByClassName(ref, this.className) : getParentByClassName(ref, this.className);
				return this.get(try1 ? try1 : (lookForChild ? getFirstByClassName(ref, this.altClassName) : getParentByClassName(ref, this.altClassName)));
				}
			
			}
			
		else if(typeof ref == "number" && ref >= 0 && ref <= topics.length-1) 
			return topics[ref];
			
		return null;
		
		}
		
	this.newTopic = function(ref) {
	
		if(!ref) return null;
		var newTopic = new Topic(ref);
		topics.push(newTopic);
		return newTopic;
		
		}
		
	this.forEachTopic = function(func) {
		
		if(!defined(func)) return;
		
		for(var i=0, len=topics.length; i<len; i++)
			if(topics[i]) func.call(this, topics[i], i, len);
		
		}
		
	if(typeof parent == "string") {
		parent = createElementX( (Info.layout.fresh ? "div" : "table"), {innerHTML: parent});
		}
	
	for(var j=0; j<2; j++) { //get both className and altClassName
		var rows = parent.getElementsByClassName(this[(j==0 ? "altC" : "c") + "lassName"]);
		for(var i=0, len=rows.length; i<len; i++)
			this.newTopic(rows[i]);
		}
	
	}
	
Topics.prototype = {
	
	className: "boards_board_list_row",
	altClassName: "boards_board_list_row_over", //so...stupid
	
	get ignoreTopics(){return GM_getValue("ignoreTopics", false);},
	get ignoreList(){return GM_getValue("ignoreList", "");},
	
	augment: function() {
		
		if(!this.ignoreTopics) return;
		
		var list = this.ignoreList.split(",");
		
		this.forEachTopic(function(t) {
							
			if(list.indexOf(t.author)!=-1) {
				t.ref.style.display = "none";
				//I'd rather add a class, but stupid IGN uses javascript
				//to alter class name on mouseover/out
				//addClass(t.ref, "hiddenTopic");
				}
		
			});
		
		}
	
	}
	
	
if(Info.url.pageType=="board") {
	var pageTopics = new Topics(document.getElementById("boards_board_list_table"));
	pageTopics.augment();
	Cleanup.add(function(){ pageTopics = null; });
	}

