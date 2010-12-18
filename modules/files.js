var EXPORTED_SYMBOLS = ["vestitools_files"];

var vestitools_files = new function vt_files() {
	
	/*
	
	Life of a chrome URI
	
	chrome://vestitools/content/panel.html -> chromeToPath ->
	file://C:/Users/.../content/panel.html -> urlToPath ->
	C:\Users\...\content\panel.html (or whatever system scheme is used) -> getFile ->
	nsILocalFile, which we can actually do stuff with!
	
	*/
	
	var Cc = Components.classes;
	var Ci = Components.interfaces;
	
	var ios = Cc["@mozilla.org/network/io-service;1"]
                    .getService(Ci.nsIIOService);
	
	// https://developer.mozilla.org/en/Code_snippets/File_I%2F%2FO
	// http://forums.mozillazine.org/viewtopic.php?p=921150#921150
	// http://forums.mozillazine.org/viewtopic.php?f=19&t=967445
		
	//returns file path of this extension's location on disk
	this.getExtensionFolder = function() {
		// the extension's id from install.rdf  
		var MY_ID = "ignpp@vestitools.pbworks.com";
		//Ci.nsIExtensionManager no longer exists in Firefox 4, but nothing uses this function
		//https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsIExtensionManager
		var em = Cc["@mozilla.org/extensions/manager;1"]
					.getService(Ci.nsIExtensionManager);  
		// the path may use forward slash ("/") as the delimiter  
		// returns nsIFile for the extension's install.rdf  
		var file = em.getInstallLocation(MY_ID).getItemFile(MY_ID, undefined);
		return file.path;
		}
	
	//returns file at the end of the given system file path,
	//or null if it does not exist, or 0 if the path was not valid
	this.getFile = function(path) {
		
		if(path && (typeof path == "string")) {
			var file = Cc["@mozilla.org/file/local;1"]
						.createInstance(Ci.nsILocalFile);  
			file.initWithPath(path);
			
			return file.exists() ? file : null;
			}
			
		return 0;

		}
	
	// http://forums.mozillazine.org/viewtopic.php?p=921150
	
	//consumes a chrome URI and produces the file's absolute file path URI (file://C:/Users/...)
	//or -1 if path was invalid
	this.chromeToPath = function(aPath) {

		if (!aPath || (typeof aPath != "string") || !(/^chrome:\/\/vestitools/.test(aPath)))
			return -1; //not a valid chrome uri
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

	//consumes file:// URI and produces system file path (C:\Users\...)
	//or -1 if path was invalid
	this.urlToPath = function(aPath) {
		if (!aPath || (typeof aPath != "string") || !/^file:/.test(aPath))
			return -1;
			
		var ph = Cc["@mozilla.org/network/protocol;1?name=file"]
					.createInstance(Ci.nsIFileProtocolHandler);
					
		return ph.getFileFromURLSpec(aPath).path;
		}
	
	//writes the given text to the file with the given chrome URI
	//returns 1 if successful, 0 if file does not exist, -1 if text was too large
	this.writeFile = function(text, path) {
		
		//limit file size to 10 mebibytes for security purposes, we don't need to write anything bigger
		if(text.length > (1024 * 1024 * 10)) return -1;
		
		var file = this.getFile(this.chromeToPath(path));
		
		if(file) {
			var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
							.createInstance(Ci.nsIFileOutputStream);
			//open up the file for writing
			foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate
			//write to file
			foStream.write(text,text.length);
			//make sure everything's pooped out
			foStream.flush();
			foStream.close();
			
			return 1;
			}
			
		return 0;
		
		}
		
	//returns text in the file at the given path,
	//or null if file does not exist
	this.readFile = function(path) {
		
		var file = this.getFile(this.chromeToPath(path));
		
		if(file) {
			var is = Cc["@mozilla.org/network/file-input-stream;1"]
						.createInstance(Ci.nsIFileInputStream);
			is.init( file,0x01, 00004, null);
			var sis = Cc["@mozilla.org/scriptableinputstream;1"]
						.createInstance(Ci.nsIScriptableInputStream);
			sis.init(is);
			return sis.read(sis.available()); 
			}
			
		return null;
		
		}
		
	//returns base64 data + "metadata" prefix representing the given file
	this.getDataURIFromFile = function(aFile) {
		var contentType = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService).getTypeFromFile(aFile);
		var inputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
		inputStream.init(aFile,0x01,0600,0);
		var binaryStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
		binaryStream.setInputStream(inputStream);
		//btoa is a built in binary to b64 converter
		var encoding = btoa(binaryStream.readBytes(binaryStream.available()));
		return "data:" + contentType + ";base64," + encoding;
		}
	
	
	};