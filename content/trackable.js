
/*
Represents a class whose objects are kept track of in the class's prototype.
Make sure you call the untrack method when done with an instance,
otherwise you'll probably leak memory like a sieve.
Subclasses can prevent tracking of their own instances by setting prototype._DONTTRACK_ to true.
Instances will still be tracked in the superclass.
*/
var Trackable = extend(Observable, function() {
	this._track();
},
{
	/*
	An array containing all instances of this class and all subclasses.
	Don't modify it if you know what's good for you.
	*/
	instances: [],
	
	/*
	Start tracking an instance called "that" - defaults to this.
	Throws an error if you try to track an instance that's already being tracked.
	Shouldn't have to call this from outside.
	*/
	_track: function(that) {
		if(typeof that != "object") that = this;
		if(this.instances.indexOf(that) != -1) {
			throw new Error("Added instance must be unique");
			}
		this.instances.push(that);
	},
	
	/*
	Stop tracking an instance called "that" - defaults to this.
	Should call this before you blow an object away forever, otherwise you risk leaks.
	Calling more than once does not throw an error.
	*/
	untrack: function(that) {
		if(typeof that != "object") that = this;
		var index = this.instances.indexOf(that);
		//don't throw anything if missing, it's reasonable to be called multiple times
		if(index == -1) return;
		this.instances.splice(index, 1);
	},
	
	/*
	Call some function for each instance.
	*/
	forEachInstance: function(func, thisObj) {
		if(!defined(thisObj)) thisObj = window;
		this.instances.forEach(function(e, i, a) {
			func.call(thisObj, e, i, a);
		});
	},
	
	/*
	Called when a subclass is created.
	this is bound to the superclass.
	Decorates subclass's prototype with its own instances array,
	a _track method which will call all ancestor _track methods,
	and an untrack method which does the same.
	Won't track own instances if subclass.prototype._DONTTRACK_ is true.
	*/
	extend: function(subclass) {
		if(typeof Observable.prototype.extend == "function" && !Observable.prototype._DONTDECORATE_) {
			//chain extend methods
			Observable.prototype.extend.call(this, subclass);
		}
		if(!subclass.prototype._DONTTRACK_) {
			var _super = this;
			copyProps({
				instances: [],
				_track: function(that) {
					if(typeof that != "object") that = this;
					Trackable.prototype._track.call(this, that);
					_super.prototype._track.call(_super.prototype, that);
				},
				untrack: function(that) {
					if(typeof that != "object") that = this;
					Trackable.prototype.untrack.call(this, that);
					_super.prototype.untrack.call(_super.prototype, that);
				}
			}, subclass.prototype);
		}
	}
});
