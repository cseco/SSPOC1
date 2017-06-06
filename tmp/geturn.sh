#!/bin/bash

result='{"type":"manifest","hasThumbnail":"false","status":"failed","progress":"complete","region":"US","urn":"dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Ym1pbmVhcmJ1Y2tldC9NRVRFT1JTVUJESVZJU0lPTlBMQU4xLmR3Zw","version":"1.0","derivatives":[{"name":"METEORSUBDIVISIONPLAN1.dwg","hasThumbnail":"false","status":"failed","progress":"complete","messages":[{"type":"error","code":"AutoCAD-InvalidFile","message":"Sorry, the drawing file is invalid and cannot be viewed. 
- Please try to recover the file in AutoCAD, and upload it again to view."},{"type":"error","message":"Unrecoverable exit code from extractor: -1073741831","code":"TranslationWorker-InternalFailure"}],"outputType":"svf"}]}
'
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
	"inprogress");;
	"pending");;
	"success");;	
	esac
}
getJobStatusString
getJobStatus

