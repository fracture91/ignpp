
/*
Copies properties from a source object to a destination object.
Even copies over native getters and setters.
Based on extend method by John Resig: http://ejohn.org/blog/javascript-getters-and-setters/
*/
function copyProps(source, dest) {
	var standards = Object.getOwnPropertyDescriptor && Object.defineProperty;
	for(var i in source) {
		if(standards) {
			//standards-compliant way to do it
			var descriptor = Object.getOwnPropertyDescriptor(source, i);
			if(descriptor) {
				Object.defineProperty(dest, i, descriptor);
			}
		} else {
			//non-standard, but seems to be fairly widely supported
			var getter = source.__lookupGetter__(i),
				setter = source.__lookupSetter__(i);
			if(getter || setter) {
				if(getter) {
					dest.__defineGetter__(i, getter);
				}
				if(setter) {
					dest.__defineSetter__(i, setter);
				}
			} else {
				dest[i] = source[i];
			}
		}
	}
	return dest;
}

/*
Extends a superclass with a given subclass.
Returns the new subclass (subclass argument is the same).
superclass and subclass should be constructors.
If superclass is not a function, no inheritance from it is attempted.
newproto is an optional object filled with properties you want to add to the subclass's prototype.
Native getters and setters work in newproto.
subclass is responsible for calling superclass constructor within its own constructor if it wants to.
Borks subclassInstance.__proto__ a bit in that it's equal to that closured _inheritance_ function,
but still (subclassInstance.__proto__ instanceof superclass) === true .

If the superclass has an extend method itself, that method will be called whenever the
superclass is extended.  This can allow the superclass to become, for lack of a better word, a "decorator".
Changes made by the decorator should always be overriden in favor of the subclass, but they should also
be visible to the decorator when it is invoked.  This will make it a bit slower than undecorated classes.
extend method bound to superclass, passed the subclass.
Setting superclass._DONTDECORATE_ to true prevents this behavior when extend method is present.
extend methods should call superclass extend methods if present to allow chaining multiple decorators.

No yucky strings, no obscene abstraction, no testing functions with regex, no custom properties,
no calling constructors during inheritance, just JS inheritance as it was meant to be.

Replacement for this non-standard pattern (__proto__ is deprecated):
	function superclass(){};
	function subclass(){};
	subclass.prototype = { //newproto
		//prototypical properties
	}
	subclass.prototype.__proto__ = superclass.prototype;
	
Instead, you can do this:
	var superclass = extend(null, function(){});	//optional, could be plain function
	var subclass = extend(superclass, function() {
		//constructor
	},
	{
		//prototypical properties
	});
	
Based on function by Juan Mendes: http://js-bits.blogspot.com/2010/08/javascript-inheritance-done-right.html
*/
var extend = (function(){
	function _inheritance_(){};
	function consCopy(subclass, newproto) {
		if(newproto) {
			copyProps(newproto, subclass.prototype);
		}
		subclass.prototype.constructor = subclass;
	}
	return function extend(superclass, subclass, newproto) {
		if(typeof subclass != "function") {
			subclass = function(){};
		}
		if(typeof superclass == "function") {
			_inheritance_.prototype = superclass.prototype;
			subclass.prototype = new _inheritance_();
			if(typeof superclass.prototype.extend == "function" && !superclass.prototype._DONTDECORATE_) {
				consCopy(subclass, newproto); //so it's visible to decorator
				superclass.prototype.extend.call(superclass, subclass);
			}
			consCopy(subclass, newproto); //to override decorator's changes
		}
		else if(newproto) {
			subclass.prototype = newproto;
		}
		return subclass;
	}
})();
