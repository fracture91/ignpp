var rules = {};

rules.lastUsercolorCheck = {
	min: 0,
	step: 1
}

rules.UCcolor = rules.UCbgcolor = rules.UCbordercolor = {
	pattern: /^[\da-fA-F]{6}$/,
	maxLength: 6
}

rules.UCweight = {
	selections: [["Default", "null"], ["Normal", "normal"], ["Bold", "bold"]]
}

rules.UCstyle = {
	selections: [["Default", "null"], ["Normal", "normal"], ["Italics", "italic"]]
}

rules.UCdecoration = {
	selections: [["Default", "null"], ["None", "none"], ["Over", "overline"],
				["Under", "underline"], ["Strike", "line-through"]]
}

rules.pretextStart = rules.pretextEnd = rules.pretextBefore = rules.pretextAfter = rules.pretextEdit = {
	multiline: true
}

rules.autorefreshTopicsInt = rules.autorefreshRepliesInt = autorefreshPMCountInt = {
	min: 1000,
	step: 1
}

rules.ignoreList = {
	customPattern: /^([\w.\-]{3,20})$/,
	customErrorFunc: function(val) {
		val = val.split(",");
		val.sort();
		for(var i=0, len=val.length; i<len; i++) {
			if(i < len-1 && val[i] == val[i+1]) {
				//since the array is sorted, identical elements are adjacent
				return '"' + val[i] + '" appears more than once (each username must be unique).';
				}
			if(!val[i].match(this.customPattern)) {
				return '"' + val[i] + '" is not a valid username (must match ' + this.customPattern + " ).";
			}
		}
		return false;
	}
}

rules.postsPerPage = {
	min: 5,
	max: 50,
	step: 5,
	maxLength: 2
}

rules.username = {
	pattern: rules.ignoreList.customPattern,
	maxLength: 20
}

rules.uid = {
	min: -1,
	step: 1
}
