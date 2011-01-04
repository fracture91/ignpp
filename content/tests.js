/* 
You can paste the contents of this file into the console to run the tests.
The extension never runs this code on its own.
*/

(function(){

function Test(name, expectedOutput, func) {

	this.name = name;
	this.expectedOutput = expectedOutput;
	this.func = func;
	
	this.run = function() {
		var rv = this.func();
		var pass = this.expectedOutput == rv;
		return {passed: pass, output: rv};
	}

}

var Tester = new function() {
	
	var tests = [];
	
	this.add = function(test) {
		tests.push(test);
	}
	
	this.run = function() {
		
		var results = "";
		for(var i=0, len=tests.length; i<len; i++) {
			var thisTest = tests[i];
			var testResult = thisTest.run();
			if(testResult.passed) {
				results += "*** " + thisTest.name + " passed";
			}
			else {
				results += "!!! " + thisTest.name + " failed\nExpected Output:\n" + thisTest.expectedOutput + "\nActual Output:\n" + testResult.output;
			}
			results += "\n";
		}

		return results;

	}
	
}



//////////Actual tests start here



Tester.add(new Test("simple parse", "a", function(){
	return Parse.HTML("a");
}));

Tester.add(new Test("one div", "", function(){
	return Parse.HTML("<div></div>");
}));

Tester.add(new Test("two nested divs", "", function(){
	return Parse.HTML("<div><div></div></div>");
}));

Tester.add(new Test("one br", "\n", function(){
	return Parse.HTML("<br/>");
}));

Tester.add(new Test("two br", "\n\n", function(){
	return Parse.HTML("<br/><br/>");
}));

Tester.add(new Test("one div wrapped br", "\n", function(){
	return Parse.HTML("<div><br/></div>");
}));

Tester.add(new Test("two div wrapped br", "\n\n", function(){
	return Parse.HTML("<div><br/></div><div><br/></div>");
}));

Tester.add(new Test("one div wrapped br surrounded by br", "\n\n\n", function(){
	return Parse.HTML("<br/><div><br/></div><br/>");
}));

Tester.add(new Test("one br surrounded by div wrapped br", "\n\n\n", function(){
	return Parse.HTML("<div><br/></div><br/><div><br/></div>");
}));

Tester.add(new Test("text separated by one br", "a\na", function(){
	return Parse.HTML("a<br/>a");
}));

Tester.add(new Test("text separated by two br", "a\n\na", function(){
	return Parse.HTML("a<br/><br/>a");
}));

Tester.add(new Test("text separated by one div wrapped br", "a\n\na", function(){
	return Parse.HTML("a<div><br/></div>a");
}));

Tester.add(new Test("text separated by two div wrapped br", "a\n\n\na", function(){
	return Parse.HTML("a<div><br/></div><div><br/></div>a");
}));

Tester.add(new Test("divs separated by zero br", "a\na", function(){
	return Parse.HTML("<div>a</div><div>a</div>");
}));

Tester.add(new Test("divs separated by one br", "a\n\na", function(){
	return Parse.HTML("<div>a</div><br/><div>a</div>");
}));

Tester.add(new Test("divs separated by two br", "a\n\n\na", function(){
	return Parse.HTML("<div>a</div><br/><br/><div>a</div>");
}));

Tester.add(new Test("divs separated by one div wrapped br", "a\n\na", function(){
	return Parse.HTML("<div>a</div><div><br/></div><div>a</div>");
}));

Tester.add(new Test("divs separated by two div wrapped br", "a\n\n\na", function(){
	return Parse.HTML("<div>a</div><div><br/></div><div><br/></div><div>a</div>");
}));

Tester.add(new Test("three divs separated by zero br", "a\na\na", function(){
	return Parse.HTML("<div>a</div><div>a</div><div>a</div>");
}));

Tester.add(new Test("three divs separated by one br", "a\n\na\n\na", function(){
	return Parse.HTML("<div>a</div><br/><div>a</div><br/><div>a</div>");
}));

Tester.add(new Test("three divs separated by two br", "a\n\n\na\n\n\na", function(){
	return Parse.HTML("<div>a</div><br/><br/><div>a</div><br/><br/><div>a</div>");
}));

Tester.add(new Test("three divs separated by one div wrapped br", "a\n\na\n\na", function(){
	return Parse.HTML("<div>a</div><div><br/></div><div>a</div><div><br/></div><div>a</div>");
}));

Tester.add(new Test("three divs separated by two div wrapped br", "a\n\n\na\n\n\na", function(){
	return Parse.HTML("<div>a</div><div><br/></div><div><br/></div><div>a</div><div><br/></div><div><br/></div><div>a</div>");
}));

Tester.add(new Test("text and unexpected div", "a\n\na", function(){
	return Parse.HTML("a<div><br>a</div>");
}));

Tester.add(new Test("text and unexpected div separated by div wrapped br", "a\n\n\na", function(){
	return Parse.HTML("a<div><br></div><div><br>a</div>");
}));





//////////Actual tests end here
	
return Tester.run();

})();