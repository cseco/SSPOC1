var Promise = require('es6-promise');
var express = require('express');
var app = express();

var should = require('chai').should(),
Lmv = require('./view-and-data'),
path = require('path'),
fs = require('fs');
var config = {
	// change that bucket name
	defaultBucketKey: 'tmpe-bucket',
	// change that to your own keys or system variables
	credentials: {
		clientId: "i3hLiqZHP15mnAewcBjlG__o",
		clientSecret: "lpF0clientSecret4__"
	},

	// see: https://developer.autodesk.com/en/docs/oauth/v2/overview/scopes
	scope: [
	'data:read',
	'data:create',
	'data:write',
	'bucket:read',
	'bucket:create'
	]
}


var Futures = require("futures");
var sequence = Futures.sequence();
var lmv = new Lmv(config);

var formidable = require('formidable');

/*var mysql = require('mysql');

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : ''
});

*/

//path to other pages & files
var options = {
  index: "home.html"
};
app.use('/', express.static('public', options));


app.get('/', function (req, res) {
	res.send("Fetching page");
});

app.get('/oauth', function (req, res) {
	query = req.query;
	console.log(query);
	if(query.clientid == undefined || query.clientsecret == undefined)res.send(JSON.stringify({"statusCode":200}));
	else
	{
	config.credentials.clientId = query.clientid;
	config.credentials.clientSecret = query.clientsecret;
	oauth().then(function(response){res.send(response)});
	}
});


app.get('/bucket', function (req, res) {
	query = req.query;
	console.log(query);
	if(query.token == undefined)res.send(JSON.stringify({"statusCode":400}));
	else
	{
	lmv.setToken(query.token);
	bucket(query.bucket).then(function(response){console.log(response);console.log(JSON.stringify(response));res.send(response);console.log("sent");});
	}
});

app.post('/upload', function(req, res){
	console.log("is upload");
  // create an incoming form object
  var form = new formidable.IncomingForm();
  // specify that we want to allow the user to upload multiple files in a single request
  form.multiples = true;
  // store all uploads in the /uploads directory
  form.uploadDir = path.join(__dirname, '/uploads');
  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });

  // log any errors that occur
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // once all the files have been uploaded, send a response to the client
  form.on('end', function() {
  	 //upload to forge
    res.end('success');
  });

  // parse the incoming request containing the form data
  form.parse(req);

});


app.get('/forgeupload', function (req, res) {
	query = req.query;
	if(query.filename == undefined || query.bucket == undefined|| query.token == undefined)res.send(JSON.stringify({"statusCode":400}));
	else
	{
		lmv.setToken(query.token);
		lmv.upload(path.join(__dirname, './uploads/'+query.filename),
          query.bucket,
          query.filename).then(
          	function(response){
          		var fileId = response.objects[0].id;
        			urn = lmv.toBase64(fileId);
        			response = {"urn":urn};
        			console.log(response);
          	res.send(JSON.stringify(response));
          	
          	},function(error){res.send(JSON.stringify(error));}
          );
	}
});

app.get('/translate', function (req, res) {
	query = req.query;
	console.log("is translate");
	console.log(query);
	if(query.urn == undefined || query.token == undefined)res.send(JSON.stringify({"statusCode":400}));
	else
	{
		lmv.setToken(query.token);
		lmv.register(query.urn, true).then(
			function(response){
				if (response.Result === "Success") {
					//console.log(response);
					console.log('Translating file...');
					lmv.checkTranslationStatus(
					query.urn, 1000 * 60 * 5, 1000 * 10,
					progressCallback).then(
							  function(response){res.send(JSON.stringify({"done":"true"}))},
							  function(error){res.send(JSON.stringify(error));}
							  );
				}
				else {
				console.log(response);
				}
			},function(error){res.send(JSON.stringify(error));}
          );
	}
});

app.get('/modelview', function (req, res) {
	query = req.query;
	console.log("is model view");
	console.log(query);
	if(query.urn == undefined || query.token == undefined)res.send(JSON.stringify({"statusCode":400}));
	else
	{
		lmv.setToken(query.token);
		lmv.modelView(query.urn, true).then(
			function(response){
				response = response.data;
				response = response.metadata;
				if(response == undefined)res.send(JSON.stringify({"statusCode":404}));
				var guid = response[0].guid;
				console.log("guid:"+guid);
				//res.send(JSON.stringify(response[0]));
				//res.send(response[0]);
				res.send({"guid":guid});
				//console.log(response[0]);
			},function(error){res.send(JSON.stringify(error));}
          );
	}
});

app.get('/objecttree', function (req, res) {
	query = req.query;
	console.log("is object tree");
	console.log(query);
	if(query.urn == undefined || query.token == undefined || query.guid == undefined)res.send(JSON.stringify({"statusCode":400}));
	else
	{
		lmv.setToken(query.token);
		lmv.objectTree(query.urn, query.guid).then(
			function(response){
				if(response.data.objects == undefined)res.send(JSON.stringify({"statusCode":400}));
				console.log(JSON.stringify(response.data.objects));
				//res.send(JSON.stringify(response.data.objects));
				res.send(response.data.objects);
				console.log(response.data.objects);
				console.log("is end of guid");
			},function(error){res.send(JSON.stringify(error));}
          );
	}
});

function progressCallback(progress) { console.log("working");console.log(progress);  }

app.get('/objfile', function (req, res) {
	query = req.query;
	console.log("is objfile");
	console.log(query);
	if(query.urn == undefined || query.token == undefined || query.guid == undefined || query.ids == undefined)res.send(JSON.stringify({"statusCode":400}));
	else
	{
		lmv.setToken(query.token);
		lmv.objfile(query.urn, query.guid, query.ids).then(
			function(response){
				if(response.data.objects == undefined)res.send(JSON.stringify({"statusCode":400}));
				console.log(JSON.stringify(response));
				res.send(response);
				console.log(response);
				console.log("is end of objfile");
			},function(error){res.send(JSON.stringify(error));}
          );
	}
});

var port = 1880;
app.listen(port, function () {
  console.log('SPOCK listening on port '+port+'!');
})


////////////////////////////////////////
///////////////////////////////////////
////////////////////////////////////////
function onError(error) {
	var promise = new Promise
	(function(resolve, reject)
	{
		reject(error);
	});
	return promise;
}

function oauth()
{
	console.log("init...");
	var promise = new Promise
	(
	function(resolve, reject)
	{
		lmv.initialize().then(
			function(response){console.log(response.access_token);resolve(response);}, 
			function(error){resolve(JSON.stringify(error))}
		);
	}
	);
	return promise;
}


function bucket(bucket)
{
	console.log("bucket||||||...");
	var createIfNotExists = true;
	var bucketCreationData = {
		bucketKey: config.defaultBucketKey,
		servicesAllowed: {},
		policy: 'transient' //['temporary', 'transient', 'persistent'] 
	};
	if(bucket != undefined)bucketCreationData.bucketKey = bucket;
	var promise = new Promise
	(
	function(resolve, reject)
	{
		lmv.getBucket(bucketCreationData.bucketKey,createIfNotExists,bucketCreationData).then(
			function(response){
			
			/*console.log("resp:"+JSON.stringify(response));
			for (var key in response) {
			  if (response.hasOwnProperty(key)) {
				 console.log(key + " -> " + response[key]);
			  }
			}*/

			console.log("resp:"+JSON.stringify(response));
			resolve(JSON.stringify(response));
			
			}, 
			function(error){resolve(JSON.stringify(error))}
		);
	}
	);
	return promise;
}
