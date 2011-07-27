
/*
Class for a Model - holds some information which a View can then display.
Note that a Model might not hold all necessary information when it's used -
you might have to wait for communication over the network, for example.
However, the model should contain all necessary properties upon construction.
*/
var Model = extend(Observable, function() {
	Observable.call(this);
},
{
	/*
	All changes to the model should go through this function.
	changes should be an object where properties match properties of this model,
	and their values are new values to set the model properties to.
	For example, passing {a: 1, b: 2} would essentially do model.a=1 and model.b=2 .
	modelChange event is fired with changes after changing the model.
	*/
	change: function(changes) {
		for(var i in changes)
			this[i] = changes[i];
		this.event("modelChange", changes);
	}	
});
