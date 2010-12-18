
function Overlay(textarea) {
	
	this.draw = function(textarea) {

		if(!textarea) return;
	
		this.textarea = textarea;
		
		var container = createElementX('div', {className: "overlayContainer"});
		var parent = this.textarea.parentNode;
		addClass(this.textarea, "body");
		container.appendChild(this.textarea);
		parent.insertBefore(container, (I.url.pageType=="sendPM" ? getLastByClassName(parent, "InputNotes") : getFirstByClassName(parent, "InputNotes")).nextSibling);
		
		this.controls = createElementX("div", {className: "controls"});
		
		var recent = I.url.pageType=="postReply" || I.url.pageType=="editReply";
		var cancel = I.url.pageType!="sendPM";
		
		this.postButton = createElementX("input", {type: "button", value: "Post", className: "postButton"});
		this.previewButton = createElementX("input", {type: "button", value: "Preview", className: "previewButton"});
		if(cancel) this.cancelButton = createElementX("input", {type: "button", value: "Cancel", className: "cancelButton"});
		if(recent) this.recentButton = createElementX("input", {type: "button", value: "Show Recent Replies", className: "recentButton"});
		
		this.controls.appendChild(this.postButton);
		this.controls.appendChild(this.previewButton);
		if(cancel) this.controls.appendChild(this.cancelButton);
		if(recent) this.controls.appendChild(this.recentButton);
		
		parent.appendChild(this.controls);
		
		if(I.url.pageType!="sendPM") {
			var tblPostButtons = document.getElementById("tblPostButtons");
			
			this.realPostButton = tblPostButtons.getElementsByTagName('input')[0];
			this.realPreviewButton = tblPostButtons.getElementsByTagName('input')[1];
			if(cancel) this.realCancelButton = tblPostButtons.getElementsByTagName('input')[2];
			if(recent) this.realRecentButton = tblPostButtons.getElementsByTagName('input')[3];
			
			tblPostButtons.style.display = "none";
			}
		else {
			var pref = "ctl00_ctl00_cphMain_cphMain_ccSendPMContent_";
			this.realPostButton = document.getElementById(pref + "btnSend");
			this.realPreviewButton = document.getElementById(pref + "btnPreview");
			this.realPostButton.style.display = this.realPreviewButton.style.display = "none";
			}
		
		this.editor = Editors.open(container);
		
		if(this.editor.body == "" && I.url.pageType != "editReply") {
			this.editor.body = this.editor.wysiwygOn ? Parse.boardCode(Parse.pretext.start + Parse.pretext.end)
									: Parse.pretext.start + Parse.pretext.end;
			}

		}
		
	this.draw(textarea);
	
	this.overlayHandler = function(e) {
	
		if(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
	
		switch(e.target.className) {
		
			case "postButton":
				e.preventDefault();
				if(this.editor.wysiwygOn) this.editor.sync();
				click(this.realPostButton);
				break;
				
			case "previewButton":
				e.preventDefault();
				if(this.editor.wysiwygOn) this.editor.sync();
				click(this.realPreviewButton);
				break;
				
			case "cancelButton":
				e.preventDefault();
				click(this.realCancelButton);
				break;
				
			case "recentButton":
				e.preventDefault();
				click(this.realRecentButton);
				break;
		
			}
	
		}
	
	var obj = this;
	
	Listeners.add(document, 'click', function(e) { 
		if(e.which!=1) return;
		obj.overlayHandler(e);
		}, true);
	Listeners.add(document, 'keydown', function(e) {
		if(e.which!=13) return;
		obj.overlayHandler(e);
		}, true);
	
	Listeners.add(document, 'focus', function(e) {
	
			if(e.target.className=="postButton") {
			
				if(Editors.autocensor.posts) {
					obj.editor.autocensor();
					}
				
				}

			}, true);
	
	//we need to apply the overlay again after preview/show recent replies
	Listeners.add(document, 'DOMSubtreeModified', function(e) {
			
			var pref = "ctl00_ctl00_cphMain_cphMain_";
			
			if((I.url.pageType!="sendPM" && e.target != document.getElementById(pref + "ccContent_updPanelPost")) ||
				(I.url.pageType=="sendPM" && e.target != document.getElementById(pref + "UpdatePanel1"))) return;
			
			if(e.target.getElementsByClassName("overlayContainer")[0]) return;
			
			var o = obj;
			
			//http://wiki.greasespot.net/Greasemonkey_access_violation
			//obj.draw calls Editors.open which calls GM_getFile, access violation for some reason
			//must use a timeout to get around it
			setTimeout(
				function(){
					var p = o.editor.wysiwygOn;
					o.draw(e.target.getElementsByTagName("textarea")[0]);
					o.editor.wysiwygOn = p;
					},
				0);
			
			}, true);
	
	}
	
Cleanup.add(function(){ Overlay = null; });

if(I.url.pageType=="postReply" || I.url.pageType=="postTopic" || I.url.pageType=="postEdit" || I.url.pageType=="sendPM") {

	if(GM_getValue("overlayWysiwyg", false)) {
	
		var pageOverlay = new Overlay(document.getElementById("boards_webform_wrapper").getElementsByTagName('textarea')[0]);
		Cleanup.add(function(){ pageOverlay = null; });
		
		}

	}

