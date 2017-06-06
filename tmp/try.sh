#!/bin/bash

result='{"access_token":"sGgBZ9yHTvEz5mebCgIEayENCS1x","token_type":"Bearer","expires_in":86399}'

echo $result

tmp=$(echo $result|sed 's/{"access_token"\:"//')
tmp=$(echo $tmp|sed 's/"[^ ]*//g')
accesstoken=$(echo $tmp|sed 's/"[^ ]*//g')
echo $tmp
