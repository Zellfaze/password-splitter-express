var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var UsersModel = require('./users_model.js');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  isAuth: (req, res, next) => {
    if (!req.user) {return res.status(401).json({error: "Login Required"}); }
  
    return next();
  },
  setup: (app) => {
    // Setup Passport
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(expressSession({ secret: 'neocklfnziksdf55rasxcltobmrke4icdkq6qorngdjxh', resave: true, saveUninitialized: true }));
    app.use(passport.initialize());
    app.use(passport.session());
    
    passport.use(new LocalStrategy(
      function(username, password, done) {
        UsersModel.checkLogin(username, password).then( (user) => {
          // User not found
          if (user === false) { return done(null, false); }
          
          // User found
          return done(null, user);
        }).catch( (err) => {
          return done(err);
        });
      }
    ));

    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
      UsersModel.getById(id).then( (user) => {
        done(null, user);
      }).catch( (err) => {
        done(err);
      });
    });
    
    app.post('/login', 
      passport.authenticate('local'),
      function(req, res) {
        res.json({user: req.user.username});
      }
    );
    
    app.get('/login', module.exports.isAuth, (req, res) => {
      res.json({user: req.user.username});
    });
    
    app.get('/logout', function(req, res){
      req.logout();
      res.json({message: "Success"});
    });
    
    app.post('/register', (req, res) => {
      UsersModel.createNew(uuidv4(), req.body.username, req.body.password).then( (user) => {
        return res.json({username: user.username});
      }).catch( (err) => {
        console.log(err);
        return res.status(500).json({error: "Internal Server Error"});
      });;
      
    });
  }
}
