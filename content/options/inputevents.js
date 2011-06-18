
/*
A class with methods for dealing with firing events on inputs
in both browsers' options pages.
*/

function InputEvents(isChrome) {this.isChrome = isChrome}
InputEvents.prototype = {
	
	/*
	Fire an event of the given type on some element.
	*/
	fireEvent: function(type, el) {
		var createArg = "Event";
		if(type.match(/change/)) {
			createArg = "HTMLEvents";
			}
			
		var event = el.ownerDocument.createEvent(createArg);
		event.initEvent(type, true, true);
		return el.dispatchEvent(event);
		},
		
	/*
	Given an element, return an array of strings of event names
	which must be listened to in order to detect any change in that element.
	isChrome will override this.isChrome.
	*/
	getChangeEvents: function(el, isChrome) {
		if(typeof isChrome == "undefined") {
			isChrome = this.isChrome;
			}
		var tagName = el.tagName.toLowerCase();
		switch(tagName) {
			case "textarea":
			case "textbox":
			case "input":
				if(tagName != "input" || el.type != "checkbox") {
					return ["input"];
					}
				//else fallthrough
			case "checkbox":
				return isChrome ? ["change"] : ["command"];
			case "select":
			case "menulist":
				return isChrome ? ["change", "keyup"] : ["command"];
			}
		return [];
		},
		
	/*
	This will fire some event to indicate a change in the given element.
	Different elements require different events, and they can vary with browser in use.
	*/
	fireGenericChangeEvent: function(el, isChrome) {
		/*Since we should be listening for all events returned by getChangeEvents,
		firing just the first one should work.*/
		this.fireEvent(this.getChangeEvents(el, isChrome)[0], el);
		}
	
	}