var EXPORTED_SYMBOLS = ["vestitools_files"];

/*
Provides methods for reading and writing files.
*/
var vestitools_files = new function vt_files() {
	
	/*
	
	Life of a chrome URI
	
	chrome://vestitools/content/panel.html -> chromeToPath ->
	file://C:/Users/.../content/panel.html -> urlToPath ->
	C:\Users\...\content\panel.html (or whatever system scheme is used) -> getSystemFile ->
	nsILocalFile, which we can actually do stuff with!
	
	*/
	
	var Cc = Components.classes;
	var Ci = Components.interfaces;
	
	var ios = Cc["@mozilla.org/network/io-service;1"]
                    .getService(Ci.nsIIOService);
					
	var chromePrefix = "chrome://vestitools/";
	var profilePath = "ign++";
	var profileNsILocalFile = null;
	
	// https://developer.mozilla.org/en/Code_snippets/File_I%2F%2FO
	// http://forums.mozillazine.org/viewtopic.php?p=921150#921150
	// http://forums.mozillazine.org/viewtopic.php?f=19&t=967445

	/*
	If the file doesn't exist or is the wrong type, create it.
	Returns true if created, false otherwise.
	*/
	function createIfNecessary(file, isDirectory) {
		if( !file.exists() || !(isDirectory ? file.isDirectory() : file.isFile()) ) {
			var type = Components.interfaces.nsIFile[isDirectory ? "DIRECTORY_TYPE" : "NORMAL_FILE_TYPE"];
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
			file = Components.classes["@mozilla.org/file/directory_service;1"].
					getService(Components.interfaces.nsIProperties).
					get("ProfD", Components.interfaces.nsILocalFile);
			file.appendRelativePath(profilePath);
			createIfNecessary(file, true);
			profileNsILocalFile = file;
			}
		var file = profileNsILocalFile.clone();
		//clone returns an nsIFile, we need to "cast" it to nsILocalFile
		file.QueryInterface(Components.interfaces.nsILocalFile);
		return file;
		}
	
	/*
	Given a URI, returns the nsILocalFile it points to.
	The corresponding file is created if it doesn't already exist.
	
	The "extension" scheme resolves to chromePrefix + path
	For example, extension://some/other/stuff.html resolves to chrome://vestitools/some/other/stuff.html .
	Firefox handles the URI from there.
	
	The "profile" scheme resolves to point to the user's profile directory + profilePath + path.
	For example, on my computer, profile://usercolors.css becomes: 
		C:\Users\Andrew\AppData\Roaming\Mozilla\Firefox\Profiles\3bb9kah3.dev\ign++\usercolors.css
	*/
	this.getFile = function(uri) {
		var file, colonslash = uri.indexOf("://"), scheme, path = uri;
		if(colonslash != -1) {
			scheme = uri.slice(0, colonslash);
			path = uri.substring(colonslash+3);
			}
			
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
		return file;
		}
	
	/*
	Returns nsILocalFile at the end of the given system file path.
	Will create it if necessary.
	*/
	this.getSystemFile = function(path) {
		var file = Cc["@mozilla.org/file/local;1"]
					.createInstance(Ci.nsILocalFile);  
		file.initWithPath(path);
		createIfNecessary(file)
		return file;
		}
	
	// http://forums.mozillazine.org/viewtopic.php?p=921150
	
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
	Writes the given text to the file from this.getFile(uri).
	You cannot write to URIs with the extension scheme.  If you try, exception.
	Returns true if successful, false if text was too large.
	*/
	this.writeFile = function(uri, text) {
		/*See https://bugzilla.mozilla.org/show_bug.cgi?id=657019
		and https://github.com/fracture91/ignpp/issues/226*/
		if(uri.indexOf("extension:") == 0) {
			throw "IGN++ - vestitools_files.writeFile: Not allowed to write to URI with extension scheme.\n" +
					"URI: " + uri;
			}
	
		//limit file size to 10 mebibytes for security purposes, we don't need to write anything bigger
		if(text.length > (1024 * 1024 * 10)) return false;
		
		var file = this.getFile(uri);
		
		var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
						.createInstance(Ci.nsIFileOutputStream);
		//open up the file for writing
		foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate
		//write to file
		foStream.write(text,text.length);
		//make sure everything's pooped out
		foStream.flush();
		foStream.close();
		
		return true;
		}
		
	/*
	Returns text in the file given by this.getFile(uri).
	If the file does not exist, it is created.
	*/
	this.readFile = function(uri) {
		var file = this.getFile(uri);
		
		var is = Cc["@mozilla.org/network/file-input-stream;1"]
					.createInstance(Ci.nsIFileInputStream);
		is.init( file,0x01, 00004, null);
		var sis = Cc["@mozilla.org/scriptableinputstream;1"]
					.createInstance(Ci.nsIScriptableInputStream);
		sis.init(is);
		return sis.read(sis.available()); 
		}
	
	
	};