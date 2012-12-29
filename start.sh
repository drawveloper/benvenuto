redis-cli ping
rc=$?
if [[ $rc != 0 ]] ; then
    redis-server &
fi

#!/bin/bash
nodemon app.coffee
