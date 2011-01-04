#!/bin/bash

for i in {1..15}
do
  ssh root@node1v$i "hostname && pkill node && rm /root/node/server.js && cd /root/node && git pull"
done
