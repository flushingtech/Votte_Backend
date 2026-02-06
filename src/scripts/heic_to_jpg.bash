cd "$1" ||  exit 1
for file in *.HEIC *.heic; do
    [ -f "$file" ] && convert "$file" -resize '1440x>' -quality 90 "${file%.*}.jpg"
done