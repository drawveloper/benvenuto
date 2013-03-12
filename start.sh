#!/bin/bash
redis-cli ping
rc=$?
if [[ $rc != 0 ]] ; then
    redis-server &
fi
nodemon app.coffee -w ./ -w ./libs/
