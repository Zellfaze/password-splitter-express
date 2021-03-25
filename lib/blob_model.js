var secrets = require('secrets.js-grempe'); //TODO: Replace with something in CryptoFunction
var CryptoFunction = require('./crypto.js');
var SqlHelper = require('./sql.js');

var BlobModel = {
  getBlobList: getBlobList,
  getBlobByID: getBlobByID,
  saveBlob: saveBlob
};

// Returns a Promise to get an array of every blob
function getBlobList() {
  return SqlHelper.all("SELECT * FROM blobs;");
}


// Returns a Promise to get a blob from the database
// {id, blob}
function getBlobByID(id) {
  return SqlHelper.get("SELECT * FROM blobs WHERE id = $id;", {$id: id});
}

// Returns a Promise to save the blob
function saveBlob(blob, id = null) {
  // Generate an ID if needed
  if (id === null) {
    id = generateID();
  }
  
  // Make sure blob is valid
  if (!CryptoFunction.validateBlob(blob)) {
    return Promise.reject(new Error("Not a valid blob!"));
  }
  
  return SqlHelper.run("INSERT INTO blobs (id, blob) VALUES ($id, $blob);", {$id: id, $blob: blob}).then( () => {
    return id;
  });
}

function generateID() {
  return secrets.random(64);
}

module.exports = BlobModel;
