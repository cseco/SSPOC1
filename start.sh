#!/bin/bash
export PORT=3001
while true; do
  nohup nodejs start.js
done &
