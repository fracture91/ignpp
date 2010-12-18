/*var colorSelector = new function() {
	
	this.div = null;
	this.curTarget = null;
	this.curChangeFunc = null;
	this.on = false;
	this.drawn = false;
	
	
	
	
	this.create = function(target, x, y, changeFunc, endFunc) {
		
		if(this.curTarget != target) {
		
			this.curTarget = target;
		
			if(!this.drawn) {
				
				var temp = document.createElement("div");
				temp.className = "colorSelector";
				var masterString = '' +
				'<div class="valSat"></div>' +
				'<div class="hue"></div>' +
				'<div class="preview"></div>' +
				'<div class="input">' +
					'<input type="text" class="hex">' +
				'</div>' +
				'';
				temp.innerHTML = masterString;
				this.div = temp;
				this.hex = this.div.getElementsByClassName("hex")[0];
				document.body.appendChild(this.div);
				
				this.drawn = true;
				
				}
			else {
				
				this.hex.removeEventListener('change', this.curChangeFunc, true);
				
				
				}
				
			this.hex.addEventListener('change', changeFunc, true);
				
			this.curChangeFunc = changeFunc;
				
			this.div.style.left = x + "px";
			this.div.style.top = y + "px";
			
			this.curTarget = target;
			
			}
		
		}
	
	}*/
	
/*
var pos = findPos(e.target);
colorSelector.create(e.target, pos[0], pos[1], function(){}, function(){});
*/