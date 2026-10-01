#!/bin/sh
set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$script_dir/.."
mkdir -p output/qa/maestro
if [ -n "${DST_QA_DEVICE:-}" ]; then
  exec "$script_dir/maestro-local.sh" --device "$DST_QA_DEVICE" test qa/maestro --format junit --output output/qa/maestro/results.xml "$@"
fi
exec "$script_dir/maestro-local.sh" test qa/maestro --format junit --output output/qa/maestro/results.xml "$@"
