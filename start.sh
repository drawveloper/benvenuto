redis-cli ping
rc=$?
if [[ $rc != 0 ]] ; then
    redis-server &
fi

#!/bin/bash
nodemon benvenuto.coffee -w ./ -w ./libs/
