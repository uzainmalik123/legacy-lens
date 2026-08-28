#!/bin/sh

echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> .agent/state/hook-debug.log
cat >> .agent/state/hook-debug.log
echo "" >> .agent/state/hook-debug.log

exit 0