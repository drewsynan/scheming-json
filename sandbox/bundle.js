(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
window.s = require('../scheming-json.js');

},{"../scheming-json.js":2}],2:[function(require,module,exports){
// scheming json
// -------------

//😏 A lightweight, functional library for describing and validating JSON and JavaScript data

// General Docs
// ------------

// Describing JSON
// ----------------

// Consider the JSON structure 
// ```javascript
// var data = {articles: 
//   [{
//       title: 'The Title',
//       author: 'The Author',
//       published: '1/7/53',
//       tags: [
//         {tagName: 'Stuff'},
//         {tagName: 'Garbage'},
//         {tagName: 'uninteresting'}
//       ]
//     },
//     {
//       title: 'A title',
//       author: 'Somebody else',
//       published: '1/8/53',
//       tags: [
//         {tagName: 'Stuff'}
//       ]
//     }
//   ]};
// ```
//
// We could describe this using scheming json like so:
// ```javascript
// var schema = {articles: 
//   [{
//     title: isString,
//     author: isString,
//     published: isDateString,
//     tags: [{tagName: isString}]
//   }]
// };
// ```
//
// And get a parser function using
// ```javascript
// var articlesParser = parser(schema);
//
// var articlesValid = articlesParser(someArrayofArticles); // => true
// // hooray!
// ```
//
// Where the functions `isString`, and `isDateString` are user-defined (or library-defined) boolean-returning functions ("predicates").
//
// Alternatively, we could build up smaller schema pieces, and then combine them:
// ```javascript
// var tag = {tagName: isString};
// var article = {title: isString, author: isString, published: isDateString, tags: [tag]};
// var articles = {articles: [article]};
// ```


// Special values/operators
// ------------------------
// **
// --
// `**` says that we should apply the predicate to all other fields in an object that we haven't already specified.

// For example, this would also match our article example
// ```javascript
// var singleArticleAlt = {
//   title: isString,
//   tags: [tag],
//   '**': isString
// };
// ```
// This says 'match an object with a key named `title` that's a string, with a key named `tags` holding an array of tag objects, 
// and with 1 or more keys named anything that are all strings.
// To match 0 or more keys use `(**)` combining `**` and the `(...)` optional operator described below.

// *
// -
// `*` says that we should ignore either the key name or the type of value
// ```javascript
// var acceptAllNames = {name: '*'};
// ```
// Will match any object with one key called `name` that has any value.

// `*` can also appear in the key selector
// ```javascript
// var nameAndFunc = {name: '*', '*': isFunction};
// ```

// `*` can be used for multiple key value wildcards. However, since JavaScript object keys must be unique, it must be
// written like `*something*` (any arbitrary name between two *s).

// ```javascript
// var twoStrings = {'*a*': isString, '*b*': isString};
// ```
// This operator is super buggy right now :-(

// {} and []
// ---------

// The empty object and empty array predicates will match either an object or an array, but not look at its contents.
// If we didn't care about the contents of our article tags we could have written
// ```javascript
// var tagsPresentButUnaccountedFor = {title: isString, author: isString, published: isDateString, tags []};
// ```

// If all we wanted to do was make sure that each article in our article array was an object
// ```javascript
// var articles_array = {articles: [{}]};
// ```

// Both the empty array and empty object notation are shorthands for `isArray` and `isObject` predicates.

// (...)
// -----
// Parens are a way of marking a rule as optional. For example

// ```javascript
//   {title: isString, author: isString, (website): isUrl}
// ```

// If the website field is present in an object, then the predicate must succeed or the parse will fail.
//
// () can also be combined with other special operators.

//```javascript
//	{title: isString, '(author)': isString, '(*)': isString, '(*)': isBool}
//```
// will optionally match a field called author that is a string, a field named anything that is a string, and
// another field named anything that is a bool

//```javascript
//	{title: isString, author: isString, '(**)': '*'}
//```
// will require a title and author fieldds whose types are strings, and ignore all other 0 or more keys. We can also place
// type constraings on the remaining keys like so
//```javascript
//	{title: isString, author: isString, '(**)': isString}
//```
// which requires all remaining fields to strings


// Composing predicate functions
// -----------------------------

// The `composePredsWith` function takes an array of 1-argument predicates and pipes them together using `glue`.
// By default, predicates are glued together with `&&`.

// As an example, let's make a predicate that only allows non-empty arrays
// ```javascript
// var isNonEmptyArray = compose1PredsWith([function(v){return !isEmpty(v)}, isArray], and);
// ```
// or a parser that allows either an empty array or an array of tags
// ```javascript
// var tagsOrEmpty = compose1PredsWith([parser([tag]), isEmptyArray], or);
// ```

// To hide the explicit function application, scheming json also provides a composer called `o`.

// The Composer
// ------------
// The composer is an easier way of using `composePredicatesWith`.
// Initiall, the first predicate is wrapped with `o`, (e.g. `o(myPred)`),
// and subsequent predicates can be combined with it using the 
// `.and(...)`, `.or(...)`, `.nand(...)`, and `.nor(...)` methods.
// For example
// 
// ```javascript
// var compoundChain = o(myPred).and(myPred1).nand(myPred2);
// ```
// 
// To evaluate the chain, either pass in a value after the last item
// (i.e. `o(myPred).and(myPred1).nand(myPred2)(theValue)`)
// or use `()` to get a normal function that can be used on a value
// 
// ```javascript
// var compoundPred = o(myPred).and(myPred1).nand(myPred2)();
// var result = compoundPred(myVal);
// ```

// The code
// --------

'use strict';
function schemingJson(exports){
	// browser for now
	exports = exports || window;

// Definition of Specials
// --------
// **Definitions for parsing special operators from strings**
var SPECIALS = [
	// The `*` operator, matches just `'*'`, or `'*...*'` (two `*` with anything inbetween)
	{name: 'STAR',		rule: /(?:^\*$)/, 			type: ['KEY', 'VALUE']},
	{name: 'STAR',		rule: /(?:^\*([^*]+)\*$)/,	type: ['KEY', 'VALUE']},
	// The `**` operator, matches just `'**'`
	{name: 'STAR_STAR',	rule: /^\*{2}$/,			type: ['KEY']},
	// The `$...$` sibling value operator, matches anyting between two `$`.
	// The regex captures the content between the dollar signs as a group
	{name: 'SIBLING',	rule: /^\$(.+)\$$/,			type: ['KEY']},
	{name: 'OPTIONAL', 	rule: /^\((.+)\)$/,			type: ['EXISTENTIAL']}
];


function p_tail(s, acc) {
	var selector = _.last;

	function parse1(s, rule) {
		if(!rule || !s) { return undefined; }

		var matches = s.match(rule.rule);
		var anyMatched = !_.isNull(matches);

		if(anyMatched) {
			return (selector(matches.slice(1)) || '');
		} else {
			return undefined;
		}
	}

	function selectRule(s) {
		return SPECIALS.filter(function(v){ return !_.isUndefined(parse1(s,v))})[0];
	}

	acc = acc || [];

	var rule = selectRule(s);
	var result = parse1(s, rule);
	
	if (result === undefined) return acc;
	return p_tail(result, acc.concat({input: s, name: rule.name, result: result}));
}

// **Parse out any matching special symbol in a string `s`**
function parseSpecial_old(s) {

	function parseSymbol(s, regex, selector) {
		// Default to selecting the last regex group in the match
		// (The matched string if there are no groups, otherwise the last defined group)
		// This can be overridden using a custom `selector` funcion.
		selector = selector || _.last;

		// return any regex matches (`String.match` returns `null` (not `undefined`) if it doesn't find any matches)
		var matches = s.match(regex);
		if (!_.isNull(matches)) {
			return selector(matches);
		}
	}

	// Check to see if `s` matches against all definitions in `SPECIALS`
	// and return an array of matching objects
	return SPECIALS.map(function(v) {
		// object with the special name, the result of the parse, and the original input string `s`
		return {name: v.name, result: parseSymbol(s, v.rule), input: s};
	}).filter(function(v){
		// filter by any special found (`parseSymbol` returns `undefined` if nothing was found)
		return !_.isUndefined(v.result);
	});
}

var parseSpecial = p_tail;


// Built-in Predicates
// -------------------

var isArray		=  _.isArray;
var isString 	=  _.isString;
var isBoolean 	=  _.isBoolean;

// Note that this is *way* different from `_`'s built-in `_.isObject` function
// it returns true if it's an object that's not an array or a function
var isObject 	= function(val) { return (_.isObject(val) && !_.isArray(val) && !_.isFunction(val)); };
var isFunction	= _.isFunction;
var isNumber	= _.isNumber;
var isUndefined	= _.isUndefined;

// nb _.isEmpty returns `true` for primatives like strings and numbers
var isEmpty 	= _.isEmpty;
var isNonempty	= function(val) { return !_.isEmpty(val) }

// used for the `*` operator
var isAnything  = function() { return true; }

// see if array a is a subset or b
// returns true for improper subsets as well
function isSubset(a, b) {
	function s(x) { return _.uniqWith(x, _.isEqual) }
	return (_.intersectionWith(s(a),s(b),_.isEqual).length === s(a).length);
}

// Logical funcs, to be used with JavaScript's built-in operators can't be directly passed
function id(x) { return x; }
function not(x) { return (!x); };
function and(a,b) { return (a && b); };
function or(a,b) { return (a || b); }
function nand(a,b) { return (!a || !b); };
function nor(a,b) { return (!a && !b); };

// for operating on thunked values (see `composePredicatesWithWrapped` below)
function andWrapped(a,b) { return (a() && b()); }
function orWrapped(a,b) { return (a() || b()); }

// **Test for a stop value**
//
// JSON only has two compound data types, Objects and Arrays.
// If something is not an object, or an array, we want to treat it as a value
// This is a little fuzzy, since we also want to treat functions as a function value
// not an object (even though they are Objects), as it allows is to substitute schema
// pieces with parser functions
function isStopValue(val) {
	// since `typeof` a function is `'function'`, this will only return true
	// for the kind of Objects we're interested in
	function isPrimative(val) { return (typeof val !== 'object') } 
	// now make sure that our object isn't an Array, and isn't an empty array
	// since we want to treat empty objects and empty arrays as shorthands for
	// `{} = isObject`, and `[] = isArray`.
	return isPrimative(val) || (_.isObject(val) && _.isEmpty(val)); 
}

// Utility Functions
// -----------------

// **Compose an aray of two-argument predicates together using the chaining function `glue`**
function composePredicatesWith(preds, glue) {
	// if no chaining function is used, default to `and`
	glue = glue || and;

	// need at least two arguments for and, or, glue etc
	if (preds.length < 2) {
		// just return a parser for the first item of `preds`
		return valueParser(preds[0]);
	}

	// otherwise return a function that will compose parsers for each value in `preds`
	return preds.reduce(function(acc, current) {
		var c = valueParser(current);
		return function(x) { 
			return glue(acc(x), c(x)); 
		}; 
	});
}

// **Compose an aray of two-argument predicates together using the chaining function `glue`, 
// wrapping the values in thunks**
//
// Like `composePredicatesWith`, but it wraps the parsers in thunks
// to avoid evaluating a possibly undefined value (like calling `.reduce` on an object).
// This is mainly so that JavaScript's built-in short circuiting can skip over evaluating
// things we don't need to (if for example our first predicate is `isArray`, and it fails,
// don't continue evaluating the chain)
function composePredicatesWithWrapped(preds, glue) {
	glue = glue || andWrapped;

	if (preds.length < 2) {
		// need at least two arguments for and, or, glue etc
		return valueParser(preds[0]);
	}

	return preds.reduce(function(acc, current) {
		var c = valueParser(current);
		return function(x) { 
			// wrapping the values allows the boolean short-circuiting
			// to keep undefined values from being evaluated
			var wrapped_acc = function() { return acc(x); } 
			var wrapped_c = function() { return c(x); }	

			return glue(wrapped_acc, wrapped_c); 
		}; 
	});
}

// The Composer
// ------------
// The composer is an easier way of using `composePredicatesWith`.
// Initiall, the first predicate is wrapped with `o`, (e.g. `o(myPred)`),
// and subsequent predicates can be combined with it using the 
// `.and(...)`, `.or(...)`, `.nand(...)`, and `.nor(...)` methods.
// For example
// 
// ```javascript
// var compoundChain = o(myPred).and(myPred1).nand(myPred2);
// ```
// 
// To evaluate the chain, either pass in a value after the last item
// (i.e. `o(myPred).and(myPred1).nand(myPred2)(theValue)`)
// or use `()` to get a normal function that can be used on a value
// 
// ```javascript
// var compoundPred = o(myPred).and(myPred1).nand(myPred2)();
// var result = compoundPred(myVal);
// ```
function o(initial) {
	// array of functions that will eventually be chained together
	var funcs = [];
	// used to make sure that there's at least one function... can't use `o()` directly!
	var INITIALIZED = false;


	// **Composer utility functions**

	// **expand** If the function we're trying to chain is also a composer, convert the chain
	// to a function by calling it (allows for nested chains/composition of chains)
	function expand(f) {
		// check for some meta-data on the function to see if it's a normal function
		// or a composer chain
		if(f.__IS_COMPOSER__) { return f() }
		return f;
	}

	// **applyState** Transform any two argument function into a new function that applies the threaded state
	// as the first argument, and an input value to the second argument. 
	function applyState(g) {
		return function(f) {
			return function(state, x) {
				return (g(state, f(x)));
			}
		}
	}

	// **statefulAnd** Short-circuiting `and`. Takes a function `f` as a parameter and returns a new function
	// that acceps the threaded `state` and a value `x`. It returns the result of `and`ing the
	// threaded state with `f(x)`.
	function statefulAnd(f) { // allows short circuit
		return function(state, x) {
			return (state && f(x));
		}
	}

	// **statefulOr** Short-circuiting `or`. Takes a function `f` as a parameter and returns a new function
	// that acceps the threaded `state` and a value `x`. It returns the result of `or`ing the
	// threaded state with `f(x)`.
	function statefulOr(f) {
		return function(state, x) {
			return (state || f(x));
		}
	}
	
	// **statefulNand** Short-circuiting `nand`. Takes a function `f` as a parameter and returns a new function
	// that acceps the threaded `state` and a value `x`. It returns the result of `nand`ing the
	// threaded state with `f(x)`.
	function statefulNand(f) {
		return function(state, x) {
			// this is equivalent to `!(state && f(x))`, but is broken up to allow
			// short circuiting
			return (!state || !f(x));
		}
	}
	
	// **statefulNor** Short-circuiting `nor`. Takes a function `f` as a parameter and returns a new function
	// that acceps the threaded `state` and a value `x`. It returns the result of `nor`ing the
	// threaded state with `f(x)`.
	function statefulNor(f) {
		return function(state, x) {
			// this is equivalent to `!(state || f(x))`, but is broken up to allow
			// short circuiting
			return (!state && !f(x));
		}
	}


	// **threadState** Takes an array of functions that take a threaded state argument, and a value argument
	// and returns a function that will thread a value `v` through all the composed chain of functions
	function threadState(funcs) {
		return function(v) {
			return funcs.reduce(function(acc,currentFunc){
				return currentFunc(acc, v);
			}, initial(v));
		}
	};

	// **The main composer function/object**
	
	// This is a function, not an object literal so that we can call it
	// as of es5 there's no way to make something callable down the road.
	function o_o(){
		// check to see if it was an `()` function call
		if (arguments.length === 0) {
			// If everything has been properly set up, return the composed function
			// from the array of `funcs`
			if(INITIALIZED) {
				return threadState(funcs);
			} else {
				// Oops, we don't have any functions to work with!
				// Could return the identity function or something here,
				// (or a function that always returns `true`), but it seems like
				// it would probably be an error, not an intentional action on the
				// part of the user.....
				throw new Error("Not initialized!");
			}
		// The call had 1 or more arguments, so we're applying the chain to a value
		} else {
			// Ff this is the first time we've recieved a value, this is the initial
			// function wrapping (which will be bound to the `initial` variable named)
			// in the function definition of `function o(initial)`
			if (!INITIALIZED) {
				// Set our tracker to true
				INITIALIZED = true; 
				// Return the `o` composer object
				return this;
			} else {
				// Create a function from the threaded functions and apply the arguments
				// recieved to the composed function
				return threadState(funcs).apply(this, arguments);
			}
		}
	}

	// Set metadata on the composer function to mark it as a composer chain
	o_o.__IS_COMPOSER__ = true;

	// Register the `.and(...)` method
	o_o.and = function(f) {
		funcs.push(statefulAnd(expand(f)));
		return this;
	}

	// Register the `.nand(...)` method
	o_o.nand = function(f) {
		funcs.push(statefulNand(expand(f)));
		return this;
	}

	// Register the `.or(...)` method
	o_o.or = function(f) {
		funcs.push(statefulOr(expand(f)));
		return this;
	}

	// Register the `.nor(...)` method
	o_o.nor = function(f) {
		funcs.push(statefulNor(expand(f)));
		return this;
	}

	// Return the composer
	return o_o;
}

// Other utilities/types
// ---------------------

// **thunk** Represent a thunk, used for the $sibling$ paser
// could and probably should be refactored to use the composer/chain
function thunk(f) {
	// return a function taking an array of arguments to appy to `f` when the thunk
	// is executed, and a value for the `this` argument to be used for `f`. If no argument
	// is given, `undefined` is used.
	var theThunk = function(args, thisArg) {
		return f.apply(thisArg, [].concat(args));
	}
	// set metadata on the thunk function to identify it as a thunk
	theThunk.__IS_THUNK__ = true;
	return theThunk;
}

// **Failure** Optional type used for chaining objects to nuke the chain if one step fails.
// The `fakeFunctionNames` argument in the constructor is a list of method names
// that the `Failure` object should have to make it indistinguishable to the original
// object's API.
// When a failure occurs, a Failure object can be swapped in for the original object
// and the failure propagages down the chain (since Failure will return an identical Failure
// object for any method call)
function Failure(fakeFunctionNames) {
	fakeFunctionNames = fakeFunctionNames || [];
	var fail = {};

	// create Failure-returning functions for each of the fake method names
	fakeFunctionNames.forEach(function(v){
		fail[v] = function() { return new Failure (fakeFunctionNames) }
	});
	// Register the fake methods onto the failure object
	_.merge(this, fail);

	return this;
}

// **parseSiblingVar** Parse a '$Sibling$' special. Takes a string value `v`, and a function `f` that dispatches
// on the value returned by the sibling parser
function parseSiblingVar(v, f) {
	var token = parseSpecial(v).filter(function(t){ return t.name === 'SIBLING'; })[0];
	if(token) {
		return thunk(f(token.value));
	}
}

// **parseSiblingKey** Takes a key name, and returns a function taking an object `d`, and a value `val`
// and check to see whether the value of `keyName` in the object is equal to `val`
// Used in the `$sibling$` special parser
function parseSiblingKey(keyName) {
	return function(d, val) {
		if(d[keyName]) {
			return _.isEqual(d[keyName], val);
		}
		return false;
	}
}

// Parsers
// -------

// **valueParser** Return a predicate for a value v
// Defaults to a parser that check to see if any input is equal to v
function valueParser(v) {
	var p = function(x){ return _.isEqual(x,v); };

	if (_.isObject(v))		p = isObject;
	if (_.isArray(v))		p = isArray;
	if (_.isUndefined(v))	p = isUndefined;
	if (_.isFunction(v))	p = v;

	return p;
}

// **arrayParser** Returns compound parser for each item inside of an array `a` (using `and`)
function arrayParser(a) {
	// get a parser for each value inside of `a`
	var preds = a.map(function(v){ return parser(v); });

	// ugh, this always returns true for an empty list. what is a sane default? 
	// Compose all the parsers in `preds` into one big function that will
	// match all the criteria defined in `a`
	function processArray(a) {
		var p = composePredicatesWith(preds, and);
		return a.reduce(function(acc, current){
			return acc && p(current);
		}, true);
	}

	// wrap values to make sure if isArray fails, the rest of the computation short circuits
	// otherwise the call to a.reduce generates an exception
	return composePredicatesWithWrapped([isArray, processArray], andWrapped);
}

// **objectParser** Returns a compound parser matching schema rules for each key and value of an object `o`
function objectParser(obj) {
	// The object parser works by treating the object as an array of key value pairs
	// Schema rules for an object can either be **bound** or **free**
	// A bound rule would be something like `{name: isString}` while a free rule would be
	// `{'*': isString}` or `{'**': '*'}`. Generally free rules are wildcards, matching anything
	// in the key part of the object, the value part of the object, or both.
	// The object parser works by matching up all the bound rules first, and then trying to match
	// any remaining key/value pairs left in the object to the free rules. If at the end there are any
	// 'unclaimed' object key/value pairs left over that didn't satisfy a rule, or if any of the matching for free/bound
	// variables failed, the parsing will fail.

	// **make a container for a test** takes 
	// * a test `type` (`'BOUND'` or `'FREE'`) 
	// * a `predicate` function 
	// * the number of degrees of freedom (`df`) the test consumes (i.e. how many key/value pairs the test will claim)
	// * the `cost` of conducting the test (i.e. is the test required? If the cost is 1, we are required to reduce the 
	//   remaining key/value pairs by 1, or the test fails)
	// * optionally, the `name` of the test (currently unused, but will be used for error reporting in the furture)
	function makeTest(type, predicate, df, cost, name) {
		return {type: type, predicate: predicate, df: df, cost: cost, name: name}
	}

	// **run all tests of type 'type' on an array of values**
	// takes
	// * `type` of the test (right now either `BOUND` or `FREE`)
	// * an array of `test`s created using `makeTest`
	// * an array (`arr`) of key/value pairs to run the tests against
	// the `successCount` and `totalCost` parameters are only used internally as accumulators
	// as the function is tail-recursive
	function testType(type, tests, arr, successCount, totalCost) {
		// initialize the count of tests that have succeeded
		successCount = successCount || 0;

		// no tests, no data => why are you running this?
		if(tests.length === 0 && arr.length !== 0) {
			throw new Error("Empty Test Array");
		}

		// the initial number of degrees of freedom availible is the number of key/value pairs
		var arrDf = arr.length;
		// filter out only the tests we're intereted in in the from the test array
		var filteredTests = tests
			.filter(function(t){return t.type === type; })
			// and sort by the degrees of freedom. This is because tests that use up more than one key/value
			// pair (like `**`) need to be tested after tests that consume a fixed number of degrees of freedom.
			// Internally, the df for tests that consume as many matches as they can find is `Infinity` (and so when
			// sorting it puts them at the end) 
			.sort(function(a,b) {
				if(!a && !b) { return 0; }
				if(!a) { return -1; }
				if(!b) { return 1; }
				if (a.df > b.df) return 1;
				if (a.df === b.df) return 0;
				if (a.df < b.df) return -1;
			});

		// we've tested all the data in our array! (Base case for the recursion)
		if(filteredTests.length === 0 && arr.length === 0) {
			return [];
		}

		// figure out the minimum number of df all the tests will consume
		var testCost = filteredTests.reduce(function(acc, c) { return acc + c.cost; }, 0);
		// if this is the first time we've computed the cost, use the cost, otherwise use the cost
		// for the all the tests. This is passed through the recursions using an accumulator.
		totalCost = totalCost || testCost;

		// if we expect to consume more key/value pairs than exist, the test must fail
		if (testCost > arrDf) throw new Error("Not enough degrees of freedom available to perform test");

		// pick out the first test from the test array
		var currentTest = filteredTests[0];
		// put the rest into a new array
		var remainingTests = filteredTests.slice(1);

		// map the current test (which has both key and value tests) over the array of key/value pairs
		var testResults = arr.map(function(v){ 
			var keyTest = key(currentTest.predicate)(key(v));
			var valueTest = value(currentTest.predicate)(value(v));
			return keyTest && valueTest;
		});
		
		// add the number of successes from our current test to the running total
		var successes = successCount + testResults.reduce(function(a,c) {if(c){ return a+1; } return a;}, 0);

		// reduce our value array to get rid of any values that were consumed ("claimed") by the test we just ran
		var reducedArray = [];
		// if the test has infinite degrees of freedom, it will claim every key/value pair for which
		// it succeeded
		if (currentTest.df === Infinity) {
			for(var i=0; i<testResults.length; i++){
				if(!testResults[i]) { reducedArray.push(arr[i]) };
			}
		} else {
			// otherwise match the first `df` successes, and leave the rest
			var pushed = 0;
			for(var i=0; i<testResults.length; i++){
				if(pushed <= currentTest.df) {
					if(!testResults[i]) { reducedArray.push(arr[i]) };
				} else {
					reducedArray.push(arr[i]);
				}
			}
		}

		// we just ran the last test
		if (remainingTests.length === 0) {
			// if we didn't have enough successes to meet the minimum required number of successes
			// then fail
			if (successes < totalCost) {
				throw new Error("Couldn't satisfy required predicate");
			}
			// return the reduced array (which at this point should be `[]`)
			return reducedArray;
		}

		// recur using the original `type`, the tests we haven't yet conducted, 
		// the reduced array of key/value pairs that haven't yet been claimed
		// the tallied number of successes, and the total cost of all of the tests
		return testType(type, remainingTests, reducedArray, successes, totalCost);
	}

	// **todo** transition from key/value pair array to object -> for now just use _.toPairs ?

	// predicate to test whether an `x` is equal to `v`
	function is(v) { return function(x) { return x === v; }}


	// quick and dirty pair abstraction with getters
	function key(pair) { return pair[0]; }
	function value(pair) { return pair[1]; }
	function makePair(key, value) { return [key, value]; }

	// alias for our make predicate pair
	var makePredicatePar = makePair;

	// convert our object to an array of key/value pairs and run the tests on it
	function evalObject(obj, tests) {
		var pairs = _.toPairs(obj);
		
		// evaluate all the `'BOUND'` tests first
		var boundResults;
		try {
			boundResults = testType('BOUND', tests, pairs);
		} catch(e) {
			console.log(e);
			return false;
		}

		// evaulate all the `'FREE'` tests
		var freeResults;
		try {
			freeResults = testType('FREE', tests, boundResults);
		} catch(e) {
			console.log(e);
			return false;
		}

		// if the tests didn't fail, and we don't have any unclaimed
		// key/value pairs, then all the tests succeeded!
		return freeResults.length === 0;
	}

	// parse out specials from the keys and values of an object
	// and construct the required tests described in the object schema
	function parseSchemaObject(obj) {
		var keys = Object.keys(obj);
		var tests = [];

		// parse specials out from the keys
		keys.forEach(function(k){
			var specials = parseSpecial(k);

			// no specials were found in the key, so we interpret as matching the value of the key
			if (specials.length === 0) {
				tests.push(makeTest('BOUND', makePredicatePair(is(k), parser(obj[k])), 1, 1));
			}

			// is the key optional? I.e. `'(name)'`
			var optional = specials.reduce(function(acc,v){ return acc || v.name === 'OPTIONAL'}, false);
			// is the key a `*`?
			var star = specials.reduce(function(acc,v){ return acc || v.name === 'STAR'}, false);
			// is the key a `**`?
			var star_star = specials.reduce(function(acc,v){ return acc || v.name === 'STAR_STAR'}, false);

			if (star) {
				// * matches exactly one key/value pair
				var cost = 1;
				// (*) matches 0 or 1, so the `cost` of the test is 0, but the df of the test is still 1
				if(optional) { cost = 0; }
				tests.push(makeTest('FREE', makePredicatePair(isAnything, parser(obj[k])), 1, cost));
			}

			if (star_star) {
				// ** matches at least 1 key/value pair
				var cost = 1;
				// an optional test doesn't cost anything
				if(optional) {cost = 0; }
				// since ** consumes all matches, its degrees of freedom is `Infinity`
				tests.push(makeTest('FREE', makePredicatePair(isAnything, parser(obj[k])), Infinity, cost));
			}

			// lastly, the case for optional values `'(name)'` with no specials
			if(optional && !(star||star_star)) {
				// the value inside of the parens => `name` in our example
				var testVal = specials[0].result;
				// the cost is 0, the df is 1, and we use is(testVal) to match on the value inside the parens
				tests.push(makeTest('BOUND', makePredicatePair(is(testVal), parser(obj[k])), 1, 0));
			}

		});

		// return the parser built out from the schema
		return function op(o) {
			return evalObject(o, tests);
		};
	}

	// parse the object and return a parser
	return parseSchemaObject(obj);
}

// **The combined parser generator**
function parser(v) {
	// default value parser fallback
	var p = valueParser; 

	// dispatch on arrays
	if (isArray(v)) {
		// if [], make it a shortcut for isArray
		if(isEmpty(v)) {
			p = function(x){ return isArray; };
		// override valueParser, and use the schema parser for arrays
		} else {
			p = arrayParser;
		}
	}
	// dispatch on object
	if (isObject(v)) {
		// if {}, make it a shortcut for isObject
		if(isEmpty(v)) {
			p = function(x) { return isObject; };
		// override valueParser, and use the schema parser for objects
		// (Note that this def of isObject excludes arrays and functions.)
		} else {
			p = objectParser;
		}
	}

	// dispatch on string
	if (isString(v)) {
		// test for the presence of any specials
		var specials = parseSpecial(v);
		if(specials.length > 0) {
			// right now we're assuming that there can only be one special
			// per string (which isn't true), but this works for now
			switch (specials[0].name) {
				// match `*` up to isAnything
				case 'STAR':
					p = function(x){ return isAnything; };
					break;
				// match up `$...$` to the sibling parser
				case 'SIBLING':
					p = function(x){return parseSiblingVar(x, parseSiblingKey)};
					break;
				// otherwise use the default parseSpecial parser
				default:
					p = function(x) { return parseSpecial; }
			}
		};
	};

	// return the dispatched parser
	return p(v);
}

// register the components to export
exports['parser'] = parser;
exports['o'] = o;
exports['Failure'] = Failure;

return exports;

};

module.exports = schemingJson({});

},{}]},{},[1]);
