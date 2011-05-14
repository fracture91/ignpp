var rules = {};

rules.UCcolor = {
	displayName: "Text",
	pattern: /test/
}

rules.UCweight = {
	displayName: "Weight",
	selections: [["Default", "null"], ["Normal", "normal"], ["Bold", "bold"]]
}

rules.autorefreshTopicsInt = {
	min: 1000,
	max: 2000
}

rules.ignoreList = {
	pattern: /^((\,[\w.\-]{3,20})*)$/
}