#!/bin/bash

for i in {1..15}
do
#  ssh root@node1v$i "hostname && cd /root/node && git stash && git pull"
  echo "Updating node1v$i"
  scp server.js root@node1v$i:/root/node/server.js
done
