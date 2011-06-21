#!/bin/sh

#Based on Greasemonkey's build script, though much simpler
#https://github.com/greasemonkey/greasemonkey/blob/f523f463d300b4c0b13f128ee2974f41b58bb931/build.sh

#exit if we run into errors
set -e

if [ "$1" = '-h' ]; then
cat <<EOF
Usage: $(basename $0) [filename (before extension) or "/" for default] [directory]
By default, filename is ignppx,x,x.zip/.xpi, and directory is ../packaged

This script should be used to create zip/xpi files for public distribution.
It zips up the contents of the working directory into a file named
according to em:version in install.rdf, then makes a copy with a .xpi extension.
It will also run cssid.sh to make sure the public ID is used.
EOF
	exit 0
fi

if [ "$#" -lt '1' -o "$1" == '/' ]; then
	#Get the version number from install.rdf, replace periods with commmas
	IGNVER=$(sed -n '/em:version/{
		s/.*>\(.*\)<.*/\1/
		s/\./,/g
		p
	}' install.rdf)
	filename="ignpp$IGNVER"
else
	filename="$1"
fi

if [ "$#" -lt '2' ]; then
	directory='../packaged'
else
	directory="$2"
fi


path="$directory/$filename"

#we need to work in a different directory since cssid.sh will change the contents of some files
build="$directory/build"
echo "Creating build directory $build ..."
mkdir -p "$build"
cp -r ./* "$build"

original=`pwd`
cd "$build"
./cssid.sh pub


echo "Creating $path.zip ..."
zip -qr9X "build.zip" *
cd "$original"
cp "$build/build.zip" "$path.zip"

echo "Copying to $path.xpi ..."
cp "$path.zip" "$path.xpi"

echo 'Cleanup...'
chmod -R 700 "$directory"
rm -r "$build"

echo 'Done.'