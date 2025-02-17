/*jshint globalstrict:false, strict:false, maxlen: 500 */
/*global assertEqual, assertMatch, assertNotMatch */

////////////////////////////////////////////////////////////////////////////////
/// @brief tests for duplicate attributes
///
/// DISCLAIMER
///
/// Copyright 2010-2012 triagens GmbH, Cologne, Germany
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
/// Copyright holder is triAGENS GmbH, Cologne, Germany
///
/// @author Jan Steemann
/// @author Copyright 2012, triAGENS GmbH, Cologne, Germany
////////////////////////////////////////////////////////////////////////////////

const jsunity = require("jsunity");
let db = require("internal").db;

function ahuacatlDuplicateAttributesTestSuite () {
  const cn = "UnitTestsDuplicate";

  return {

    setUp : function () {
      db._drop(cn);
      db._create(cn);
    },

    tearDown : function () {
      db._drop(cn);
    },

    testInsertDuplicate : function () {
      let query = "INSERT { 'a': 1, 'a': 2, 'a': 3, '': 0, '': 2, 'x': 3 } INTO @@collection RETURN NEW";
      let result = db._query(query, { "@collection" : cn }).toArray();
      assertEqual([{ a: 1, "": 0 }], result.map(function(doc) { return { a: doc.a, "": doc[""] }; }));

      query = "FOR doc IN @@collection RETURN JSON_STRINGIFY(doc)";
      result = db._query(query, { "@collection" : cn }).toArray();
      assertMatch(/"a":1/, result[0]);
      assertNotMatch(/"a":2/, result[0]);
      assertMatch(/"":0/, result[0]);
      assertNotMatch(/"":2/, result[0]);
    },
    
    testInsertDuplicateDynamic : function () {
      let query = "INSERT NOOPT({ 'a': 1, 'a': 2, 'a': 3, '': 0, '': 2, 'x': 3 }) INTO @@collection RETURN NEW";
      let result = db._query(query, { "@collection" : cn }).toArray();
      assertEqual([{ a: 1, "": 0 }], result.map(function(doc) { return { a: doc.a, "": doc[""] }; }));

      query = "FOR doc IN @@collection RETURN JSON_STRINGIFY(doc)";
      result = db._query(query, { "@collection" : cn }).toArray();
      assertMatch(/"a":1/, result[0]);
      assertNotMatch(/"a":2/, result[0]);
      assertMatch(/"":0/, result[0]);
      assertNotMatch(/"":2/, result[0]);
    },

    testUpdateDuplicate : function () {
      db[cn].insert({ _key: "peng", a: 9, "": 3, b: 3 });

      let query = "UPDATE 'peng' WITH { 'a': 1, 'a': 2, 'a': 3, '': 0, '': 2, 'x': 3 } INTO @@collection RETURN NEW";
      let result = db._query(query, { "@collection" : cn }).toArray();
      assertEqual([{ a: 1, "": 0, b: 3 }], result.map(function(doc) { return { a: doc.a, b: doc.b, "": doc[""] }; }));

      query = "FOR doc IN @@collection RETURN JSON_STRINGIFY(doc)";
      result = db._query(query, { "@collection" : cn }).toArray();
      assertMatch(/"a":1/, result[0]);
      assertNotMatch(/"a":2/, result[0]);
      assertMatch(/"":0/, result[0]);
      assertNotMatch(/"":2/, result[0]);
    },
    
    testUpdateDuplicateDynamic : function () {
      db[cn].insert({ _key: "peng", a: 9, "": 3, b: 3 });

      let query = "UPDATE 'peng' WITH NOOPT({ 'a': 1, 'a': 2, 'a': 3, '': 0, '': 2, 'x': 3 }) INTO @@collection RETURN NEW";
      let result = db._query(query, { "@collection" : cn }).toArray();
      assertEqual([{ a: 1, "": 0, b: 3 }], result.map(function(doc) { return { a: doc.a, b: doc.b, "": doc[""] }; }));

      query = "FOR doc IN @@collection RETURN JSON_STRINGIFY(doc)";
      result = db._query(query, { "@collection" : cn }).toArray();
      assertMatch(/"a":1/, result[0]);
      assertNotMatch(/"a":2/, result[0]);
      assertMatch(/"":0/, result[0]);
      assertNotMatch(/"":2/, result[0]);
    },
    
    testReplaceDuplicate : function () {
      db[cn].insert({ _key: "peng", a: 9, "": 3 });

      let query = "REPLACE 'peng' WITH { 'a': 1, 'a': 2, 'a': 3, '': 0, '': 2, 'x': 3 } INTO @@collection RETURN NEW";
      let result = db._query(query, { "@collection" : cn }).toArray();
      assertEqual([{ a: 1, "": 0 }], result.map(function(doc) { return { a: doc.a, "": doc[""] }; }));

      query = "FOR doc IN @@collection RETURN JSON_STRINGIFY(doc)";
      result = db._query(query, { "@collection" : cn }).toArray();
      assertMatch(/"a":1/, result[0]);
      assertNotMatch(/"a":2/, result[0]);
      assertMatch(/"":0/, result[0]);
      assertNotMatch(/"":2/, result[0]);
    },
    
    testReplaceDuplicateDynamic : function () {
      db[cn].insert({ _key: "peng", a: 9, "": 3 });

      let query = "REPLACE 'peng' WITH NOOPT({ 'a': 1, 'a': 2, 'a': 3, '': 0, '': 2, 'x': 3 }) INTO @@collection RETURN NEW";
      let result = db._query(query, { "@collection" : cn }).toArray();
      assertEqual([{ a: 1, "": 0 }], result.map(function(doc) { return { a: doc.a, "": doc[""] }; }));

      query = "FOR doc IN @@collection RETURN JSON_STRINGIFY(doc)";
      result = db._query(query, { "@collection" : cn }).toArray();
      assertMatch(/"a":1/, result[0]);
      assertNotMatch(/"a":2/, result[0]);
      assertMatch(/"":0/, result[0]);
      assertNotMatch(/"":2/, result[0]);
    },
    
    testResultsDuplicate : function () {
      let query = "RETURN { 'a': 1, 'a': 2, 'a': 3, '': 0, '': 2, 'x': 3 }";
      let result = db._query(query).toArray();
      assertEqual([{ a: 1, "": 0 }], result.map(function(doc) { return { a: doc.a, "": doc[""] }; }));
    },
    
    testResultsDuplicateDynamic : function () {
      let query = "RETURN NOOPT({ 'a': 1, 'a': 2, 'a': 3, '': 0, '': 2, 'x': 3 })";
      let result = db._query(query).toArray();
      assertEqual([{ a: 1, "": 0 }], result.map(function(doc) { return { a: doc.a, "": doc[""] }; }));
    },

    testResultsDuplicateMerge : function () {
      db[cn].insert({ _key: "peng", a: 1 });

      let query = "FOR doc IN @@collection RETURN JSON_STRINGIFY(MERGE(doc, { a: 2, a: 3 }))";
      let result = db._query(query, { "@collection" : cn }).toArray();
      assertMatch(/"a":2/, result[0]);
      assertNotMatch(/"a":1/, result[0]);
      assertNotMatch(/"a":3/, result[0]);
    },
    
  };
}

jsunity.run(ahuacatlDuplicateAttributesTestSuite);

return jsunity.done();
