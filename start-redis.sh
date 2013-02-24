#!/bin/bash
redis-cli ping
rc=$?
if [[ $rc != 0 ]] ; then
    redis-server &
fi
