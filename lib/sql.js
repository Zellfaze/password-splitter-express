var sqlite3 = require('sqlite3').verbose();
var path = require('path');

const dbpath = path.resolve('./database/db.sqlite');

const SqlHelper = {
  get: get,
  run: run,
  all: all
}

function get(query, params = null) {
  return new Promise( (resolve, reject) => {
    // Open database connection
    let db = new sqlite3.Database(dbpath, (err) => {
      if (err !== null) { return reject(err); }
      
      //Query the database
      if (params === null) {
        db.get(query, (err, row) => {
          if (err !== null) { return reject(err); }
          return resolve(row);
        });
        return;
      }
      
      db.get(query, params, (err, row) => {
        if (err !== null) { return reject(err); }
        resolve(row);
      });
    });
  });
}

function run(query, params = null) {
  return new Promise( (resolve, reject) => {
    // Open database connection
    let db = new sqlite3.Database(dbpath, (err) => {
      if (err !== null) { return reject(err); }
      
      // Query the database
      if (params === null) {
        db.run(query, (err) => {
          if (err !== null) { return reject(err); }
          return resolve();
        });
        return;
      }
      
      db.run(query, params, (err) => {
        if (err !== null) { return reject(err); }
        return resolve();
      });
    });
  });
}

function all(query, params = null) {
  return new Promise( (resolve, reject) => {
    // Open database connection
    let db = new sqlite3.Database(dbpath, (err) => {
      if (err !== null) { return reject(err); }
      
      if (params === null) {
        let rows = [];
        db.each(query, (err, row) => {
          // Look at each row returned from query
          if (err !== null) { return reject(err); }
          rows.push(row);
        }, (err) => {
          // All rows have been returned
          if (err !== null) { return reject(err); }
          return resolve(rows);
        });
        return;
      }
      
      
      let rows = [];
      db.each(query, params, (err, row) => {
        // Look at each row returned from query
        if (err !== null) { return reject(err); }
        rows.push(row);
      }, (err) => {
        // All rows have been returned
        if (err !== null) { return reject(err); }
        return resolve(rows);
      });
      return;
    });
  });
}


module.exports = SqlHelper;
