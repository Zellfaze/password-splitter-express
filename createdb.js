var sqlite3 = require('sqlite3').verbose();
var path = require('path');

console.log(path.resolve('./database/db.sqlite'));

var db = new sqlite3.Database(path.resolve('./database/db.sqlite'), (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE), (err) => {
  if (err !== null) {
    console.log(err);
    return
  }
  
  let blobtable = "CREATE TABLE IF NOT EXISTS blobs (id INT, blob TEXT, PRIMARY KEY (id));"
  db.run(blobtable);
  
  console.log("Done");
});
