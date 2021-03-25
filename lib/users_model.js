var CryptoFunction = require('./crypto.js');
var SqlHelper = require('./sql.js');

class UserModel {
  getAll() {
    const query = "SELECT id FROM users;";
    return SqlHelper.all(query);
  }
  
  getById(id) {
    const query = "SELECT * FROM users WHERE id = $id;";
    return SqlHelper.get(query, {$id: id})
  }
  
  checkLogin(username, password) {
    // Get the user's info
    const query = "SELECT * FROM users WHERE username = $username;";
    return SqlHelper.get(query, {$username: username}).then( (user) => {
      if (user === undefined) { return false; }
      
      return CryptoFunction.hashPassword(password, user.salt, true).then( ({hash, salt}) => {
        if (hash === user.password) { return user; }
        return false;
      });
    });
  }
  
  changePassword(id, password) {
    const query = "UPDATE users SET password = $password, salt = $salt WHERE id = $id;";
    return CryptoFunction.hashPassword(password).then( ({hash, salt}) => {
      return SqlHelper.run(query, {$id: id, $password: hash, $salt: salt});
    });
  }
  
  deleteById(id) {
    const query = "DELETE FROM users WHERE id = $id;";
    return SqlHelper.run(query, {$id: id});
  }
  
  createNew(id, username, password) {
    // Hash the password
    return CryptoFunction.hashPassword(password).then( ({hash, salt}) => {
      const query = "INSERT INTO users (id, username, password, salt) VALUES ($id, $username, $password, $salt);";
      return SqlHelper.run(query, {$id: id, $username: username, $password: hash, $salt: salt});
    }).then( () => {
      return this.getById(id);
    });
  }
}

module.exports = new UserModel();
