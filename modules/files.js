var EXPORTED_SYMBOLS = ["vestitools_files"];

/*
Provides methods for reading and writing files.

A lot of code comes from or is based on this stuff:
	https://developer.mozilla.org/en/Code_snippets/File_I%2F%2FO
	http://forums.mozillazine.org/viewtopic.php?f=19&t=967445
	http://forums.mozillazine.org/viewtopic.php?p=921150
	http://www.html5rocks.com/tutorials/file/filesystem/
*/
var vestitools_files = new function vt_files() {
	
	try {
		var Cc = Components.classes;
		var Ci = Components.interfaces;
		}
	catch(e) {
		//you're on chrome probably
		}
	
	/*
	true if this module is being used by Google Chrome.
	Set by this.chromeInit()
	*/
	this.chrome = false;
	
	/*
	The FileSystem (see FileSystem API).
	Set by this.chromeInit()
	*/
	this.fileSystem = null;
	
	/*
	What "extension" scheme URI paths should be prefixed with on Firefox.
	*/
	var chromePrefix = "chrome://vestitools/";
	
	/*
	The directory within the Profile directory that "profile" scheme URI paths start in.
	*/
	var profilePath = "ign++";
	
	/*
	An nsILocalFile that points to ProfD/profilePath.
	Managed by this.profileClone()
	*/
	var profileNsILocalFile = null;
	
	/*
	Size limit for Google Chrome's FileSystem API in bytes.
	*/
	this.fileSystemSizeLimit = 10*1024*1024; //10 mebibytes
	
	/*
	Size limit for one file (Firefox or Chrome) in bytes.
	*/
	this.fileSizeLimit = this.fileSystemSizeLimit;
	
	
	
	/*
	Google Chrome MUST call this method before using this module.
	Firefox MUST NOT call it unless it wants things to break.
	Requests the filesystem and such.
	Callback is called when it's done and the module can be used.
	*/
	this.chromeInit = function(callback) {
		if(typeof callback != "function") callback = function(){};
		this.chrome = true;
		
		//Chrome 12 prefixed these
		window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
		window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder; //love the prefix consistency
		
		var that = this;
		window.requestFileSystem(window.PERSISTENT, this.fileSystemSizeLimit, function(fs) {
			that.fileSystem = fs;
			callback();
			}, this.chromeErrorHandler);
		
		}
	
	/*
	The default error handler used by Google Chrome FileSystem stuff.
	*/
	this.chromeErrorHandler = function (e) {
		var msg = '';

		switch (e.code) {
		case FileError.QUOTA_EXCEEDED_ERR: msg = 'QUOTA_EXCEEDED_ERR';
			break;
		case FileError.NOT_FOUND_ERR: msg = 'NOT_FOUND_ERR';
			break;
		case FileError.SECURITY_ERR: msg = 'SECURITY_ERR';
			break;
		case FileError.INVALID_MODIFICATION_ERR: msg = 'INVALID_MODIFICATION_ERR';
			break;
		case FileError.INVALID_STATE_ERR: msg = 'INVALID_STATE_ERR';
			break;
		default: msg = 'Unknown Error';
			break;
		}

		console.log('IGN++ - vestitools_files.chromeErrorHandler: ' + msg);
	}
	


	
	/*
	Given a URI, returns the nsILocalFile it points to.
	If the URI uses the "profile" scheme, the corresponding file is created if it doesn't already exist.
	
	The "extension" scheme resolves to chromePrefix + path
	For example, extension://some/other/stuff.html resolves to chrome://vestitools/some/other/stuff.html .
	Firefox handles the URI from there.
	
	The "profile" scheme resolves to point to the user's profile directory + profilePath + path.
	For example, on my computer, profile://usercolors.css becomes: 
		C:\Users\Andrew\AppData\Roaming\Mozilla\Firefox\Profiles\3bb9kah3.dev\ign++\usercolors.css
		
	On Chrome, this function is asynchronous.
	It will pass an XMLHttpRequest to the callback for the "extension" scheme,
	or a FileEntry (FileSystem API) for the "profile" scheme.
	The callback can add an onload listener (or whatever) to the XHR and then call xhr.send().
	If it's a FileEntry, it will need to go through all the necessary crap to write or read to it.
	
	The callback is called regardless of browser.
	*/
	this.getFile = function(uri, callback) {
		if(typeof callback != "function") callback = function(){};
		
		var file, colonslash = uri.indexOf("://"), scheme, path = uri;
		if(colonslash != -1) {
			scheme = uri.slice(0, colonslash);
			path = uri.substring(colonslash+3);
			}
			
		if(this.chrome) {
			if(scheme == "extension") {
				file = new XMLHttpRequest();
				file.open("GET", chrome.extension.getURL(path), true);
				callback(file);
				}
			else {
				this.fileSystem.root.getFile(path, {create: true, exclusive: false}, function(fileEntry) {
					callback(fileEntry);
					}, this.chromeErrorHandler);
				}
			return file;
			}
		else { //firefox
			if(scheme == "extension") {
				path = chromePrefix + path;
				file = this.getSystemFile(this.chromeToPath(path));
				}
			//going with profile scheme handling by default
			else {
				file = this.profileClone();
				file.appendRelativePath(path);
				createIfNecessary(file);
				}
			/*
			Firefox has no reason to use the callback on its own, 
			but browser-agnostic code probably will.
			*/
			callback(file);
			return file;
			}
		
		}
	
	
	/*
	Writes the given text to the file from this.getFile(uri).
	You cannot write to URIs with the extension scheme.  If you try, exception.
	Returns true if successful, false if text was too large.
	This method is asynchronous in Google Chrome, but the callback is called for both browsers.
	*/
	this.writeFile = function(uri, text, callback) {
		if(typeof callback != "function") callback = function(){};
	
		/*See https://bugzilla.mozilla.org/show_bug.cgi?id=657019
		and https://github.com/fracture91/ignpp/issues/226*/
		if(uri.indexOf("extension:") == 0) {
			throw "IGN++ - vestitools_files.writeFile: Not allowed to write to URI with extension scheme.\n" +
					"URI: " + uri;
			}
	
		//limit file size for security purposes
		if(text.length > this.fileSizeLimit) return false;
		
		var that = this;
		var file = this.getFile(uri, function(file) {
			if(!that.chrome) return;
			
			//the Google Chrome way to write to files
			
			if(file instanceof XMLHttpRequest) {
				throw "IGN++ - vestitools_files.writeFile: getFile screwed up and gave me an XMLHttpRequest for writing.\n" +
					"URI: " + uri;
				}
			//else it should be a FileEntry
			else {
				// Create a FileWriter object for our FileEntry
				file.createWriter(function(fileWriter) {

					// Create a new Blob to write to the file
					var bb = new BlobBuilder(); // Note: window.WebKitBlobBuilder in Chrome 12.
					bb.append(text);
					var blob = bb.getBlob('text/plain');
				
					fileWriter.onwriteend = function(e) {
						if(fileWriter.length > blob.size) {
							//we need to truncate the remainder
							fileWriter.onwriteend = function(e) {
								callback(true, e);
								}
							fileWriter.truncate(blob.size);
							}
						else callback(true, e);
						}

					fileWriter.onerror = function(e) {
						callback(false, e);
						}

					fileWriter.write(blob);

					}, that.chromeErrorHandler);
				}
			
			});
			
		//and now, the Firefox-specific way of writing
		if(!this.chrome) {
			var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
							.createInstance(Ci.nsIFileOutputStream);
			//open up the file for writing
			foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate
			//write to file
			foStream.write(text,text.length);
			//make sure everything's pooped out
			foStream.flush();
			foStream.close();
			callback(true);
			}
		
		return true;
		}
		
	/*
	Returns text in the file given by this.getFile(uri).
	If the file does not exist and URI uses "profile" scheme, it is created.
	This method is asynchronous in Google Chrome, but the callback is called with the result for both browsers.
	*/
	this.readFile = function(uri, callback) {
		if(typeof callback != "function") callback = function(){};
	
		var that = this;
		var file = this.getFile(uri, function(file) {
			if(!that.chrome) return;
			
			//the Google Chrome way to read files
			
			if(file instanceof XMLHttpRequest) {
				file.onreadystatechange = function() {
					if (file.readyState == 4) {
						//note that chrome will give you a status of 0 for some reason, even when successful
						callback(file.responseText, file);
						}
					}
				file.send();
				}
			//else it should be a FileEntry
			else {
				// Get a File object representing the file,
				// then use FileReader to read its contents.
				file.file(function(file) { //sup dawg, I heard you like files
					var reader = new FileReader();
					reader.onloadend = function(e) {
						callback(this.result, e)
						};
					reader.readAsText(file);
					}, that.chromeErrorHandler);
				}
			});
		
		if(!this.chrome) {
			//the Firefox way to read files
			var is = Cc["@mozilla.org/network/file-input-stream;1"]
						.createInstance(Ci.nsIFileInputStream);
			is.init( file,0x01, 00004, null);
			var sis = Cc["@mozilla.org/scriptableinputstream;1"]
						.createInstance(Ci.nsIScriptableInputStream);
			sis.init(is);
			var result = sis.read(sis.available());
			callback(result);
			return result;
			}
		
		}
	
	//The below is all Firefox stuff
	
	/*
	If the file doesn't exist or is the wrong type, create it.
	Returns true if created, false otherwise.
	*/
	function createIfNecessary(file, isDirectory) {
		if( !file.exists() || !(isDirectory ? file.isDirectory() : file.isFile()) ) {
			var type = Ci.nsIFile[isDirectory ? "DIRECTORY_TYPE" : "NORMAL_FILE_TYPE"];
			file.create(type, 0777);
			return true;
			}
		return false;
		}
	
	/*
	Returns a clone of the nsILocalFile at ProfD/profilePath.
	*/
	this.profileClone = function() {
		var file;
		if(!profileNsILocalFile) {
			file = Cc["@mozilla.org/file/directory_service;1"].
					getService(Ci.nsIProperties).
					get("ProfD", Ci.nsILocalFile);
			file.appendRelativePath(profilePath);
			createIfNecessary(file, true);
			profileNsILocalFile = file;
			}
		var file = profileNsILocalFile.clone();
		//clone returns an nsIFile, we need to "cast" it to nsILocalFile
		file.QueryInterface(Ci.nsILocalFile);
		return file;
		}
		
	/*
	
	Life of a chrome URI (Firefox)
	
	chrome://vestitools/content/panel.html -> chromeToPath ->
	file://C:/Users/.../content/panel.html -> urlToPath ->
	C:\Users\...\content\panel.html (or whatever system scheme is used) -> getSystemFile ->
	nsILocalFile, which we can actually do stuff with!
	
	*/
		
	/*
	Consumes a chrome URI and produces the file's absolute file path URI (file://C:/Users/...)
	*/
	this.chromeToPath = function(aPath) {
		var rv;
		var ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci["nsIIOService"]);
		var uri = ios.newURI(aPath, "UTF-8", null);
		var cr = Cc['@mozilla.org/chrome/chrome-registry;1'].getService(Ci["nsIChromeRegistry"]);
		rv = cr.convertChromeURL(uri).spec;

		if (/^file:/.test(rv))
		  rv = this.urlToPath(rv);
		else
		  rv = this.urlToPath("file://"+rv);

		return rv;
		}

	/*
	Consumes file:// URI and produces system file path (C:\Users\...)
	*/
	this.urlToPath = function(aPath) {
		var ph = Cc["@mozilla.org/network/protocol;1?name=file"]
					.createInstance(Ci.nsIFileProtocolHandler);
		return ph.getFileFromURLSpec(aPath).path;
		}
		
	/*
	Returns nsILocalFile at the end of the given system file path.
	*/
	this.getSystemFile = function(path) {
		var file = Cc["@mozilla.org/file/local;1"]
					.createInstance(Ci.nsILocalFile);  
		file.initWithPath(path);
		return file;
		}
	
	
	};