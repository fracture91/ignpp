
prefs = {};
	
function pref(name, def) {
	prefs[name.substring(name.lastIndexOf(".")+1)] = def;
	}

window.onload = function(e) {
	
	var prefGenerator = new function() {
		
		this.container = document.getElementById("generatedPrefs");
		
		this.makeFromObject = function(obj) {
			for(var i in obj) this.make(i, obj[i]);
			}
		
		this.make = function(name, def) {
			
			var listItem = document.createElement("li");
			listItem.textContent = name + ", " + def;
			
			this.container.appendChild(listItem);
			
			}
		
		}
		
	prefGenerator.makeFromObject(prefs);
		
	}
