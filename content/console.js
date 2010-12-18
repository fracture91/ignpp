
//removed to pass review
///*

var Console = new function(){
	
	this.__defineGetter__("enabled", function(){ return GM_getValue("devConsole", false); });
	this.container = null;
	this.input = null;
	this.output = null;
	this.history = [];
	this.historyIndex = -1;
	this.scope = {};
	
	var visible = false;
	this.__defineGetter__("visible", function(){ return visible; });
	this.__defineSetter__("visible", function(b){
		visible = b;
		this.container.style.display = b ? "" : "none";
		});
		
	this.__defineGetter__("help", function() { return "This console executes JavaScript in IGN++'s context\n" +
		"Errors in your input are caught and displayed\n" +
		"Some functions may be inaccessible for security reasons\n\n" +
		"Controls:\n" +
		"`~: Toggle console (input must be out of focus)\n" +
		"Enter: Execute\n" +
		"Shift + Enter: Newline\n" +
		"Up & Down: Move through command history\n\n" +
		"Useful Functions:\n" +
		"inspect(object [,depth[, indent]])\n" +
		"\tShows the contents of an object up to a maximum depth (default infinite)\n";
		});
		
	this.fit = function(textarea) {
		textarea.style.height = "0px"; //so we can accurately shrink it
		textarea.style.height = 
			(textarea.offsetHeight-textarea.clientHeight) + //padding (element has -moz-box-sizing: border-box)
			textarea.scrollHeight + //height of content of textarea
			"px";
		}
	
	if(!this.enabled) return;
	
	this.container = createElementX("div", {className: "console"});
	this.container.style.display = "none";
	this.output = createElementX("textarea", {className: "output", textContent: "Type in Console.help for help", readOnly: true});
	this.input = createElementX("textarea", {className: "input"});
	this.container.appendChild(this.output);
	this.container.appendChild(this.input);
	document.body.appendChild(this.container);
	
	Listeners.add(document, "keydown", function(e) {
		if(!Console.enabled) return;
	
		if(e.target==Console.input) Console.fit(Console.input);
	
		if(e.altKey || e.shiftKey || e.ctrlKey) return;
		
		if(e.target==Console.input) {
			if(e.which==13) {
				e.preventDefault();
				//Security: Allows user input to be executed, can do lots of fun stuff with this
				//However, the preference that enables the dev console is off by default and the preference is
				//identified as dangerous in the options menu
				//Unless a vulnerability exists in the Greasemonkey compiler or the APIs I've added, there's no way
				//to elevate privileges since this script is sandboxed like other GM scripts
				var command = e.target.value;
				if(command=="") return;
				Console.history.unshift(command);
				Console.historyIndex = -1;
				
				var result;
				try{
				result = eval(command);
				} catch(e) { result = "!!! ERROR: " + e.name + (e.lineNumber ? " on line " + e.lineNumber : "") + ": " + e.message + (e.stack ? "\nStack:\n" + e.stack : ""); }
				
				Console.output.value = result;
				Console.input.value = '';
				Console.fit(Console.input);
				Console.fit(Console.output);
				}
			else if(e.which==38 || e.which==40) {
				if(Console.history.length<1) return;
				
				if(e.which==38 && Console.input.selectionStart!=0) return;
				if(e.which==40 && Console.input.selectionStart!=Console.input.value.length) return;
				
				Console.historyIndex += e.which==38 ? 1 : -1;
				
				if(Console.historyIndex>Console.history.length-1) {
					Console.historyIndex = Console.history.length-1;
					return;
					}
					
				if(Console.historyIndex<0) {
					Console.input.value = "";
					Console.fit(Console.input);
					Console.historyIndex = -1;
					return;
					}
				
				Console.input.value = Console.history[Console.historyIndex];
				Console.input.selectionStart = Console.input.value.length;
				Console.fit(Console.input);
				
				}
			
			}
		
		else if((!e.target.tagName || e.target.tagName!="INPUT") && e.target.className!="wysiwyg") {
			if(e.which==192) {
				
				e.preventDefault();
				Console.visible = !Console.visible;
				if(Console.visible) Console.input.focus();
				
				}
			}
		
		}, true);
		
	Listeners.add(document, "keyup", function(e) {
		
		if(!Console.enabled) return;
	
		if(e.target==Console.input) Console.fit(Console.input);
		
		}, true);
		
	//Cleanup.add(function(){ Console = null; })
	
	}
	
	
//*/

//returns a string containing members of the object, and members of the members, etc.
//Depth specifies maximum number of recursions, default is infinite
function inspect(obj, depth, indent) {
	if(!defined(depth)) depth = -1;
	if(!defined(indent)) indent = 0;
	var s = [];
	
	function tabs(n) {
		var x = [];
		for(var i=0; i<n; i++) x.push("\t");
		return x.join("");
		}
		
	var mytabs = tabs(indent);
	
	if(!defined(obj)) s.push("undefined");
	else if(obj==null) s.push("null");
		
	for(var i in obj) {
		var prop = obj[i];
		s.push(mytabs);
		s.push(i + ": ");
		if((typeof prop == "object") && prop==null) s.push("null");
		else switch(typeof prop) {
			case "string":
				s.push('"' + prop.replace(/\n/g, "\n"+mytabs+"\t") + '"');
				break;
			case "function":
				s.push(prop.toString().replace(/\n/g, "\n"+mytabs+"\t"));
				break;
			case "undefined":
				s.push("undefined");
				break;	
			case "object":
				if(depth) {
					s.push("{\n" + inspect(prop, depth-1, indent+1) + mytabs + "\t}");
					break;
					}
			default:
				s.push(prop);
				break;
			
			}
		s.push(",\n");
		}
	return s.join("");
	}

