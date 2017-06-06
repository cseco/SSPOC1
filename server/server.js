//
// Copyright (c) Autodesk, Inc. All rights reserved
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
//
// Forge Extractor
// by Cyrille Fauvel - Autodesk Developer Network (ADN)
//
var express =require ('express') ;
var bodyParser =require ('body-parser') ;
var favicon =require ('serve-favicon') ;
var ejs =require ('./ejs') ;
var forgeToken =require ('./forge-token') ; // Force loading
var fileUpload =require ('./upload-flow') ;
var projects =require ('./projects') ;
var results =require ('./results') ;
//var decompress =require ('./decompress') ;
var forgeProxy =require ('./forge-proxy') ;
var Promise = require('promise');

var app =express () ;
//app.use (bodyParser.urlencoded ({ extended: true })) ; // Support encoded bodies
app.use (bodyParser.json ()) ;
app.use (express.static (__dirname + '/../www')) ;
app.use (favicon (__dirname + '/../www/favicon.ico')) ;
app.set ('view engine', 'ejs') ;
app.use ('/explore', ejs) ;
app.use ('/api', fileUpload) ;
app.use ('/api', projects) ;
app.use ('/api', results) ;
//app.use ('/decompress', decompress) ;
app.get ('/forge-proxy/*', forgeProxy.get) ;

app.set ('port', process.env.PORT || 80) ;


function simpleStringify (object){
    var simpleObject = {};
    for (var prop in object ){
        if (!object.hasOwnProperty(prop)){
            continue;
        }
        if (typeof(object[prop]) == 'object'){
            continue;
        }
        if (typeof(object[prop]) == 'function'){
            continue;
        }
        simpleObject[prop] = object[prop];
    }
    return JSON.stringify(simpleObject); // returns cleaned up JSON
};

app.get('/decompress', function (req, res) {

	var path = process.cwd();
  
  var filename = req.query.filename;
  var source = path+"/www/extracted/"+filename;
  var target = source.substring(0, source.length - 4);
  var extract = require('extract-zip')
  extract(source, {dir: target}, function (err) {
 // extraction is complete. make sure to handle the err 
 //assume no error
 	res.send(path+target+simpleStringify(filename)+err)
	});
})

app.get('/compare', function (req, res) {

  var path = process.cwd();
  
  var filename = req.query.filename;
  var source = path+"/www/extracted/"+filename;
  var target = source.substring(0, source.length - 4);
  
	var sqlite3 = require('sqlite3').verbose();
	var db = new sqlite3.Database(target+'/properties.db');
	console.log(target+'/properties.db')
	var fromdb = [];
	var fromcsv = [];
	var prevwaswithhandle = false;
	var prevwasvalidhandle = false;
	var handle;
	
	function dbdata()
	{
	return new Promise
	(
		function(resolve, reject)
		{
		db.each("SELECT id AS id, value FROM _objects_val", function(err, row) {
			console.log(row.id + ": " + row.value);
			
			
			if(prevwasvalidhandle == true && typeof row.value == "number")
			{
				//var re = /.*\[.*\]/;
				//console.log(handle+":"+row.value);
				fromdb.push(handle+":"+Math.round(row.value*1000000)/1000000);
				prevwasvalidhandle = false;
				//console.log("from db")
				console.log(fromdb);
			}

			if(prevwaswithhandle == true)
			{
				handle = row.value;
				prevwaswithhandle = false;
				prevwasvalidhandle = true;
			}

			var re = /.*\[.*\]/;
			var str = row.value;
			var found = re.test(str);
			if(found == true)prevwaswithhandle = true;

			resolve(fromdb);
			
		});
		//resolve(fromdb);
		})
	console.log("in db function");
	console.log("fromdb");
	}


	function csvdata()
	{
	return new Promise
	(
		function(resolve, reject)
		{
			var fs = require('fs'); 
			var parse = require('csv-parse');

			var csvData=[];
			
			var filename1 = filename.split("-");
			console.log(filename1)
			filename1 = filename1[1];
		    source = path+"/tmp/"+filename1;
		    source = source.substring(0, source.length - 4);
		    console.log(source);
		    source = source + ".csv";
		    var handleid = -1;
		    var lengthid = -1;
		    var shapeid = -1;
			fs.createReadStream(source)
				.pipe(parse({delimiter: ':'}))
				.on('data', function(csvrow) {
				//	console.log(csvrow);
					//do something with csvrow
					csvData.push(csvrow);  
					var str = JSON.stringify(csvrow);
					//console.log(str)
					var str = str.substring(2,str.length-2);
					var parts = str.split(",");
					if(handleid == -1)
					{
						parts.forEach(function(key, val)
						{
							console.log(key);
							if(key == "Handle")handleid = val;
							if(key == "length")lengthid = val;
							if(key == "Shape_Length")lengthid = val;
							if(key == "Shape_Area")shapeid = val;
						})
					}else
					{
						//console.log("................")
						str = parts[handleid]+":"+parts[lengthid];
						fromcsv.push(str);
						//console.log(fromcsv);
						//console.log(fromdb);
					}
					//console.log(parts[2]);      
			})
			.on('end',function() {
			//do something wiht csvData
			
			//console.log(csvData);
			//res.send(csvData)
			console.log("end of csvdata")
			resolve("...");
			});
			resolve("...");
			
		}
	);
	}
	
	/*	
	dbdata().then(function(response){
		console.log(response);
		console.log(fromdb);
		csvdata().then(function(response){
			console.log("is end");
			console.log(fromdb);
			console.log(fromcsv);
			res.send(csvData)
		});
		
		setTimeout (function () { extractionProgress () ; }, 1000) ;
		console.log("is results");
		console.log(response)
	});
	*/
	dbdata() ;
	csvdata();
	setTimeout (function () {  console.log(fromdb);
		fromdb = JSON.stringify(fromdb);
		fromcsv = JSON.stringify(fromcsv);
		if(fromdb == fromcsv)res.send("PASS");//res.send("Similar data<br>"+fromdb +"<br>"+ fromcsv);
		else res.send("FAIL");

	}, 1000) ;	//wait for async processed to finish
	
	
	//setTimeout (function () { console.log("waited") ; }, 10000) ;
});

module.exports =app ;