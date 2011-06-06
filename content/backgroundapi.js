
/*
This file only runs in Google Chrome in background.html
*/

/*
We need to override some functionality in GM_API for the background page.
setValue needs to maintain a copy of localStorage and alert managed tabs of changes.
addStyle needs to apply a style to a certain tab, rather than message background about it.
*/
(function(){

GM_API.localStorage = localStorage;

/*
A copy of localStorage which Background can send to tabs that request it.
*/
GM_API.localStorageCopy = {};
for(var i in localStorage)
	GM_API.localStorageCopy[i] = localStorage[i];

GM_API.oldSetValue = GM_API.setValue;
//tabManager should be set properly later on
GM_API.tabManager = null;

/*
Like the regular setValue, except this will also maintain this.localStorageCopy
and call this.tabManager.onSetValue.
*/
GM_API.setValue = function(name, value, sender) {
	var jsonValue = JSON.stringify(value);
	this.localStorage[name] = this.localStorageCopy[name] = jsonValue;
	if(this.tabManager) {
		this.tabManager.onSetValue(name, jsonValue, sender ? sender.tab : undefined);
		}
	return value;
	}

GM_API.oldAddStyle = GM_API.addStyle;

/*
Like the regular addStyle, except this requires a tab to add the style to.
*/
GM_API.addStyle = function(tab, css) {
	chrome.tabs.insertCSS(tab.id, {code: css});
	}

GM_API.expose();

})();
