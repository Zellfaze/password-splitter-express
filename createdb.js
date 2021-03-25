var sqlite3 = require('sqlite3').verbose();
var path = require('path');

console.log(path.resolve('./database/db.sqlite'));

var db = new sqlite3.Database(path.resolve('./database/db.sqlite'), (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE), (err) => {
  if (err !== null) {
    console.log(err);
    return
  }
  
  const blobtable = "CREATE TABLE IF NOT EXISTS blobs (id INT NOT NULL, blob TEXT NOT NULL, PRIMARY KEY (id));"
  const usertable = "CREATE TABLE IF NOT EXISTS users (id INT NOT NULL, username TEXT NOT NULL, password TEXT NOT NULL, salt TEXT NOT NULL, PRIMARY KEY (id))";
  db.run(blobtable);
  db.run(usertable);
  
  console.log("Done");
});
