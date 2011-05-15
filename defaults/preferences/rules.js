var rules = {};

rules.lastUsercolorCheck = {
	min: 0
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
	min: 1000
}

rules.ignoreList = {
	pattern: /^((\,[\w.\-]{3,20})*)$/
}

rules.postsPerPage = {
	min: 5,
	max: 50,
	step: 5,
	maxLength: 2
}

rules.username = {
	pattern: /^[\w.\-]{3,20}$/,
	maxLength: 20
}

rules.uid = {
	min: -1,
	step: 1
}
