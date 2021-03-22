var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mustacheExpress = require('mustache-express');
var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');
var {graphQlSchema, graphQlRoot} = require('./graphql/schema.js');

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');

var app = express();

// view engine setup
app.engine('mustache', mustacheExpress());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'mustache');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/graphql', graphqlHTTP({
  schema: graphQlSchema,
  rootValue: graphQlRoot,
  graphiql: true,
}));

module.exports = app;
