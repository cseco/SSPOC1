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
var request =require ('request') ;
var fs =require ('fs') ;
var multipart =require ('connect-multiparty') ;
var bodyParser =require ('body-parser') ;
var AdmZip =require ('adm-zip') ;
var utils =require ('./utils') ;
var flow =require ('./flow-node.js') ('tmp') ;

var ACCESS_CONTROLL_ALLOW_ORIGIN =false ;

var router =express.Router () ;

router.get ('/decompress', function (req, res) {
	//console.log ('GET', req) ;
	console.log(req);
	var identifier =req.url.split ('/') [2] ;
	fs.readFile ('data/' + identifier + '.json', function (err, data) {
		if ( err )
			return (res.status (404).send ()) ; //- 404 Not Found
		data =JSON.parse (data) ;
		//res.setHeader ('Content-Type', 'application/json') ;
		res.json (data) ;
	}) ;
	 res.send('GET request to the homepage')
}) ;

module.exports =router ;
