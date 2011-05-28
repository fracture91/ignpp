
var Threadpreview = new function() {
	
	this.patt = /http:\/\/(betaboards|boards|forums)\.ign\.com\/[a-z0-9_]+\/b[\d]+\/[\d]+/i;
	
	//returns a document fragment containing all replies in a preview layout
	this.createPreviewFrag = function(newReplies) {
		
		var frag = document.createDocumentFragment();
		
		for(var len = newReplies.length, i = 0; i < len; i++) {
		
			var thisReply = newReplies.get(i);
			var container = createElementX("div", {className: "replyPreview"});
			var ptop = createElementX("div", {className: "previewTop"});
			var link = createElementX("a", {
				href: thisReply.authorLink.href,
				innerHTML: thisReply.author
				});
			link.style.cssText = thisReply.authorLink.style.cssText;
			var b;
			var date = createElementX("div", {
				className: "previewDate",
				innerHTML: I.layout.fresh ? getFirstByClassName(thisReply.ref, "boards_thread_date").innerHTML
										: '<b>' + (b = thisReply.subjectRef.parentNode.getElementsByTagName('B')[0]).innerHTML + '</b>' + b.nextSibling.nodeValue
				});
				
			ptop.appendChild(link); ptop.appendChild(date);
			container.appendChild(ptop);
			container.appendChild(createElementX("div", {className: "previewBottom", innerHTML: (thisReply.pollRef ? "<form>" + thisReply.pollRef.innerHTML + "</form>" : "") + thisReply.postContent}));
			
			frag.appendChild(container);
			
			}
			
		return frag;
		
		}
	
	this.doIt = function(url, existing, samePanel, x, y) {
		
		var topicHref = 'http://' + url.host + '/' + url.boardName + '/b' + url.boardNumber + '/' + url.topicNumber + '/p1';
		var replyHref = url.replyUrl;
		
		var thisPanel, html;
		if(existing) {
			thisPanel = existing;
			thisPanel.link.href = url.href;
			if(!samePanel) {
				thisPanel.x = x;
				thisPanel.y = y+1;
				thisPanel.z = Infopanels.lastZ++;
				}
			if(thisPanel.paginator) thisPanel.paginator.insertBefore(createElementX("img", {className: "loadingIcon"}), thisPanel.paginator.firstChild);
			}
		else {
			html = '<a href="' + replyHref + '">Reply</a>' +
				'<div class="previewSubject"><a href="' + topicHref + '">Thread Preview</a></div>';
			thisPanel = Infopanels.open("preview" + url.topicNumber, html, '<img class="loadingIcon">', ["threadPreview"], x, y);
			thisPanel.link = getFirstByClassName(thisPanel.ref, "previewSubject").firstChild;
			}
		
		GM_xmlhttpRequest({
			method: "GET",
			url: url.href,
			headers:{
				"Accept": "text/html, text/plain"
				},
			onload:function(details) {
		
				if(!thisPanel || !thisPanel.ref) return;
		
				var dt = details.responseText;
				newReplies = new Replies(dt);
				
				thisPanel.link.textContent = Parse.title(dt);
				
				thisPanel.content = '<div class="boards_pagination"></div>';
				
				var samePage = true;
				thisPanel.paginator = thisPanel.ref.getElementsByClassName('boards_pagination')[0];
				
				if(newReplies.pages) {	
					thisPanel.paginator.innerHTML = (I.layout.fresh ? newReplies.pages.childNodes[1] : newReplies.pages.childNodes[1].getElementsByTagName('div')[0]).innerHTML;
					var newPage = getFirstByClassName(thisPanel.paginator, "currentpage").textContent;
					samePage = thisPanel.page == newPage;
					thisPanel.page = newPage;
					}
				else thisPanel.page = 1;
					
				if(!samePage) thisPanel.contentRef.scrollTop = 0;
				
				var frag = Threadpreview.createPreviewFrag(newReplies);
				
				thisPanel.contentRef.appendChild(frag);
				
				delete newReplies;

				}
			});
		
		}
	
	}

Listeners.add(document, 'click', function(e) {

	if(e.which!=1 || e.ctrlKey || e.shiftKey || e.metaKey) return;
	
	if(e.target.tagName=="A" && e.target.href.search(Threadpreview.patt)!=-1) {
	
		var url = new Url(e.target.href);
		
		var samePanel = false;
		var existing = Infopanels.get("preview" + url.topicNumber);
		if(!e.altKey && (!existing || !(samePanel = isChildOf(existing.ref, e.target)))) return;
		
		e.preventDefault();
		
		var pos = samePanel ? findPos(existing.ref) : [e.pageX, e.pageY];
		
		Threadpreview.doIt(url, existing, samePanel, pos[0], pos[1]+1);
	
		}

	}, true);
