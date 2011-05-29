#!/bin/sh

#Based on Greasemonkey's build script, though much simpler
#https://github.com/greasemonkey/greasemonkey/blob/f523f463d300b4c0b13f128ee2974f41b58bb931/build.sh

if [ "$1" = "-h" ]; then
	echo "Usage: ./build.sh [filename (before extension) or "/" for default] [directory]"
	echo "By default, filename is ignppx,x,x.zip/.xpi, and directory is ../packaged"
	echo
	echo "This script zips up the contents of the working directory into a file named \
			according to the version in install.rdf, then makes a copy with a .xpi extension."
	exit 0
fi

if [ "$#" -lt "1" -o "$1" = "/" ]; then
	#Get the version number from install.rdf, replace periods with commmas
	#There's probably a way to do this without running sed twice
	IGNVER=`sed -ne '/em:version/{ s/.*>\(.*\)<.*/\1/; p}' install.rdf | sed -e 's/\./,/g'`
	IGNFILE="ignpp$IGNVER"
else
	IGNFILE="$1"
fi

if [ "$#" -lt "2" ]; then
	IGNDIR="../packaged"
else
	IGNDIR="$2"
fi



mkdir -p "$IGNDIR"

IGNDF="$IGNDIR/$IGNFILE"

echo "Creating $IGNDF.zip ..."
zip -qr9X "$IGNDF.zip" *

echo "Copying to $IGNDF.xpi ..."
cp "$IGNDF.zip" "$IGNDF.xpi"

chmod -R 700 "$IGNDIR"

echo "Done."