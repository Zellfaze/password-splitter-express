// Includes
const fs = require('fs');
const fsp = fs.promises;
const path = require("path");
var secrets = require('secrets.js-grempe'); //TODO: Replace with something in CryptoFunction
var CryptoFunction = require('./crypto.js');

const blobDirectory = path.resolve("./blobs/");

var BlobModel = {
  getBlobList: getBlobList,
  getBlobByID: getBlobByID,
  saveBlob: saveBlob
};

// Returns a Promise to get an array of every blob
// Please be gentle with this function, it reads every file in blobs/
function getBlobList() {
  return fsp.readdir(blobDirectory).then( (files) => {
    // Check if each file is valid
    let blobPromises = files.map( (currentFile) => {
      return getBlobByID(currentFile);
    });
    
    return Promise.allSettled(blobPromises);
  }).then( (blobPromises) => {
    // Filter out all the invalid files.
    let validBlobs = [];
    
    blobPromises.forEach( (currentPromise) => {
      if (currentPromise.status == "rejected") {return;}
      validBlobs.push(currentPromise.value);
    });
    
    // Get blob IDs
    return validBlobs.map( (currentBlob) => {
      return currentBlob.id;
    });
  }).catch( (err) => {
    return Promise.reject(err);
  });
}

// Returns a Promise to get a blob from the disk
// {id, blob}
function getBlobByID(id) {
  return fsp.readFile(path.resolve(blobDirectory, id), "utf8").then( (fileContents) => {
    //Validate the file contents
    if (!CryptoFunction.validateBlob(fileContents)) {
      return Promise.reject(new Error("File is not a valid blob!"));
    }
    
    return {
      id: id,
      blob: fileContents
    };
  }).catch( (err) => {
    return Promise.reject(err);
  });
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
  
  // Save the blob
  return fsp.open(path.resolve(blobDirectory, id), "w").then( (fileHandle) => {
    return fileHandle.writeFile(blob, "utf8").then( () => {
      fileHandle.close();
      return id;
    });
  }).catch( (err) => {
    fileHandle.close();
    return Promise.reject(err);
  });
}

function generateID() {
  return secrets.random(64);
}

module.exports = BlobModel;
