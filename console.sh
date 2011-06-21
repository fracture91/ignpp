#!/bin/sh


if [ "$#" -lt "1" -o "$1" != "enable" -a "$1" != "disable" ]; then
	echo "Usage: ./console.sh [enable or disable] [file]"
	echo "File is optional.  By default, file is content/console.js."
	echo
	echo "This script will enable or disable the IGN++ console by commenting \
or uncommenting code.  Public builds must have it disabled to pass Mozilla review.  \
The file should look something like this for this to work:"
	echo 
	echo "	//CONSOLE START"
	echo "	// /*"
	echo
	echo "	...console stuff here..."
	echo
	echo "	//CONSOLE END"
	echo "	// */"
	exit 0
fi

if [ "$#" -lt "2" ]; then
	confile='content/console.js'
else
	confile="$2"
fi


# returns a sed script for finding the start and end tags
# returns to variable $sedret
# $1 - "START" or "END"
# $2 - provide if you want to replace, "enable" or "disable"
get_sed() {
	if [ "$1" == 'START' ]; then
		local mcomment='/\*'
		local rcomment='/*'
	else
		local mcomment='\*/'
		local rcomment='*/'
	fi
	
	if [ "$#" -lt '2' ]; then
		local command="\\"
		local post='p'
	else
		local command='s'
		if [ "$2" == 'enable' ]; then
			local slashes='// '
		else
			local slashes=''
		fi
		local post='\
'"$slashes$rcomment"'_'
	fi
	
	#underscores are always used for the delimiter
	#since we're dealing with a lot of slashes
	sedret='\_//CONSOLE '"$1"'_{
#append the next line to the pattern space
N
#search for "/*", "///*", "// /*", etc on the next line
'"$command"'_\n\(//\s*\)\?'"$mcomment"'_'"$post"'
}'
}


get_sed START
start=$(sed -n "$sedret" "$confile")
get_sed END
end=$(sed -n "$sedret" "$confile")

#make sure both the start and end tags exist
#if we don't check, we run the risk of breaking everything
if [ "$start" != '' -a "$end" != '' ]; then
	get_sed START "$1"
	startsed="$sedret"
	get_sed END "$1"
	endsed="$sedret"
	sed -e "$startsed" -e "$endsed" "$confile" > "$confile.new"
	cp "$confile.new" "$confile"
	rm "$confile.new"
	echo "Console $1d in $confile"
else
	echo 'Start or end tag not found, file not altered'
fi
