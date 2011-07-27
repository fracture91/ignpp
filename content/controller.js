
/*
Class which controls Views of a certain class and their models.
One controller controls all instances of this.viewClass.
The controller may act as a View factory if necessary.
The big responsibility of the Controller is to add event listeners to control View instances.
*/
var Controller = extend(null, null, {
	/*
	The class of views this controls.
	*/
	viewClass: View,
	
	/*
	After this method is called, the Controller should start controlling.
	This is probably where you would add event listeners.
	*/
	init: function() {
		
	},
	
	/*
	Add an event listener that is only triggered if the event target was within
	an instance of this.viewClass and precondition(e) returns true.
	See Listeners.add.
	func is bound to this Controller.
	event and relevant view instance is passed to method.
	*/
	addViewListener: function(target, types, func, useCapture, precondition) {
		this.addMyListener(target, types, this.viewListener.bind(
			this, func.bind(this), precondition.bind(this)
		), useCapture);
	},
	
	/*
	Returns the associated view for a certain element.
	Calls getInstanceFromElement by default, but here so it can be overridden.
	*/
	getViewInstanceFromElement: function(el) {
		return this.viewClass.prototype.getInstanceFromElement(el);
	},
	
	/*
	Call func with e and a view instance if precondition(e) returns true and
	the instance can be found.  Used by addViewListener.
	*/
	viewListener: function(func, precondition, e) {
		if(precondition(e)) {
			var instance = this.getViewInstanceFromElement(e.target);
			if(instance) {
				return func(e, instance);
			}
		}
	},
	
	/*
	Just like target.addEventListener(types, func, useCapture) except:
		inside func, this refers to this instance instead of target or window
		types can be an array of types for each of which the listener will be added
	*/
	addMyListener: function(target, types, func, useCapture) {
		if(!Array.isArray(types)) types = [types];
		func = func.bind(this);
		for(var i=0, len=types.length; i<len; i++) {
			Listeners.add(target, types[i], func, useCapture);
		}
	}
});
