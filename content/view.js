
/*
Class for a View - something that (probably) displays information from a Model.
The View is responsible for creating any necessary DOM elements and keeping
them up to date based on modelChange events from the model.
MAKE SURE you call destroy when done with an instance to prevent leaks.
*/

var View = extend(Trackable, function(parent, before, model) {
	Trackable.call(this);

	/*
	The parent element in the DOM that this view will be appended to.
	*/
	this.parent = parent;
	
	/*
	The element in the DOM that this view will be inserted before.
	Must be a child of this.parent.
	Can be null to append to this.parent.
	*/
	this.before = before;
	
	/*
	The Model this view is associated with.
	Many views can point to the same model.
	*/
	this.model = model;
	
	/*
	A reference to the DOM element that makes up this view.
	If the view has not been rendered, this is equal to null.
	*/
	this.container = null;
	
	//listen for events from the model
	this.model.addObserver(this);
},
{
	/*
	The className that this.container definitely has.
	Subclasses should override.
	*/
	className: "View",

	/*
	If the view is not already rendered, render it.
	Once rendered, if not already inserted, insert it into the document under parent.
	*/
	commit: function() {
		if(!this.container) {
			this.render();
		}
		if(this.container.parentNode != this.parent) {
			this.parent.insertBefore(this.container, this.before);
		}
	},
	
	/*
	If the view has been rendered, remove this.container from its parentNode if it exists.
	*/
	uncommit: function() {
		if(this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}
	},

	/*
	Create an empty container - nothing else.
	Called if this.container did not exist upon render call.
	*/
	createContainer: function() {
		this.container = document.createElement("div");
	},
	
	/*
	Add classNames and whatnot to this.container assuming it has been created.
	Only called on render if this.container didn't already exist.
	*/
	decorateContainer: function() {
		//can't add "this.className" since it will be overridden by subclasses
		addClass(this.container, "View");
	},
	
	/*
	Assuming this.container has been set up correctly otherwise,
	create anything that needs to be created if this.container didn't exist before rendering.
	*/
	createEverythingElse: function() {
		//this does nothing, override it
	},
	
	/*
	This is called by render regardless of whether the container already existed.
	By default, calls this.renderModelChanges(null, this.model).
	*/
	renderEverythingElse: function() {
		this.renderModelChanges(null, this.model);
	},
	
	/*
	Called onModelChangeEvent and within render (for which source is null).
	source is the model that was changed.
	changes is an object full of changed properties.
	this.onModel*Change handler is called for each property in changes, if it exists.
	Handler is passed source and the value of the property changed.
	*/
	renderModelChanges: function(source, changes) {
		for(var i in changes) {
			var change = i[0].toUpperCase() + i.substring(1);
			var handler = this["onModel" + change + "Change"];
			if(typeof handler == "function") {
				handler.call(this, source, changes[i]);
			}
		}
	},
	
	/*
	Create all necessary DOM stuff to display this view, but do not actually insert it into the document.
	this.container must != null when this is done.
	Subclasses should probably override the methods it calls rather than render itself.
	*/
	render: function() {
		if(!this.container) {
			this.createContainer();
			this.decorateContainer();
			this.createEverythingElse();
		}
		this.renderEverythingElse();
	},
	
	/*
	Uncommit, untrack, stop observing model, nullify container.
	MAKE SURE you call this when you're done with an instance to prevent leaks.
	*/
	destroy: function() {
		this.uncommit();
		this.untrack();
		this.model.removeObserver(this);
		this.container = null;
	},
	
	/*
	When the model is changed, this will eventually be called.
	View should render any changes.
	*/
	onModelChangeEvent: function(source, changes) {
		this.renderModelChanges(source, changes);
	},
	
	/*
	If the model is a manager, this will be called when something is added.
	model is the model that was added.
	View should render any changes.
	*/
	onModelAddEvent: function(source, model) {
		this.render();
	},
	
	/*
	If the model is a manager, this will be called when something is removed.
	model is the model that was removed.
	View should render any changes.
	*/
	onModelRemoveEvent: function(source, model) {
		this.render();
	},
	
	//Override
	equals: function(other, ignoreContainer) {
		if(Employee.prototype.equals.call(this, other)) {
			return true;
		}
		if(!other.model) return false;
		if(other.model.equals(this.model)) {
			if(ignoreContainer) return true;
			if(other.container && this.container && other.container == this.container) return true;
		}
		return false;
	},
	
	/*
	Returns the instance for which func(instance) returns true.
	Returns null if func never returns true.
	*/
	getInstanceBy: function(func) {
		for(var i=0, len=this.instances.length; i<len; i++) {
			var instance = this.instances[i];
			if(func(instance)) return instance;
		}
		return null;
	},
	
	/*
	Returns the instance for which the container property is equal to the argument provided.
	*/
	getInstanceByContainer: function(container) {
		return this.getInstanceBy(function(instance){
			return instance.container == container;
		});
	},
	
	/*
	Given a child/parent of the container, or the container itself, return the instance the container belongs to.
	See this.getContainerFromElement.
	*/
	getInstanceFromElement: function(el, lookForChild) {
		var container = this.getContainerFromElement(el, lookForChild);
		if(container) {
			return this.getInstanceByContainer(container);
		}
		return null;
	},
	
	/*
	Given a child, parent, or the container itself, return the container.
	Search is based on className.
	By default, only looks for parent.  Pass true for lookForChild to look for child instead.
	*/
	getContainerFromElement: function(el, lookForChild) {
		if(hasClass(el, this.className)) {
			return el;
		}
		if(lookForChild) {
			return getFirstByClassName(el, this.className);
		} else {
			return getParentByClassName(el, this.className);
		}
	}
});
