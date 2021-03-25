var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mustacheExpress = require('mustache-express');
var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');
var {graphQlSchema, graphQlRoot} = require('./graphql/schema.js');
var PassportHelper = require('./lib/passport.js');

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');

var app = express();

// Check enviornment
var graphIqlEnabled = false;
if (app.settings.env === "development") {
  graphIqlEnabled = true;
}

// view engine setup
app.engine('mustache', mustacheExpress());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'mustache');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

PassportHelper.setup(app);

console.log(app.settings.env);

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/graphql', PassportHelper.isAuth, graphqlHTTP({
  schema: graphQlSchema,
  rootValue: graphQlRoot,
  graphiql: graphIqlEnabled,
}));

module.exports = app;
