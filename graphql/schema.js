var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');
var BlobModel = require('../lib/blob_model.js');

module.exports.graphQlSchema = buildSchema(`
  type Query {
    blob(id: String!): Blob
  }
  
  type Mutation {
    createBlob(data: String!): Blob
  }
  
  type Blob {
    id: String
    data: String!
  }
`);

// The root provides a resolver function for each API endpoint
module.exports.graphQlRoot = {
  blob: ({id}) => {
    return BlobModel.getBlobByID(id).then( (results) => {
      return {
        id: id,
        data: results.blob
      };
    }).catch( (err) => {
      console.log(err);
      return null;
    });
  },
  
  createBlob: ({data}) => {
    // Attempt to save the blob
    return BlobModel.saveBlob(data).then( (id) => {
      // After it saves, read it's data to confirm it saved
      return BlobModel.getBlobByID(id);
    }).then((savedBlob) => {
      // Return the blob to client (but now with an ID)
      return {
        id: savedBlob.id,
        data: savedBlob.blob
      };
    }).catch( (err) => {
      // Something went wrong, the blob wasn't saved, send null, log error
      console.log(err);
      return null;
    });
  }
};
