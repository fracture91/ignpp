#!/bin/sh

set -e

if [ "$1" = '-h' -o "$#" -lt '1' ]; then
cat <<EOF
Usage: $(basename $0) IDNAME [file]
Where IDNAME is either 'dev' or 'pub'.
file is optional and defaults to skin/default/main.css

This script changes the ID used in chrome-extension URIs in a CSS file.
If IDNAME is 'dev', it will change the ID to match the development ID
specified in cssid.cfg.
If IDNAME is 'pub', it will change the ID to match the public ID.
The public ID should be constant, but the dev ID will change with each unpacked installation.
EOF
	exit 0
fi


#pubid and devid should be defined here
source ./cssid.cfg

if [ "$1" = 'dev' ]; then
	id="$devid"
elif [ "$1" = 'pub' ]; then
	id="$pubid"
else
	echo "First argument must be 'dev' or 'pub'"
	exit 1
fi

if [ "$#" -lt '2' ]; then
	file='skin/default/main.css'
else
	file="$2"
fi



sed "s_chrome-extension://[^/]*/_chrome-extension://$id/_g" "$file" > "$file.new"
cp "$file.new" "$file"
rm "$file.new"
echo "IDs in file $file changed to $1 ID ($id)"