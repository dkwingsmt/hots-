#!/usr/bin/env bash

function abs_path {
  (cd "$1" &>/dev/null && echo "$PWD")
}

if [ $# -eq 0 ]; then
    echo "Usage: $0 <data dir>"
    exit 1
fi

DATA_DIR="$(abs_path $1)"
if [[ ! -d $DATA_DIR ]]; then
  echo Data directory \"$DATA_DIR\" does not exist
  exit 1
fi

BUILD=$(cat $DATA_DIR/BUILD)
if [ -z $(echo $BUILD | grep -E '^\d{5}$') ]; then
  echo Invalid build number $BUILD found in data directory \"$DATA_DIR\"
  exit 1
fi

SCRIPTS_PATH="$( cd "$(dirname "$0")" ; pwd -P )/"
PROJECT_BASE=$(abs_path "${SCRIPTS_PATH}/..")
SCHEMA_DIR="$PROJECT_BASE/parser/schemas"
TEMP_TYPED_DATA_DIR="$PROJECT_BASE/tmp/typed-data"
TYPED_DATA_DIR="$PROJECT_BASE/gen-i18n/src/external-data"
I18N_PATH="$PROJECT_BASE/transform/src/external/i18n.ts"

yarn workspace @html2nga/hots-parser build \
&& yarn workspace @html2nga/hots-parser start \
    -d "$DATA_DIR/json" \
    -s $SCHEMA_DIR \
    -o $TEMP_TYPED_DATA_DIR \
    -b $BUILD \
&& rm -rf $TYPED_DATA_DIR/*.ts \
&& mv $TEMP_TYPED_DATA_DIR/*.ts $TYPED_DATA_DIR  \
&& yarn workspace @html2nga/gen-i18n build \
&& yarn workspace @html2nga/gen-i18n start -o $I18N_PATH \
&& echo 'Done.'

exit $?