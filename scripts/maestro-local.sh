#!/bin/sh
set -eu
export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
exec "$HOME/.local/share/dst-tools/maestro-2.10.0/maestro/bin/maestro" "$@"
