#!/bin/sh

if [ "$1" = "-h" -o "$#" -lt "1" ]; then
	echo "Usage: ./cssid.sh IDNAME [file]"
	echo "Where IDNAME is either 'dev' or 'pub'."
	echo "file defaults to skin/default/main.css"
	echo
	echo "This script changes the ID used in chrome-extension URIs in a CSS file.  \
If IDNAME is 'dev', it will change the ID to match the development ID specified in cssid.cfg.  \
If IDNAME is 'pub', it will change the ID to match the public ID.  \
The public ID should be constant, but the dev ID will change with each unpacked installation."
	exit 0
fi


#IGNDEV and IGNPUB should be defined here
source ./cssid.cfg

if [ "$1" = "dev" ]; then
	IGNID=$IGNDEV
elif [ "$1" = "pub" ]; then
	IGNID=$IGNPUB
else
	echo "First argument must be 'dev' or 'pub'"
	exit 0
fi

if [ "$#" -lt "2" ]; then
	IGNFILE="skin/default/main.css"
else
	IGNFILE="$2"
fi



sed "s/chrome-extension:\/\/[^\/]*\//chrome-extension:\/\/$IGNID\//g" "$IGNFILE" > "$IGNFILE.new"
cp "$IGNFILE.new" "$IGNFILE"
rm "$IGNFILE.new"
echo "IDs in file $IGNFILE changed to $1 ID ($IGNID)"