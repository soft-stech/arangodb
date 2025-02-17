/*jshint globalstrict:false, strict:false, maxlen: 500 */
/*global assertEqual, assertTrue, fail */
////////////////////////////////////////////////////////////////////////////////
/// @brief tests for query language, functions
///
/// @file
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

var internal = require("internal");
var errors = internal.errors;
var jsunity = require("jsunity");
var helper = require("@arangodb/aql-helper");
var getQueryResults = helper.getQueryResults;
var assertQueryError = helper.assertQueryError;
var assertQueryWarningAndNull = helper.assertQueryWarningAndNull;
var db = require("org/arangodb").db;

function ahuacatlMiscFunctionsTestSuite () { 
  return {
    
    testInternalFunction : function () {
      try {
        // an internal function cannot be used from a query directly.
        // AQL will always pretend that the function does not exist.
        db._query("RETURN INTERNAL()");
        fail();
      } catch (err) {
        assertEqual(errors.ERROR_QUERY_FUNCTION_NAME_UNKNOWN.code, err.errorNum);
      }
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test parse key function
////////////////////////////////////////////////////////////////////////////////

    testParseKey : function () {
      let actual;

      actual = getQueryResults("RETURN PARSE_KEY('foo/bar')");
      assertEqual([ 'bar' ], actual);

      actual = getQueryResults("RETURN PARSE_KEY('this-is-a-collection-name/and-this-is-an-id')");
      assertEqual([ 'and-this-is-an-id' ], actual);

      actual = getQueryResults("RETURN PARSE_KEY('MY_COLLECTION/MY_DOC')");
      assertEqual([ 'MY_DOC' ], actual);

      actual = getQueryResults("RETURN PARSE_KEY('_users/AbC')");
      assertEqual([ 'AbC' ], actual);

      actual = getQueryResults("RETURN PARSE_KEY({ _id: 'foo/bar', value: 'baz' })");
      assertEqual([ 'bar' ], actual);

      actual = getQueryResults("RETURN PARSE_KEY({ ignore: true, _id: '_system/VALUE', value: 'baz' })");
      assertEqual([ 'VALUE' ], actual);

      actual = getQueryResults("RETURN PARSE_KEY({ value: 123, _id: 'Some-Odd-Collection/THIS_IS_THE_KEY' })");
      assertEqual([ 'THIS_IS_THE_KEY' ], actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test parse key function
////////////////////////////////////////////////////////////////////////////////

    testParseKeyCollection : function () {
      const cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      let cx = internal.db._create(cn);
      cx.save({ "title" : "123", "value" : 456, "_key" : "foobar" });
      cx.save({ "_key" : "so-this-is-it", "title" : "nada", "value" : 123 });

      let expected, actual;

      expected = [ "foobar" ];
      actual = getQueryResults("RETURN PARSE_KEY(DOCUMENT(CONCAT(@cn, '/', @key)))", { cn: cn, key: "foobar" });
      assertEqual(expected, actual);

      expected = [ "foobar" ];
      actual = getQueryResults("RETURN PARSE_KEY(DOCUMENT(CONCAT(@cn, '/', 'foobar')))", { cn: cn });
      assertEqual(expected, actual);

      expected = [ "foobar" ];
      actual = getQueryResults("RETURN PARSE_KEY(DOCUMENT([ @key ])[0])", { key: "UnitTestsAhuacatlFunctions/foobar" });
      assertEqual(expected, actual);

      expected = [ "so-this-is-it" ];
      actual = getQueryResults("RETURN PARSE_KEY(DOCUMENT([ 'UnitTestsAhuacatlFunctions/so-this-is-it' ])[0])");
      assertEqual(expected, actual);

      internal.db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test parse key function
////////////////////////////////////////////////////////////////////////////////

    testParseKeyInvalid : function () {
      assertQueryError(errors.ERROR_QUERY_FUNCTION_ARGUMENT_NUMBER_MISMATCH.code, "RETURN PARSE_KEY()"); 
      assertQueryError(errors.ERROR_QUERY_FUNCTION_ARGUMENT_NUMBER_MISMATCH.code, "RETURN PARSE_KEY('foo', 'bar')");
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_KEY(null)"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_KEY(false)"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_KEY(3)"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_KEY(\"foo\")"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_KEY('foo bar')"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_KEY('foo/bar/baz')"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_KEY([ ])"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_KEY({ })"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_KEY({ foo: 'bar' })"); 
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test parse collection function
////////////////////////////////////////////////////////////////////////////////

    testParseCollection : function () {
      let actual;

      actual = getQueryResults("RETURN PARSE_COLLECTION('foo/bar')");
      assertEqual([ 'foo' ], actual);

      actual = getQueryResults("RETURN PARSE_COLLECTION('this-is-a-collection-name/and-this-is-an-id')");
      assertEqual([ 'this-is-a-collection-name' ], actual);

      actual = getQueryResults("RETURN PARSE_COLLECTION('MY_COLLECTION/MY_DOC')");
      assertEqual([ 'MY_COLLECTION' ], actual);

      actual = getQueryResults("RETURN PARSE_COLLECTION('_users/AbC')");
      assertEqual([ '_users' ], actual);

      actual = getQueryResults("RETURN PARSE_COLLECTION({ _id: 'foo/bar', value: 'baz' })");
      assertEqual([ 'foo' ], actual);

      actual = getQueryResults("RETURN PARSE_COLLECTION({ ignore: true, _id: '_system/VALUE', value: 'baz' })");
      assertEqual([ '_system' ], actual);

      actual = getQueryResults("RETURN PARSE_COLLECTION({ value: 123, _id: 'Some-Odd-Collection/THIS_IS_THE_KEY' })");
      assertEqual([ 'Some-Odd-Collection' ], actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test parse collection function
////////////////////////////////////////////////////////////////////////////////

    testParseCollectionCollection : function () {
      const cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      let cx = internal.db._create(cn);
      cx.save({ "title" : "123", "value" : 456, "_key" : "foobar" });
      cx.save({ "_key" : "so-this-is-it", "title" : "nada", "value" : 123 });

      let expected, actual;

      expected = [ cn ];
      actual = getQueryResults("RETURN PARSE_COLLECTION(DOCUMENT(CONCAT(@cn, '/', @key)))", { cn: cn, key: "foobar" });
      assertEqual(expected, actual);

      expected = [ cn ];
      actual = getQueryResults("RETURN PARSE_COLLECTION(DOCUMENT(CONCAT(@cn, '/', 'foobar')))", { cn: cn });
      assertEqual(expected, actual);

      expected = [ cn ];
      actual = getQueryResults("RETURN PARSE_COLLECTION(DOCUMENT([ @key ])[0])", { key: "UnitTestsAhuacatlFunctions/foobar" });
      assertEqual(expected, actual);

      expected = [ cn ];
      actual = getQueryResults("RETURN PARSE_COLLECTION(DOCUMENT([ 'UnitTestsAhuacatlFunctions/so-this-is-it' ])[0])");
      assertEqual(expected, actual);

      internal.db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test parse collection function
////////////////////////////////////////////////////////////////////////////////

    testParseCollectionInvalid : function () {
      assertQueryError(errors.ERROR_QUERY_FUNCTION_ARGUMENT_NUMBER_MISMATCH.code, "RETURN PARSE_COLLECTION()"); 
      assertQueryError(errors.ERROR_QUERY_FUNCTION_ARGUMENT_NUMBER_MISMATCH.code, "RETURN PARSE_COLLECTION('foo', 'bar')");
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_COLLECTION(null)"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_COLLECTION(false)"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_COLLECTION(3)"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_COLLECTION(\"foo\")"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_COLLECTION('foo bar')"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_COLLECTION('foo/bar/baz')"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_COLLECTION([ ])"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_COLLECTION({ })"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_COLLECTION({ foo: 'bar' })"); 
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test parse identifier function
////////////////////////////////////////////////////////////////////////////////

    testParseIdentifier : function () {
      let actual;

      actual = getQueryResults("RETURN PARSE_IDENTIFIER('foo/bar')");
      assertEqual([ { collection: 'foo', key: 'bar' } ], actual);

      actual = getQueryResults("RETURN PARSE_IDENTIFIER('this-is-a-collection-name/and-this-is-an-id')");
      assertEqual([ { collection: 'this-is-a-collection-name', key: 'and-this-is-an-id' } ], actual);

      actual = getQueryResults("RETURN PARSE_IDENTIFIER('MY_COLLECTION/MY_DOC')");
      assertEqual([ { collection: 'MY_COLLECTION', key: 'MY_DOC' } ], actual);

      actual = getQueryResults("RETURN PARSE_IDENTIFIER('_users/AbC')");
      assertEqual([ { collection: '_users', key: 'AbC' } ], actual);

      actual = getQueryResults("RETURN PARSE_IDENTIFIER({ _id: 'foo/bar', value: 'baz' })");
      assertEqual([ { collection: 'foo', key: 'bar' } ], actual);

      actual = getQueryResults("RETURN PARSE_IDENTIFIER({ ignore: true, _id: '_system/VALUE', value: 'baz' })");
      assertEqual([ { collection: '_system', key: 'VALUE' } ], actual);

      actual = getQueryResults("RETURN PARSE_IDENTIFIER({ value: 123, _id: 'Some-Odd-Collection/THIS_IS_THE_KEY' })");
      assertEqual([ { collection: 'Some-Odd-Collection', key: 'THIS_IS_THE_KEY' } ], actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test parse identifier function
////////////////////////////////////////////////////////////////////////////////

    testParseIdentifierCollection : function () {
      const cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      let cx = internal.db._create(cn);
      cx.save({ "title" : "123", "value" : 456, "_key" : "foobar" });
      cx.save({ "_key" : "so-this-is-it", "title" : "nada", "value" : 123 });

      let expected, actual;

      expected = [ { collection: cn, key: "foobar" } ];
      actual = getQueryResults("RETURN PARSE_IDENTIFIER(DOCUMENT(CONCAT(@cn, '/', @key)))", { cn: cn, key: "foobar" });
      assertEqual(expected, actual);

      expected = [ { collection: cn, key: "foobar" } ];
      actual = getQueryResults("RETURN PARSE_IDENTIFIER(DOCUMENT(CONCAT(@cn, '/', 'foobar')))", { cn: cn });
      assertEqual(expected, actual);

      expected = [ { collection: cn, key: "foobar" } ];
      actual = getQueryResults("RETURN PARSE_IDENTIFIER(DOCUMENT([ @key ])[0])", { key: "UnitTestsAhuacatlFunctions/foobar" });
      assertEqual(expected, actual);

      expected = [ { collection: cn, key: "so-this-is-it" } ];
      actual = getQueryResults("RETURN PARSE_IDENTIFIER(DOCUMENT([ 'UnitTestsAhuacatlFunctions/so-this-is-it' ])[0])");
      assertEqual(expected, actual);

      internal.db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test parse identifier function
////////////////////////////////////////////////////////////////////////////////

    testParseIdentifierInvalid : function () {
      assertQueryError(errors.ERROR_QUERY_FUNCTION_ARGUMENT_NUMBER_MISMATCH.code, "RETURN PARSE_IDENTIFIER()"); 
      assertQueryError(errors.ERROR_QUERY_FUNCTION_ARGUMENT_NUMBER_MISMATCH.code, "RETURN PARSE_IDENTIFIER('foo', 'bar')");
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_IDENTIFIER(null)"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_IDENTIFIER(false)"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_IDENTIFIER(3)"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_IDENTIFIER(\"foo\")"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_IDENTIFIER('foo bar')"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_IDENTIFIER('foo/bar/baz')"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_IDENTIFIER([ ])"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_IDENTIFIER({ })"); 
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN PARSE_IDENTIFIER({ foo: 'bar' })"); 
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test is_same_collection function
////////////////////////////////////////////////////////////////////////////////

    testIsSameCollection : function () {
      assertEqual([ true ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', 'foo/bar')"));
      assertEqual([ true ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', 'foo/bark')"));
      assertEqual([ false ], getQueryResults("RETURN IS_SAME_COLLECTION('FOO', 'foo/bark')"));
      assertEqual([ false ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', 'food/barz')"));
      assertEqual([ false ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', 'fooe/barz')"));
      assertEqual([ false ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', ' foo/barz')"));

      assertEqual([ true ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', { _id: 'foo/bark' })"));
      assertEqual([ true ], getQueryResults("RETURN IS_SAME_COLLECTION('foobar', { _id: 'foobar/bark' })"));
      assertEqual([ false ], getQueryResults("RETURN IS_SAME_COLLECTION('FOOBAR', { _id: 'foobar/bark' })"));
      assertEqual([ false ], getQueryResults("RETURN IS_SAME_COLLECTION('foobar2', { _id: 'foobar/bark' })"));
      assertEqual([ false ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', { _id: 'food/bark' })"));
      assertEqual([ false ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', { _id: 'f/bark' })"));
      assertEqual([ false ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', { _id: 'f/bark' })"));
      assertEqual([ false ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', { _id: 'foobar/bark' })"));
      assertEqual([ null ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', { id: 'foobar/bark' })"));
      assertEqual([ null ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', { _key: 'foo/bark' })"));
      assertEqual([ null ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', { _key: 'foobar/bark' })"));

      assertEqual([ null ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', null)"));
      assertEqual([ null ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', true)"));
      assertEqual([ null ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', false)"));
      assertEqual([ null ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', 3.5)"));
      assertEqual([ null ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', [ ])"));
      assertEqual([ null ], getQueryResults("RETURN IS_SAME_COLLECTION('foo', [ 'foo/bar' ])"));
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test is_same_collection function
////////////////////////////////////////////////////////////////////////////////

    testIsSameCollectionCollection : function () {
      var cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      var cx = internal.db._create(cn);
      cx.save({ "title" : "123", "value" : 456, "_key" : "foobar" });
      cx.save({ "_key" : "so-this-is-it", "title" : "nada", "value" : 123 });

      var actual;

      actual = getQueryResults(`RETURN IS_SAME_COLLECTION(${cn}, DOCUMENT(CONCAT(@cn, '/', @key)))`, { cn: cn, key: "foobar" });
      assertTrue(actual[0]);

      actual = getQueryResults(`RETURN IS_SAME_COLLECTION(${cn}, DOCUMENT(CONCAT(@cn, '/', 'foobar')))`, { cn: cn });
      assertTrue(actual[0]);

      actual = getQueryResults(`RETURN IS_SAME_COLLECTION(${cn}, DOCUMENT([ @key ])[0])`, { key: "UnitTestsAhuacatlFunctions/foobar" });
      assertTrue(actual[0]);

      actual = getQueryResults(`RETURN IS_SAME_COLLECTION(${cn}, DOCUMENT([ 'UnitTestsAhuacatlFunctions/so-this-is-it' ])[0])`);
      assertTrue(actual[0]);

      internal.db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test is_same_collection function
////////////////////////////////////////////////////////////////////////////////

    testIsSameCollectionInvalid : function () {
     assertQueryError(errors.ERROR_QUERY_FUNCTION_ARGUMENT_NUMBER_MISMATCH.code, "RETURN IS_SAME_COLLECTION()");
      assertQueryError(errors.ERROR_QUERY_FUNCTION_ARGUMENT_NUMBER_MISMATCH.code, "RETURN IS_SAME_COLLECTION('foo')");
      assertQueryError(errors.ERROR_QUERY_FUNCTION_ARGUMENT_NUMBER_MISMATCH.code, "RETURN IS_SAME_COLLECTION('foo', 'bar', 'baz')");

      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN IS_SAME_COLLECTION('foo', null)");
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN IS_SAME_COLLECTION('foo', false)");
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN IS_SAME_COLLECTION('foo', true)");
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN IS_SAME_COLLECTION('foo', 3)");
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN IS_SAME_COLLECTION('foo', [ ])");
      assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN IS_SAME_COLLECTION('foo', { })");
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test check_document function
////////////////////////////////////////////////////////////////////////////////

    testCheckDocument : function () {
      var cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      let c = internal.db._create(cn);

      c.insert({ _key: "test1", a: 1, b: 2, c: 3 });
      c.insert({ _key: "test2", a: 1, b: 2, c: 3, sub: { a: 1, b: 2, c: 3 }});
      c.insert({ _key: "test3", a: 1, b: 2, c: 3, sub: [{ a: 1 }, { b: 2 }, { c: 3 }, { a: 1 }]});
      
      assertEqual([ true, true, true ], getQueryResults("FOR doc IN " + cn + " RETURN CHECK_DOCUMENT(doc)"));

      assertEqual([ false ], getQueryResults("RETURN CHECK_DOCUMENT(null)"));
      assertEqual([ false ], getQueryResults("RETURN CHECK_DOCUMENT(true)"));
      assertEqual([ false ], getQueryResults("RETURN CHECK_DOCUMENT(false)"));
      assertEqual([ false ], getQueryResults("RETURN CHECK_DOCUMENT(-1)"));
      assertEqual([ false ], getQueryResults("RETURN CHECK_DOCUMENT(0)"));
      assertEqual([ false ], getQueryResults("RETURN CHECK_DOCUMENT(1)"));
      assertEqual([ false ], getQueryResults("RETURN CHECK_DOCUMENT('foo')"));
      assertEqual([ false ], getQueryResults("RETURN CHECK_DOCUMENT([])"));
      assertEqual([ false ], getQueryResults("RETURN CHECK_DOCUMENT([1, 2, 3])"));
      assertEqual([ true ], getQueryResults("RETURN CHECK_DOCUMENT({})"));
      assertEqual([ true ], getQueryResults("RETURN CHECK_DOCUMENT({a: 1})"));
      assertEqual([ true ], getQueryResults("RETURN CHECK_DOCUMENT({a: 1, b: 2})"));
      assertEqual([ true ], getQueryResults("RETURN CHECK_DOCUMENT({a: 1, sub: [1, 2, 3]})"));
      assertEqual([ true ], getQueryResults("RETURN CHECK_DOCUMENT({a: 1, sub: {a: 1, b: 2 }})"));

      internal.db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test document function
////////////////////////////////////////////////////////////////////////////////

    testDocument1 : function () {
      var cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      var cx = internal.db._create(cn);
      var d1 = cx.save({ "title" : "123", "value" : 456 });
      var d2 = cx.save({ "title" : "nada", "value" : 123 });

      var expected, actual;

      // test with two parameters
      expected = [ { title: "123", value : 456 } ];
      actual = getQueryResults("RETURN DOCUMENT(" + cn + ", \"" + d1._id + "\")");
      assertEqual(expected, actual);

      actual = getQueryResults("RETURN DOCUMENT(" + cn + ", \"" + d1._key + "\")");
      assertEqual(expected, actual);

      expected = [ { title: "nada", value : 123 } ];
      actual = getQueryResults("RETURN DOCUMENT(" + cn + ", \"" + d2._id + "\")");
      assertEqual(expected, actual);

      actual = getQueryResults("RETURN DOCUMENT(" + cn + ", \"" + d2._key + "\")");
      assertEqual(expected, actual);

      // test with one parameter
      expected = [ { title: "nada", value : 123 } ];
      actual = getQueryResults("RETURN DOCUMENT(\"" + d2._id + "\")");
      assertEqual(expected, actual);

      // test with function result parameter
      actual = getQueryResults("RETURN DOCUMENT(CONCAT(\"foo\", \"bar\"))");
      assertEqual([ null ], actual);
      actual = getQueryResults("RETURN DOCUMENT(CONCAT(\"" + cn + "\", \"bart\"))");
      assertEqual([ null ], actual);

      cx.save({ _key: "foo", value: "bar" });
      expected = [ { value: "bar" } ];
      actual = getQueryResults("RETURN DOCUMENT(CONCAT(\"" + cn + "\", \"foo\"))");
      assertEqual([ null ], actual);
      actual = getQueryResults("RETURN DOCUMENT(CONCAT(@c, \"/\", @k))", { c: cn, k: "foo" });
      assertEqual(expected, actual);
      actual = getQueryResults("RETURN DOCUMENT(CONCAT(\"" + cn + "\", \"/\", @k))", { k: "foo" });
      assertEqual(expected, actual);

      // test with bind parameter
      expected = [ { title: "nada", value : 123 } ];
      actual = getQueryResults("RETURN DOCUMENT(@id)", { id: d2._id });
      assertEqual(expected, actual);

      // test dynamic parameter
      expected = [ { title: "nada", value : 123 }, { title: "123", value: 456 }, { value: "bar" } ];
      actual = getQueryResults("FOR d IN @@cn SORT d.value RETURN DOCUMENT(d._id)", { "@cn" : cn });
      assertEqual(expected, actual);

      internal.db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test document function
////////////////////////////////////////////////////////////////////////////////

    testDocument2 : function () {
      var cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      var cx = internal.db._create(cn);
      var d1 = cx.save({ "title" : "123", "value" : 456, "zxy" : 1 });
      var d2 = cx.save({ "title" : "nada", "value" : 123, "zzzz" : false });

      var expected, actual;

      // test with two parameters
      expected = [ { title: "123", value : 456, zxy: 1 } ];
      actual = getQueryResults("RETURN DOCUMENT(@@cn, @id)", { "@cn" : cn, "id" : d1._id });
      assertEqual(expected, actual);

      actual = getQueryResults("RETURN DOCUMENT(@@cn, @id)", { "@cn" : cn, "id" : d1._key });
      assertEqual(expected, actual);

      expected = [ { title: "nada", value : 123, zzzz : false } ];
      actual = getQueryResults("RETURN DOCUMENT(@@cn, @id)", { "@cn" : cn, "id" : d2._id });
      assertEqual(expected, actual);

      actual = getQueryResults("RETURN DOCUMENT(@@cn, @id)", { "@cn" : cn, "id" : d2._key });
      assertEqual(expected, actual);

      // test with one parameter
      expected = [ { title: "123", value : 456, zxy: 1 } ];
      actual = getQueryResults("RETURN DOCUMENT(@id)", { "id" : d1._id });
      assertEqual(expected, actual);

      expected = [ { title: "nada", value : 123, zzzz : false } ];
      actual = getQueryResults("RETURN DOCUMENT(@id)", { "id" : d2._id });
      assertEqual(expected, actual);

      internal.db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test document function
////////////////////////////////////////////////////////////////////////////////

    testDocumentMulti1 : function () {
      var cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      var cx = internal.db._create(cn);
      var d1 = cx.save({ "title" : "123", "value" : 456, "zxy" : 1 });
      var d2 = cx.save({ "title" : "nada", "value" : 123, "zzzz" : false });
      var d3 = cx.save({ "title" : "boom", "value" : 3321, "zzzz" : null });

      var expected, actual;

      // test with two parameters
      expected = [ [
        { title: "123", value : 456, zxy : 1 },
        { title: "nada", value : 123, zzzz : false },
        { title: "boom", value : 3321, zzzz : null }
      ] ];

      actual = getQueryResults("RETURN DOCUMENT(@@cn, @id)", { "@cn" : cn, "id" : [ d1._id, d2._id, d3._id ] }, true);
      assertEqual(expected, actual);

      expected = [ [ { title: "nada", value : 123, zzzz : false } ] ];
      actual = getQueryResults("RETURN DOCUMENT(@@cn, @id)", { "@cn" : cn, "id" : [ d2._id ] }, true);
      assertEqual(expected, actual);

      // test with one parameter
      expected = [ [ { title: "nada", value : 123, zzzz : false } ] ];
      actual = getQueryResults("RETURN DOCUMENT(@id)", { "id" : [ d2._id ] }, true);
      assertEqual(expected, actual);


      cx.remove(d3);

      expected = [ [ { title: "nada", value : 123, zzzz : false } ] ];
      actual = getQueryResults("RETURN DOCUMENT(@@cn, @id)", { "@cn" : cn, "id" : [ d2._id, d3._id, "abc/def" ] }, true);
      assertEqual(expected, actual);

      expected = [ [ { title: "nada", value : 123, zzzz : false } ] ];
      actual = getQueryResults("RETURN DOCUMENT(@id)", { "id" : [ d2._id, d3._id, "abc/def" ] }, true);
      assertEqual(expected, actual);

      internal.db._drop(cn);
    },
    
    testDocumentUseAfterModification : function () {
      const cn = "UnitTestsAhuacatlFunctions";

      let c = internal.db._create(cn);
      try {
        c.insert({ "title" : "123", "value" : 456 });
        c.insert({ "title" : "nada", "value" : 123 });

        let res = db._query("FOR doc IN " + cn + " SORT doc.value RETURN DOCUMENT(doc._id).title");
        assertEqual([ "nada", "123" ], res.toArray());
        
        try {
          db._query("FOR doc IN " + cn + " SORT doc.value REMOVE doc IN " + cn + " RETURN DOCUMENT(doc._id).title");
          fail();
        } catch (err) {
          assertEqual(errors.ERROR_QUERY_ACCESS_AFTER_MODIFICATION.code, err.errorNum);
        }
      
        res = db._query("FOR doc IN " + cn + " SORT doc.value LET title = DOCUMENT(doc._id).title INSERT { title } INTO " + cn + " RETURN NEW");
        assertEqual(2, res.toArray().length);
        assertEqual(4, c.count());
      } finally {
        internal.db._drop(cn);
      }
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test document function
////////////////////////////////////////////////////////////////////////////////

    testDocumentInvalid : function () {
      var cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      internal.db._create(cn);

      var expected, actual;

      // test with non-existing document
      expected = [ null ];
      actual = getQueryResults("RETURN DOCUMENT(" + cn + ", \"" + cn + "/99999999999\")");
      assertEqual(expected, actual);

      actual = getQueryResults("RETURN DOCUMENT(" + cn + ", \"thefoxdoesnotexist/99999999999\")");
      assertEqual(expected, actual);

      actual = getQueryResults("RETURN DOCUMENT({}, 'foo')");
      assertEqual(expected, actual);

      actual = getQueryResults("RETURN DOCUMENT({}, {})");
      assertEqual(expected, actual);

      actual = getQueryResults("RETURN DOCUMENT(true, 'foo')");
      assertEqual(expected, actual);

      actual = getQueryResults("RETURN DOCUMENT('foo', {})");
      assertEqual(expected, actual);

      internal.db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test document indexed access function
////////////////////////////////////////////////////////////////////////////////

    testDocumentIndexedAccess : function () {
      var cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      var cx = internal.db._create(cn);
      var d1 = cx.save({ "title" : "123", "value" : 456 });

      var expected, actual;

      expected = [ "123" ];
      actual = getQueryResults("RETURN DOCUMENT(" + cn + ", [ \"" + d1._id + "\" ])[0].title");
      assertEqual(expected, actual);

      internal.db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test current user function
////////////////////////////////////////////////////////////////////////////////

    testCurrentUser : function () {
      // var expected = null;
      // if (internal.getCurrentRequest) {
      //   var req = internal.getCurrentRequest();
      //   print("HERE")

      //   if (typeof req === 'object') {
      //     expected = req.user;
      //   }
      //   print(expected)
      // }

      //  // there is no current user in the non-request context
      //  var actual = getQueryResults("RETURN CURRENT_USER()");
      //  assertEqual([ expected ], actual);

      var expected = ["root"];
      var actual = getQueryResults("RETURN CURRENT_USER()");
      assertEqual(expected, actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test current database function
////////////////////////////////////////////////////////////////////////////////

    testCurrentDatabase : function () {
      var actual = getQueryResults("RETURN CURRENT_DATABASE()");
      assertEqual([ "_system" ], actual);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test sleep function
////////////////////////////////////////////////////////////////////////////////

    testSleep : function () {
      var start = require("internal").time();
      var actual = getQueryResults("LET a = SLEEP(2) RETURN 1");

      var diff = Math.round(require("internal").time() - start, 1);

      assertEqual([ 1 ], actual);

      // allow some tolerance for the time diff (because of busy servers and Valgrind)
      assertTrue(diff >= 1.8 && diff <= 20, "SLEEP(2) did not take between 1.8 and 20 seconds");
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test ASSERT function
////////////////////////////////////////////////////////////////////////////////

    testAssert : function () {
      var cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      var c = internal.db._create(cn);
      c.insert({"foo": 0});
      c.insert({"foo": 1});
      c.insert({"foo": 2});

      var result = db._query("FOR doc in @@cn FILTER ASSERT(doc.foo < 4,'USER MESSAGE: doc.foo not less than 4') RETURN doc", { "@cn" : cn });
      assertEqual(result.toArray().length,3);

      try {
        db._query("FOR doc in @@cn FILTER ASSERT(doc.foo < 2,'USER MESSAGE: doc.foo not less than 2') RETURN doc", { "@cn" : cn });
        fail();
      } catch (err) {
        assertEqual(errors.ERROR_QUERY_USER_ASSERT.code, err.errorNum);
      } finally {
        internal.db._drop(cn);
      }
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test WARN function
////////////////////////////////////////////////////////////////////////////////

    testWarn : function () {
      var cn = "UnitTestsAhuacatlFunctions";

      internal.db._drop(cn);
      var c = internal.db._create(cn);
      c.insert({"foo": 0});
      c.insert({"foo": 1});
      c.insert({"foo": 2});


      var result = db._query("FOR doc in @@cn FILTER WARN(doc.foo < 4,'USER MESSAGE: doc.foo not less than 4') RETURN doc", { "@cn" : cn });
      assertEqual(result.toArray().length,3);

      result = db._query("FOR doc in @@cn FILTER WARN(doc.foo < 2,'USER MESSAGE: doc.foo not less than 2') RETURN doc", { "@cn" : cn });
      assertEqual(result.toArray().length,2);

      try {
        db._query("FOR doc in @@cn FILTER WARN(doc.foo < 2,'USER MESSAGE: doc.foo not less than 2') RETURN doc", { "@cn" : cn }, {"failOnWarning": true});
      } catch (err) {
        assertEqual(errors.ERROR_QUERY_USER_WARN.code, err.errorNum);
      } finally {
        internal.db._drop(cn);
      }
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test DECODE_REV
////////////////////////////////////////////////////////////////////////////////

    testDecodeRevInvalid : function () {
      [ 
        null, 
        false, 
        true, 
        -1000, 
        -1, 
        -0.1, 
        0, 
        0.1, 
        10, 
        10000, 
        9945854.354, 
        "", 
        " ", 
        [],
        {} 
      ].forEach(function(value) {
        assertQueryWarningAndNull(errors.ERROR_QUERY_FUNCTION_ARGUMENT_TYPE_MISMATCH.code, "RETURN DECODE_REV(@value)", { value });
      });
    },
    
    testDecodeRev : function () {
      [
        [ "_YSlmbS6---", "2019-03-04T18:12:45.007Z", 0 ], 
        [ "_YUwHwWy---", "2019-03-11T11:36:03.213Z", 0 ], 
        [ "_YaE0fyK---", "2019-03-28T00:32:38.723Z", 0 ], 
        [ "_YSmDflm---", "2019-03-04T18:44:29.946Z", 0 ], 
        [ "_YaE0Way---", "2019-03-28T00:32:29.133Z", 0 ], 
        [ "_YWeadNG---", "2019-03-16T20:06:02.226Z", 0 ], 
        [ "_YVORUcq---", "2019-03-12T22:43:39.115Z", 0 ], 
        [ "_YSl0nrO---", "2019-03-04T18:28:15.188Z", 0 ], 
        [ "_YY7gl3K--A", "2019-03-24T11:07:50.035Z", 2 ], 
        [ "_YaE4H3q---", "2019-03-28T00:36:36.379Z", 0 ], 
        [ "_YY7N6p2--A", "2019-03-24T10:47:26.142Z", 2 ], 
        [ "_YSlq-Ny---", "2019-03-04T18:16:37.373Z", 0 ], 
        [ "_YYykPIe---", "2019-03-24T00:42:40.168Z", 0 ], 
        [ "_YWf_RSG--B", "2019-03-16T20:46:14.850Z", 3 ], 
        [ "_YSl93J----", "2019-03-04T18:38:20.848Z", 0 ], 
        [ "_YY0Gml6---", "2019-03-24T02:30:06.719Z", 0 ], 
        [ "_YSmdMmW---", "2019-03-04T19:12:34.438Z", 0 ], 
        [ "_YY00EdG---", "2019-03-24T03:19:46.418Z", 0 ], 
        [ "_YYy1OBu---", "2019-03-24T01:01:13.148Z", 0 ], 
        [ "_YY1Bzgu---", "2019-03-24T03:34:46.572Z", 0 ], 
        [ "_YYyPBYK---", "2019-03-24T00:19:29.827Z", 0 ], 
        [ "_YaFcLFe--_", "2019-03-28T01:15:58.968Z", 1 ], 
        [ "_YWexcTu---", "2019-03-16T20:31:08.636Z", 0 ], 
        [ "_YU0HOEG---", "2019-03-11T16:15:05.314Z", 0 ], 
        [ "_YaE1DTC--A", "2019-03-28T00:33:15.089Z", 2 ], 
        [ "_YSmRdx6---", "2019-03-04T18:59:45.599Z", 0 ], 
        [ "_YaE2Q4S---", "2019-03-28T00:34:34.533Z", 0 ], 
        [ "_YSmTlb2---", "2019-03-04T19:02:04.510Z", 0 ], 
        [ "_YYzAiEe---", "2019-03-24T01:13:34.568Z", 0 ], 
        [ "_YVN12He---", "2019-03-12T22:13:38.584Z", 0 ], 
        [ "_YYyVku----", "2019-03-24T00:26:39.232Z", 0 ], 
        [ "_YaFQc26---", "2019-03-28T01:03:10.735Z", 0 ], 
        [ "_YYytrHa---", "2019-03-24T00:52:58.647Z", 0 ], 
        [ "_YaFVoZC---", "2019-03-28T01:08:50.225Z", 0 ], 
        [ "_YWezNX6--A", "2019-03-16T20:33:04.415Z", 2 ], 
        [ "_YaE3rfi---", "2019-03-28T00:36:07.321Z", 0 ], 
        [ "_YUw_E-e---", "2019-03-11T11:26:33.480Z", 0 ], 
        [ "_YYzEieO---", "2019-03-24T01:17:57.124Z", 0 ], 
        [ "_YVOfDlu---", "2019-03-12T22:58:39.356Z", 0 ], 
        [ "_YYyRtVy---", "2019-03-24T00:22:25.917Z", 0 ], 
        [ "_YaFvsf2---", "2019-03-28T01:37:18.366Z", 0 ], 
        [ "_YWfiar----", "2019-03-16T21:24:38.224Z", 0 ], 
        [ "_YSmHzya---", "2019-03-04T18:49:12.775Z", 0 ], 
        [ "_YY0uxp2---", "2019-03-24T03:13:59.486Z", 0 ], 
        [ "_YZZIMQy---", "2019-03-25T21:38:20.077Z", 0 ], 
        [ "_YaE353K---", "2019-03-28T00:36:22.035Z", 0 ], 
      ].forEach(function(parts){
        let value = parts[0];
        let result = db._query("RETURN DECODE_REV(@value)", { value }).toArray();
        assertEqual({ date: parts[1], count: parts[2] }, result[0], parts);
      });
    },

    testShardId : function() {
      const isCluster = require("internal").isCluster();

      var cl, sid, d, counts, val, vala, valb;

      try {
        cl = db._create("cl");
        sid = db._query('RETURN SHARD_ID("cl", {})').toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          assertEqual(sid[0], db.cl.shards()[0]);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a"]});
        d = db.cl.insert({});
        sid = db._query('RETURN SHARD_ID("cl", {"_key":@val})', {val: d._key}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a"]});
        d = db.cl.insert({});
        sid = db._query('RETURN SHARD_ID("cl", {})').toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a"]});
        d = db.cl.insert({});
        sid = db._query('RETURN SHARD_ID("cl", {a:@val})', {val:null}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a", "b"]});
        d = db.cl.insert({});
        sid = db._query('RETURN SHARD_ID("cl", {a:@val})', {val:null}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a", "b"]});
        d = db.cl.insert({});
        sid = db._query('RETURN SHARD_ID("cl", {"b":@val})', {val:null}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a", "b"]});
        d = db.cl.insert({});
        sid = db._query('RETURN SHARD_ID("cl", {"a":@vala,"b":@valb})', {vala:null, valb:null}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a"]});
        val = 3;
        d = db.cl.insert({"a":val});
        sid = db._query('RETURN SHARD_ID("cl", {a:@val})', {val}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a"]});
        val = "Pi";
        d = db.cl.insert({"a":val});
        sid = db._query('RETURN SHARD_ID("cl", {a:@val})', {val}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a"]});
        // I know, this is way beyond double precision. But honestly who cares?
        val = 3.1415926535897932384626433832795028841971693993751058209749445923078164062;
        d = db.cl.insert({"a":val});
        sid = db._query('RETURN SHARD_ID("cl", {a:@val})', {val}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a", "b"]});
        val = 3;
        d = db.cl.insert({"a":val});
        sid = db._query('RETURN SHARD_ID("cl", {a:@val})', {val}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a", "b"]});
        val = "Pi";
        d = db.cl.insert({"a":val});
        sid = db._query('RETURN SHARD_ID("cl", {a:@val})', {val}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a", "b"]});
        val = 3.1415926535897932384626433832795028841971693993751058209749445923078164062;
        d = db.cl.insert({"a":val});
        sid = db._query('RETURN SHARD_ID("cl", {a:@val})', {val}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a", "b"]});
        vala = 3;
        valb = "Pi";
        d = db.cl.insert({"a":vala,"b":valb});
        sid = db._query('RETURN SHARD_ID("cl", {a:@vala, b:@valb})', {vala, valb}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a", "b"]});
        vala = "Pi";
        valb = 3.1415926535897932384626433832795028841971693993751058209749445923078164062;
        d = db.cl.insert({"a":vala,"b":valb});
        sid = db._query('RETURN SHARD_ID("cl", {a:@vala, b:@valb})', {vala, valb}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a", "b"]});
        vala = 3.1415926535897932384626433832795028841971693993751058209749445923078164062;
        valb = 3;
        d = db.cl.insert({"a":vala,"b":valb});
        sid = db._query('RETURN SHARD_ID("cl", {a:@vala, b:@valb})', {vala, valb}).toArray();
        assertEqual(sid.length, 1);
        if (!isCluster) {
          assertEqual(sid[0], "cl");
        } else {
          counts = db.cl.count(true);
          assertEqual(counts[sid[0]], 1);
        }
      } finally {
        db.cl.drop();
      }

      // check that every document among 1000 went to the predicted shard
      try {
        cl = db._create("cl", {numberOfShards:3, shardKeys:["a", "b"]});
        var docs = [];
        var i, a, b, doc;
        for (i = 0; i < 1000; ++i) {
          a = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)+i;
          b = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)+i;
          doc = {a, b, i, d: db.cl.insert({a,i,b})};
          docs.push(doc);
        }
        docs.forEach(function (doc) {
          sid = db._query('RETURN SHARD_ID("cl", {a:@va, b:@vb})', {va:doc.a,vb:doc.b}).toArray();
          assertEqual(sid.length, 1);
          d = db._query('FOR j in cl FILTER j.i == @val RETURN j', {val:doc.i}, {shardIds: sid}).toArray();
          assertEqual(d.length, 1);
        });
      } finally {
        db.cl.drop();
      }

    },

  };

} // ahuacatlMiscFunctionsTestSuite


function ahuacatlCollectionCountTestSuite () {
  var c;
  var cn = "UnitTestsCollectionCount";

  return {

    setUp : function () {
      db._drop(cn);
      c = db._create(cn, { numberOfShards: 4 });
      let docs = [];

      for (var i = 1; i <= 1000; ++i) {
        docs.push({ _key: "test" + i });
      }
      c.insert(docs);
    },

    tearDown : function () {
      db._drop(cn);
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test LENGTH(collection) - non existing
////////////////////////////////////////////////////////////////////////////////

    testLengthNonExisting : function () {
      var cnot = cn + "DoesNotExist";

      try {
        db._query("RETURN LENGTH(" + cnot + ")");
        fail();
      } catch (err) {
        assertEqual(errors.ERROR_ARANGO_DATA_SOURCE_NOT_FOUND.code, err.errorNum);
      }
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test LENGTH(collection)
////////////////////////////////////////////////////////////////////////////////

    testLength : function () {
      var actual = db._createStatement("RETURN LENGTH(" + cn + ")").execute();
      assertEqual([ ], actual.getExtra().warnings);
      assertEqual([ 1000 ], actual.toArray());
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test LENGTH(collection)
////////////////////////////////////////////////////////////////////////////////

    testLengthUseInLoop : function () {
      var actual = db._createStatement("FOR i IN 1..LENGTH(" + cn + ") REMOVE CONCAT('test', i) IN " + cn).execute();
      assertEqual([ ], actual.getExtra().warnings);
      assertEqual([ ], actual.toArray());
      assertEqual(0, c.count());
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test LENGTH(collection)
////////////////////////////////////////////////////////////////////////////////
    
    testLengthUseBeforeModification : function () {
      let res = db._query("FOR doc IN " + cn + " LET l = LENGTH(" + cn + ") REMOVE doc IN " + cn + " RETURN l");
      assertEqual(Array(1000).fill(1000), res.toArray());
    },

    testLengthUseAfterModification : function () {
      try {
        db._query("FOR doc IN " + cn + " REMOVE doc IN " + cn + " RETURN LENGTH(" + cn + ")");
        fail();
      } catch (err) {
        assertEqual(errors.ERROR_QUERY_ACCESS_AFTER_MODIFICATION.code, err.errorNum);
      }
      assertEqual(1000, c.count());
    },

////////////////////////////////////////////////////////////////////////////////
/// @brief test COLLECTIONS()
////////////////////////////////////////////////////////////////////////////////

    testCollections : function () {
      assertEqual(db._collections().map((col) => {return {name:col.name(),_id:col._id};}), getQueryResults('RETURN COLLECTIONS()')[0]);
    }
  };
}

jsunity.run(ahuacatlMiscFunctionsTestSuite);
jsunity.run(ahuacatlCollectionCountTestSuite);

return jsunity.done();
