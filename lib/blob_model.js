var sqlite3 = require('sqlite3').verbose();
var path = require('path');
var secrets = require('secrets.js-grempe'); //TODO: Replace with something in CryptoFunction
var CryptoFunction = require('./crypto.js');

const dbpath = path.resolve('./database/db.sqlite');

var BlobModel = {
  getBlobList: getBlobList,
  getBlobByID: getBlobByID,
  saveBlob: saveBlob
};

// Returns a Promise to get an array of every blob
// Please be gentle with this function, it reads every file in blobs/
function getBlobList() {
  const query = "SELECT * FROM blobs;";
  return new Promise( (resolve, reject) => {
    
    // Open database connection
    let db = new sqlite3.Database(dbpath, (err) => {
      if (err !== null) { return reject(err); }
      
      let rows = [];
      db.each(query, (err, row) => {
        // Look at each row returned from query
        if (err !== null) { return reject(err); }
        rows.push(row.id);
      }, (err) => {
        // All rows have been returned
        if (err !== null) { return reject(err); }
        resolve(rows);
      });
    });
  });
}


// Returns a Promise to get a blob from the disk
// {id, blob}
function getBlobByID(id) {
  const query = "SELECT * FROM blobs WHERE id = $id;";
  
  return new Promise( (resolve, reject) => {
    // Open database connection
    let db = new sqlite3.Database(dbpath, (err) => {
      if (err !== null) { return reject(err); }
      
      //Query the database
      db.get(query, {$id: id}, (err, row) => {
        if (err !== null) { return reject(err); }
        resolve(row);
      });
    });
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
  
  const query = "INSERT INTO blobs (id, blob) VALUES ($id, $blob);";
  
  return new Promise( (resolve, reject) => {
    // Open database connection
    let db = new sqlite3.Database(dbpath, (err) => {
      if (err !== null) { return reject(err); }
      
      // Create the user
      db.run(query, {$id: id, $blob: blob}, (err) => {
        if (err !== null) { return reject(err); }
        resolve(id);
      });
    });
  });
}

function generateID() {
  return secrets.random(64);
}

module.exports = BlobModel;
