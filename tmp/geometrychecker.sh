#!/bin/bash
#
# DWG file geometry check using autodesk Model derivative API
#

###Get credentials from config/config
getCredentials()
{
configFile="../config/config"
while read -r line
do
	item=$(echo $line|grep "Client-ID:")
	if [ "$item" != "" ]
	then
		clientid=$(echo $line|cut -c 11-)
	fi
	item=$(echo $line|grep "Client-Secret:")
	if [ "$item" != "" ]
	then
		clientsecret=$(echo $line|cut -c 15-) 
	fi
done < "$configFile"
if [ "$clientid" = "" ]
then
	echo "Fatal: No client-id found"
	exit
fi
if [ "$clientsecret" = "" ]
then
	echo "Fatal: No client-secret found"
	exit
fi
echo "Client-ID:$clientid"
echo "Client-Secret:$clientsecret"
}

oauth()
{
	echo "Performing autodesk authentication with credentials found.\n..\n..."
	result=$(curl \
-v "https://developer.api.autodesk.com/authentication/v1/authenticate" \
-X "POST" \
-H "Content-Type: application/x-www-form-urlencoded" \
-d "client_id=$clientid&client_secret=$clientsecret&grant_type=client_credentials&scope=bucket:create%20bucket:read%20data:write%20data:read")
	
	#echo $result
	tmp=$(echo $result|sed 's/{"access_token"\:"//')
	accesstoken=$(echo $tmp|sed 's/"[^ ]*//g')
	echo "access token: "$accesstoken
}

bucketexists()
{
	bucketname=$1
	result=$(curl \
	-v "https://developer.api.autodesk.com/oss/v2/buckets/$bucketname/details"\
	-X GET \
	-H "Authorization: Bearer $accesstoken")
	 
}
createbucket()
{
	echo "Require bucket name to create bucket"
	bucketname="bminearbucket"
	policyKey="persistent" #transient expires after 24 hours. Others: temporary, persistent
	curl \
	-v "https://developer.api.autodesk.com/oss/v2/buckets"\
  -X "POST"\
  -H "Content-Type: application/json"\
  -H "Authorization: Bearer $accesstoken"\
  -d "{\"bucketKey\":\"$bucketname\",\"policyKey\":\"$policyKey\"}"
  
  #check if successfully created
  result=""
  bucketexists $bucketname
  
  success=$(echo $result|grep $bucketname)
  if [ "$success" = "" ]
  then
  	echo "Bucket could not be read"
  	echo $result
  	exit
  fi
}

uploadfile()
{
	echo "Require file and filename to upload"
	filename="visualization_-_aerial.dwg"
	folder="../dwgfiles/"
	uploadfile=$folder$filename
	filename=$(echo $filename|sed 's/ //g')
	result=$(curl \
	-v "https://developer.api.autodesk.com/oss/v2/buckets/$bucketname/objects/$filename"\
   -X PUT \
   -H "Authorization: Bearer $accesstoken"\
   #-H "Content-Type: application/octet-stream"\	#text/plain, etc
  # -H "Content-Length: 308331" \#Most clients add this header automatically, so you should only set it explicitly if necessary.
   -T "$uploadfile")
   
     
  
   #Check successful upload
	success=$(echo $result|grep $bucketname)
	if [ "$success" = "" ]
	then
		echo "Bucket could not be read"
		echo $result
		exit
	fi
}

getobjid()
{
	objectid=""
	line=$(echo $result|sed 's/,[^\n]*//')
	objectid=$(echo $line|grep objectId)
	if [ "$objectid" = "" ]
	then
		result=$(echo $result|sed 's/,/\n\r/')	
		#echo $result
		sleep 1
		getobjid
	fi
	objectid=$(echo $objectid|sed 's/ //g')	
	objectid=$(echo $objectid|sed 's/[^ :]*://')	
	objectid=$(echo $objectid|sed 's/"//g')
	#base64objectid=$(echo $objectid | base64 -w 0)
	base64urlencode $objectid
	
}

base64urlencode()
{
	base64objectid=$(echo -n "$1" | openssl enc -a -A | tr -d '=' | tr '/+' '_-')
}
	
base64urldecode()
{
	_l=$((${#1} % 4))
	if [ $_l -eq 2 ]; then _s="$1"'=='
	elif [ $_l -eq 3 ]; then _s="$1"'='
	else _s="$1" ; fi
	decodedstr=$(echo "$_s" | tr '_-' '/+' | openssl enc -d -a -A)
}

sourceFiletoSVF()
{
	result=$(curl \
	-X "POST" \
	-H "Authorization: Bearer $accesstoken" \
	-H 'Content-Type: application/json' \
	-v "https://developer.api.autodesk.com/modelderivative/v2/designdata/job"\
	 -d "{
   \"input\": {
     \"urn\": \"$base64objectid\"},
   \"output\": {
     \"formats\": [
       {
         \"type\": \"svf\",
         \"views\": [
           \"2d\",
           \"3d\"
         ]
       }
     ]
    }
    }")
    
	iresult=$(echo $result|grep result)
	if [ "$iresult" = ""]
	then
		echo "Failed to convert"
		echo $result
	fi
	iresult=$(echo $result |sed 's/{//g')
	iresult=$(echo $iresult |sed 's/,[^ ]*//g')
	iresult=$(echo $iresult |sed 's/"//g')
	iresult=$(echo $iresult |sed 's/[^:]*://g')
	
	case "$iresult" in
	"failed")
		echo "Failed to convert"
		echo $result
		exit;;
	"timeout")
		echo "Failed to convert"
		echo $result
		exit;;	
	"inprogress");;
	"pending");;
	"success");;	
	esac
}

verifyjobComplete()
{
	result=$(curl \
	-X "GET" \
	-H "Authorization: Bearer $accesstoken" \
	-v "https://developer.api.autodesk.com/modelderivative/v2/designdata/$base64objectid/manifest")
	#echo $result
	goodresult=$(echo $result|grep status)
	if [ "$goodresult" = "" ]
	then
		echo "Failed to convert"
		echo $result
		exit
	fi
	getJobStatusString
}

getJobStatusString()
{
	if [ "$tresult" = "" ]
	then
		tresult=$result
	fi
	line=$(echo $tresult|sed 's/,[^\n]*//')
	status=$(echo $line|grep status)
	if [ "$status" = "" ]
	then
		tresult=$(echo $tresult|sed 's/,/\n\r/')	
		getJobStatusString
	fi	
		status=$(echo $status|sed 's/ //g')	
		status=$(echo $status|sed 's/[^ :]*://')	
		jobstatus=$(echo $status|sed 's/"//g')
}

getJobStatus()
{
	case "$jobstatus" in
	"failed")
		echo "Failed to convert"
		echo $result
		exit;;
	"timeout")
		echo "Failed to convert"
		echo $result
		exit;;	
	"success");;
	# "inprogress");;
	"pending|inprogress")
		#verifyjobComplete
		echo "Job processing... Will wait for 10 secs"
		sleep 10
		loopcount=$(echo "$loopcount+1" | bc)
		verifyjobComplete
		getJobStatusString
		getJobStatus
		if (( loopcount > maxloops ))
		#if [ "$loopcount" -gt "maxloops" ]
		then
			echo "Timeout..."
			exit
		fi
	;; #wait
		
	esac
}


getguidbac()
{
	if [ "$tresult" = "" ]
	then
		tresult=$result
	fi
	line=$(echo $tresult|sed 's/,[^\n]*//')
	status=$(echo $line|grep guid)
	if [ "$status" = "" ]
	then
		tresult=$(echo $tresult|sed 's/,/\n\r/')	
		getJobStatusString
	fi	
		status=$(echo $status|sed 's/ //g')	
		status=$(echo $status|sed 's/[^ :]*://')	
		guidstring=$(echo $status|sed 's/"//g')
}

getguid()
{
	
	if [ "$tresult" = "" ]
	then
		tresult=$result
	fi

	line=$(echo $tresult|sed 's/,[^\n]*//')
	guidstring=$(echo $line|grep guid)
	#echo $status
	if [ "$guidstring" = "" ]
	then
		tresult=$(echo $tresult|sed 's/[^,]*,//')	
		echo $tresult
		getguid
	else
		#echo $guidstring
		#echo $guidstring>/tmp/guidstring
		#exit
		guidstring=$(echo $guidstring|sed 's/:"/\n\r/g')
		#echo $guidstring>/tmp/guidstring
		guidstring=$(echo $guidstring|sed 's/"[^ ]*//g')
		guidstring=$(echo $guidstring|sed 's/[\n\r]*//g')
	#	echo $guidstring>/tmp/guidstring
	#	guidstring=""
	#	exit
	#	status=$(echo $status|sed 's/"/\n\r/g')
		#status=$(echo $status|sed 's/}[]/\n\r/g')
		#echo "After replacing"
		
	fi	
}


modelViewIDS()
{
	result=$(curl \
	-X "GET" \
	-H "Authorization: Bearer $accesstoken" \
	-v "https://developer.api.autodesk.com/modelderivative/v2/designdata/$base64objectid/metadata")
	echo $result
	#exit
	#Assume good results
}


getobjectTree()
{
	getguid
	result=$(curl \
	-X "GET" \
	-H "Authorization: Bearer $accesstoken" \
	-v "https://developer.api.autodesk.com/modelderivative/v2/designdata/$base64objectid/metadata/$guidstring")
	#Assume good results
	echo "https://developer.api.autodesk.com/modelderivative/v2/designdata/$base64objectid/metadata/$guidstring"
}
	
#
##main
###Execution always starts here
main()
{
	loopcount=0
	maxloops=12 #two minutes to wait for conversion 
	getCredentials
	oauth
	createbucket
	#uploadfile #already uploaded 
	#getobjid	#we have this already
	#sourceFiletoSVF
	#verifyjobComplete
	# convert using node client
	#getJobStatus
	#https://developer.api.autodesk.com/modelderivative/v2/designdata/dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6dG1wLWJ1Y2tldC92aXN1YWxpemF0aW9uXy1fYWVyaWFsLmR3Zw==/metadata

	base64objectid="dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6dG1wLWJ1Y2tldC9IU0NSRU4uRFdH"
	echo "modelViewIDs"
	#sleep 5
	modelViewIDS
	echo "object Tree"
	#echo $result
	#exit
	#sleep 5
	guidstring=""
	getobjectTree ########
	echo $result
	#echo $base64objectid
}

main

#More
#upload actual file
#check for failures
#

