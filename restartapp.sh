#!/bin/bash

for i in {1..15}
do
  echo "Restarting node1v$i"
  ssh root@node1v$i "pkill node"
  ssh root@node1v$i "nohup /root/node/runnode.sh > /dev/null 2> /dev/null < /dev/null &"
done
