var express = require('express');
var router = express.Router();
var CryptoFunction = require('../lib/crypto.js');
var BlobModel = require('../lib/blob_model.js');

/* GET users listing. */
router.get('/', function(req, res, next) {
  //BlobModel.getBlobList().then( (result) => { console.log(result) });
  CryptoFunction.generateBlob('lol', 2, 2, [{username: "1", password: "2"},{username: "3", password: "4"}]).then( (blob) => {
    return BlobModel.saveBlob(blob);
  }).then( () => {
    console.log("Success");
  }).catch( (err) => {
    console.log(err);
  });
  returnApiData(req, res, 'respond with a resource');
});

router.get('/list/', function(req, res, next) {
  BlobModel.getBlobList().then( (result) => {
    returnApiData(req, res, result);
  }).catch( (err) => {
    console.log(err);
    returnApiData(req, res, "Internal Server Error", 500);
  });
});

router.get('/get/:id', function(req, res, next) {
  BlobModel.getBlobByID(req.params.id).then( (blob) => {
    returnApiData(req, res, blob);
  }).catch( (err) => {
    // Check if the file simply didn't exist
    if (err.code == "ENOENT") {
      return returnApiData(req, res, "File not found", 404);
    }
    
    // Alright, now we have a bigger problem...
    console.log(err);
    returnApiData(req, res, "Internal Server Error", 500);
  });
});

router.post('/store/', function(req, res, next) {
  //Save the blob
  BlobModel.saveBlob(req.body.blob).then( (id) => {
    returnApiData(req, res, {id: id}, 201);
  }).catch( (err) => {
    // Check if their blob was invalid
    if (err.message == "Not a valid blob!") {
      return returnApiData(req, res, "Error: Invalid blob!", 400);
    }
    
    // Alright, now we have a bigger problem...
    console.log(err);
    returnApiData(req, res, "Internal Server Error", 500);
  });
});

module.exports = router;


function returnApiData(req, res, data, status=200) {
  let textData 
  if (typeof data == "object") {
    textData = JSON.stringify(textData);
  } else {
    textData = data;
  }
  
  
  switch (req.accepts(['json', 'html'])) {
    
    
    case 'json':
      res.json({status: status, data: data});
      break;
    case 'html':
      res.render('apiresponse', { data: textData });
      break;
    default:
      res.send(textData);
      break;
  }
}
