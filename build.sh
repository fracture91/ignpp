#!/bin/sh

#Based on Greasemonkey's build script, though much simpler
#https://github.com/greasemonkey/greasemonkey/blob/f523f463d300b4c0b13f128ee2974f41b58bb931/build.sh

if [ "$1" = "-h" ]; then
	echo "Usage: ./build.sh [filename (before extension) or "/" for default] [directory]"
	echo "By default, filename is ignppx,x,x.zip/.xpi, and directory is ../packaged"
	echo
	echo "This script should be used to create zip/xpi files for public distribution.  \
It zips up the contents of the working directory into a file named \
according to the version in install.rdf, then makes a copy with a .xpi extension.  \
It will also run cssid.sh to make sure the public ID is used."
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

IGNDF="$IGNDIR/$IGNFILE"

#we need to work in a different directory since cssid.sh will change the contents of some files
IGNBUILD="$IGNDIR/build"
echo "Creating build directory $IGNBUILD ..."
mkdir -p "$IGNBUILD"
cp -r ./* "$IGNBUILD"

ORIGDIR=`pwd`
cd "$IGNBUILD"
./cssid.sh pub


echo "Creating $IGNDF.zip ..."
zip -qr9X "build.zip" *
cd "$ORIGDIR"
cp "$IGNBUILD/build.zip" "$IGNDF.zip"

echo "Copying to $IGNDF.xpi ..."
cp "$IGNDF.zip" "$IGNDF.xpi"

echo "Cleanup..."
chmod -R 700 "$IGNDIR"
rm -r "$IGNBUILD"

echo "Done."