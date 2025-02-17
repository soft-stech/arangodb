/* jshint strict: false, unused: false */
/* global TRANSACTION, AQL_PARSE */

// //////////////////////////////////////////////////////////////////////////////
// / @brief ArangoDatabase
// /
// / @file
// /
// / DISCLAIMER
// /
// / Copyright 2013 triagens GmbH, Cologne, Germany
// /
// / Licensed under the Apache License, Version 2.0 (the "License")
// / you may not use this file except in compliance with the License.
// / You may obtain a copy of the License at
// /
// /     http://www.apache.org/licenses/LICENSE-2.0
// /
// / Unless required by applicable law or agreed to in writing, software
// / distributed under the License is distributed on an "AS IS" BASIS,
// / WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// / See the License for the specific language governing permissions and
// / limitations under the License.
// /
// / Copyright holder is triAGENS GmbH, Cologne, Germany
// /
// / @author Achim Brandt
// / @author Dr. Frank Celler
// / @author Copyright 2012-2013, triAGENS GmbH, Cologne, Germany
// //////////////////////////////////////////////////////////////////////////////

module.isSystem = true;

const internal = require('internal');
const _ = require('lodash');

// //////////////////////////////////////////////////////////////////////////////
// / @brief constructor
// //////////////////////////////////////////////////////////////////////////////

exports.ArangoDatabase = internal.ArangoDatabase;

let ArangoDatabase = exports.ArangoDatabase;

// must be called after export
const ArangoCollection = require('@arangodb/arango-collection').ArangoCollection;
const ArangoError = require('@arangodb').ArangoError;
const ArangoStatement = require('@arangodb/arango-statement').ArangoStatement;

// //////////////////////////////////////////////////////////////////////////////
// / @brief prints a database
// //////////////////////////////////////////////////////////////////////////////

ArangoDatabase.prototype._PRINT = function (context) {
  context.output += this.toString();
};

// //////////////////////////////////////////////////////////////////////////////
// / @brief strng representation of a database
// //////////////////////////////////////////////////////////////////////////////

ArangoDatabase.prototype.toString = function (seen, path, names, level) {
  return '[ArangoDatabase "' + this._name() + '"]';
};

// //////////////////////////////////////////////////////////////////////////////
// / @brief factory method to create a new statement
// //////////////////////////////////////////////////////////////////////////////

ArangoDatabase.prototype._createStatement = function (data) {
  return new ArangoStatement(this, data);
};

// //////////////////////////////////////////////////////////////////////////////
// / @brief factory method to create and execute a new statement
// //////////////////////////////////////////////////////////////////////////////

ArangoDatabase.prototype._query = function (query, bindVars, cursorOptions, options) {
  let payload = {
    query,
    bindVars: bindVars || undefined
  };

  if (query && typeof query === 'object' && typeof query.toAQL !== 'function') {
    payload = query;
    options = cursorOptions;
    cursorOptions = bindVars;
  }
  if (options === undefined && cursorOptions !== undefined) {
    options = cursorOptions;
  }

  if (options) {
    payload.options = options || undefined;
    payload.cache = (options && options.cache) || undefined;
  }
  if (cursorOptions) {
    payload.count = (cursorOptions && cursorOptions.count) || false;
    payload.batchSize = (cursorOptions && cursorOptions.batchSize) || undefined;
  }

  return new ArangoStatement(this, payload).execute();
};

const buildQueryPayload = (query, bindVars, options) => { 
  let payload = {};
  
  if (typeof query === 'object' && query.hasOwnProperty('query')) {
    payload = query;
  } else {
    payload = { query, bindVars, options };
  }
  // query
  if (typeof payload.query === 'object' && typeof payload.query.toAQL === 'function') {
    payload.query = payload.query.toAQL();
  }
  if (payload.options) {
    // options may be modified by the caller later
    payload.options = _.clone(payload.options);
  } else {
    payload.options = {};
  }
  return payload;
};

// //////////////////////////////////////////////////////////////////////////////
// / @brief queryProfile execute a query with profiling information
// //////////////////////////////////////////////////////////////////////////////

ArangoDatabase.prototype._profileQuery = function (query, bindVars, options) {
  let payload = buildQueryPayload(query, bindVars, options);
  payload.options.profile = 2;
  require('@arangodb/aql/explainer').profileQuery(payload);
};

// //////////////////////////////////////////////////////////////////////////////
// / @brief explains a query
// //////////////////////////////////////////////////////////////////////////////

ArangoDatabase.prototype._explain = function (query, bindVars, options) {
  let payload = buildQueryPayload(query, bindVars, options);
  require('@arangodb/aql/explainer').explain(payload);
};

// //////////////////////////////////////////////////////////////////////////////
// / @brief parses a query
// //////////////////////////////////////////////////////////////////////////////

ArangoDatabase.prototype._parse = function (query) {
  if (typeof query === 'object' && typeof query.toAQL === 'function') {
    query = query.toAQL();
  }

  return AQL_PARSE(query);
};

ArangoDatabase.prototype._executeTransaction = function (data) {
  if (data && typeof data === 'object') {
    data = Object.assign({}, data);
    if (data.collections && typeof data.collections === 'object') {
      data.collections = Object.assign({}, data.collections);
      if (data.collections.read) {
        if (!Array.isArray(data.collections.read)) {
          data.collections.read = [data.collections.read];
        }
        data.collections.read = data.collections.read.map(
          col => col.isArangoCollection ? col.name() : col
        );
      }
      if (data.collections.write) {
        if (!Array.isArray(data.collections.write)) {
          data.collections.write = [data.collections.write];
        }
        data.collections.write = data.collections.write.map(
          col => col.isArangoCollection ? col.name() : col
        );
      }
    }
  }
  return TRANSACTION(data);
};

ArangoDatabase.prototype._drop = function (name, options) {
  var collection = name;

  if (!(name instanceof ArangoCollection)) {
    collection = internal.db._collection(name);
  }

  if (collection === null) {
    return;
  }

  try {
    return collection.drop(options);
  } catch (err) {
    // ignore if the collection does not exist
    if (err instanceof ArangoError &&
      err.errorNum === internal.errors.ERROR_ARANGO_DATA_SOURCE_NOT_FOUND.code) {
      return;
    }
    // rethrow exception
    throw err;
  }
};

ArangoDatabase.prototype._truncate = function (name) {
  var collection = name;

  if (!(name instanceof ArangoCollection)) {
    collection = internal.db._collection(name);
  }

  if (collection === null) {
    return;
  }

  collection.truncate();
};

// //////////////////////////////////////////////////////////////////////////////
// / @brief index id regex
// //////////////////////////////////////////////////////////////////////////////

ArangoDatabase.indexRegex = /^([a-zA-Z0-9\-_]+)\/([a-zA-Z0-9\-_]+)$/;

ArangoDatabase.prototype._index = function (id) {
  if (id.hasOwnProperty('id')) {
    id = id.id;
  }

  var pa = ArangoDatabase.indexRegex.exec(id);
  var err;

  if (pa === null) {
    err = new ArangoError();
    err.errorNum = internal.errors.ERROR_ARANGO_INDEX_HANDLE_BAD.code;
    err.errorMessage = internal.errors.ERROR_ARANGO_INDEX_HANDLE_BAD.message;
    throw err;
  }

  var col = this._collection(pa[1]);
  var name = pa[2];

  if (col === null) {
    err = new ArangoError();
    err.errorNum = internal.errors.ERROR_ARANGO_DATA_SOURCE_NOT_FOUND.code;
    err.errorMessage = internal.errors.ERROR_ARANGO_DATA_SOURCE_NOT_FOUND.message;
    throw err;
  }

  var indexes = col.getIndexes();
  var i;

  for (i = 0;  i < indexes.length;  ++i) {
    var index = indexes[i];

    if (index.id === id || index.name === name) {
      return index;
    }
  }

  return null;
};

ArangoDatabase.prototype._dropIndex = function (id) {
  if (id.hasOwnProperty('id')) {
    id = id.id;
  }

  var pa = ArangoDatabase.indexRegex.exec(id);
  var err;

  if (pa === null) {
    err = new ArangoError();
    err.errorNum = internal.errors.ERROR_ARANGO_INDEX_HANDLE_BAD.code;
    err.errorMessage = internal.errors.ERROR_ARANGO_INDEX_HANDLE_BAD.message;
    throw err;
  }

  var col = this._collection(pa[1]);

  if (col === null) {
    err = new ArangoError();
    err.errorNum = internal.errors.ERROR_ARANGO_DATA_SOURCE_NOT_FOUND.code;
    err.errorMessage = internal.errors.ERROR_ARANGO_DATA_SOURCE_NOT_FOUND.message;
    throw err;
  }

  return col.dropIndex(id);
};

ArangoDatabase.prototype._endpoints = function () {
  return internal._endpoints();
};
