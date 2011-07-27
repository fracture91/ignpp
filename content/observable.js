
/*
Class for an observable - has observers which it can notify about events.
*/
var Observable = extend(Employee, function() {
	Employee.call(this);
	
	/*
	An array of things observing this observable.
	Let this observable know what's watching it so it can notify them of events.
	*/
	this._observers = [];
},
{
	/*
	Add the given observer to this observable's list of observers.
	The observer will be notified of any events that happen on the observable.
	*/
	addObserver: function(observer) {
		if(this._observers.indexOf(observer) == -1) {
			this._observers.push(observer);
		}
	},
	
	/*
	Remove the given observer from this observable's list of observers.
	The observer will no longer be notified of any events that happen on the observable.
	*/
	removeObserver: function(observer) {
		var index = this._observers.indexOf(observer);
		if(index != -1) {
			this._observers.splice(index, 1);
		}
	},
	
	/*
	Fire an event with the given type.
	Doing this will call the method "onTypeEvent" for each observer if it exists.
	Args will be passed along preceeded by the event source to this method.
	The source can be useful if listening to multiple things which can fire the same event type.
	*/
	event: function(type /*, args*/) {
		//no point in doing any work if there aren't any observers
		if(this._observers.length > 0) {
			var capType = type[0].toUpperCase() + type.substring(1);
			var args = Array.prototype.slice.call(arguments, 1);
			args.unshift(this);
			
			this._observers.forEach(function(obs) {
				var handler = obs["on" + capType + "Event"];
				if(typeof handler == "function") {
					try {
						handler.apply(obs, args);
					} catch(e) {}
				}
			});
		}
	}
});
