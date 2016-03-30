// 'use strict';
// function schemingJson(exports){
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
	// var article = {title: isString, author: isString, published: isDateString, tags[tag]};
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
	// This says 'match an object with a key named `title` that's a string, with a key named `tags` holding an array of tag objects, and with 0 or more keys named anything that are all strings.

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

	// $...$
	// -----
	// The dollar sign operators allow lookup of sibling key values within the same object.

	// ```javascript
	//   {title: isString, author: myCoolLookupFunction('$title$')}
	// ```

	// Coming soon: how to write functions that can accept `$...$` arguments.


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

// (The rest of the code)
// ----------------------

// Definition of Specials
// --------
// **Definitions for parsing special operators from strings**
var SPECIALS = [
	// The `*` operator, matches just `'*'`, or `'*...*'` (two `*` with anything inbetween)
	{name: 'STAR',		rule: /(?:^\*$)/},
	{name: 'STAR',		rule: /(?:^\*([^*]+)\*$)/},
	// The `**` operator, matches just `'**'`
	{name: 'STAR_STAR',	rule: /^\*{2}$/},
	// The `$...$` sibling value operator, matches anyting between two `$`.
	// The regex captures the content between the dollar signs as a group
	{name: 'SIBLING',	rule: /^\$(.+)\$$/},
	{name: 'OPTIONAL', 	rule: /^\((.+)\)$/}
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
function objectParser(o) {
	// For holding the specials we parse out from the object
	var SPECIALS_USED;
	var SPECIALS_ENV;
	
	// **Returns true if we are parsing any specials**
	function SPECIALS_PRESENT() { return _.keys(SPECIALS_ENV.preds).length > 0; }

	// **Filter out any keys in the object that we're going to parsing in a special
	// and remove them from the general pool of keys we're going to consider.**
	//
	// Takes a `config` object with
	// * the object we're parsing,
	// * The keys that we're going to parse
	// * and an array of any specials found to be used in the object and want to test for 
	//   and remove keys from general consideration.
	// * and a special name `specialName`
	//
	// Returns a specials object with same key names a `config`, but with keys that have 
	// been filtered according to the rules of the special, and object contining all the
	// necessary predicates to parse the special on the object.
	function genericStar(config/*={obj, keys, specialsInObject}*/, specialName){
		var obj = config.obj;
		var keys = config.keys;
		var specialsInObject = config.specialsInObject;

		// Only look at the specials that match `specialName`, and then get the schema object
		// values (which hold predicates) for each key that has the special.
		var preds = specialsInObject.filter(function(v){ return v.name === specialName }).map(function(v){ return obj[v.input] });

		// All the rest of the keys that don't use any special operator
		// by checking to see if the key value matches an input for a found
		// parsed special
		var remainingKeys = keys.filter(function(v) { 
			var notInSpecials = specialsInObject.reduce(function(acc, parsedSpecial){
				return acc && (v !== parsedSpecial.input);
			}, true);
			return notInSpecials;
		});

		// If there are any specials used in the object we're considering
		if (preds.length > 0) {
			// get any already registered preds for this special name
			// and combine them with the ones we found.
			// Start with an empty array to give a default if config.preds[SpecialName]
			// is undefined (i.e. not registered)
			config.preds[specialName] = [].concat(config.preds[specialName] || []).concat(preds);
		}

		return {obj: obj, keys: remainingKeys, specialsInObject: specialsInObject, preds: config.preds};
	}

	// **Return a parser for a special called `SPECIAL_NAME` using the special evaluator `f`**
	function test_special(f, SPECIAL_NAME){
		return function(obj) {
			// Look up the preds we need for the special in the `SPECIALS_ENV`
			var preds = SPECIALS_ENV.preds[SPECIAL_NAME];
			// Get the keys that don't use specials
			var remaining_keys = SPECIALS_ENV.keys;
			// Get the keys that do use specials
			var affected_keys = _.difference(_.keys(obj), remaining_keys); 

			// Apply the evaluator `f` for our special and return the result
			return f(obj, remaining_keys, affected_keys, preds);
		}
	};

	// **The evaluator for the * special**
	function test_star(obj, remaining_keys, affected_keys, preds) {

			function incrementIfExists(o, k, inc) {
				if(o[k]) {
					o[k] = o[k] + inc;
				} else {
					o[k] = inc;
				}
				return o;
			}
			// we need to count each distinct predicate function ... there is no way to distinguish
			// between two functions that *do* the same thing, so beware.......
			var pred_counts = preds.reduce( function(acc, p){ return incrementIfExists(acc, p, 1); }, {});

			// now, take all the keys leftover from the object that aren't in 'keys'
			// apply all the star preds
			var pred_successes = preds.reduce(function(acc_outer, p){
				var successes = affected_keys.reduce(function(acc,current){
					if(parser(p)(obj[current])) {
						return acc +1;
					} else {
						return acc;
					}
				}, 0);
				incrementIfExists(acc_outer, p, successes);
				return acc_outer;
			}, {});

			// and count how many trues there are, and make sure the numbers match up!
			//console.log(pred_counts, pred_successes);
			return _.isEqual(pred_counts, pred_successes);
		};

	// **evaluator for the ** special**
	function test_star_star(obj, remaining_keys, affected_keys, preds) {
		// make sure that any of the preds used for the ** special
		// are true all keys that are going to be evaulated using the special
		return affected_keys.reduce(function(a,k){
			var predsMatchForK = preds.reduce(function(acc,p){
				return (acc || parser(p)(obj[k]))
			}, false);
			
			return (a && predsMatchForK);
		}, true);
	};	

	// **Evaluator for keys that don't use specials**
	function test_regular_keys(obj) {
		// The keys we expected to find, based on the schema
		var expected_keys = SPECIALS_ENV.keys;
		// Keys in the object that we found that weren't described in the schema
		var unexpected_keys = _.difference(_.keys(obj), expected_keys);

		// Make sure all of the predicates in the schema hold for the expected keys
		var expected_valid = expected_keys.reduce(function(acc,k){
			// The top level object from `objectParser(o)`, should probably refactor out
			var currentPred = parser(o[k]);
			if(currentPred.__IS_THUNK__) {
					// Pass in the object context if our pred is a thunk
					// used for `$sibling$`
					return acc && currentPred([obj, obj[k]]);
				}
			return acc && currentPred(obj[k]);
		}, true);

		// Is it ok that we have any unexpected keys? If we're using specials, yes.
		var unexpected_ok = SPECIALS_PRESENT();

		// Return false if we found unexpected values and weren't using specials,
		// otherwise return our results for evaluating the expected keys
		return (unexpected_keys.length > 0)? (expected_valid && unexpected_ok) : expected_valid;
	}

	// **Test the object's keys using `test_regular_keys` and any specials evaulators**
	function testObjectKeys(obj) {
		var regular = test_regular_keys(obj);
		var specials = SPECIALS_USED.reduce(function(acc, current){
			if(SPECIALS_ENV.preds[current]) {
				return acc && SPECIALS_ENV.test[current](obj);
			} else {
				return acc;
			}
		}, true);

		// If we're using specials, make sure that both the specials evaluation
		// and the regular evaluation are true. Otherwise, we only care that the regular
		// keys are true;
		return (SPECIALS_PRESENT())? (regular && specials) : regular;
	}


	function equalKeys(x) { return _.isEqual(_.keys(x).sort(), SPECIALS_ENV.keys.sort()); }
	function subSetKeys(x) { return isSubset(SPECIALS_ENV.keys, _.keys(x)); }

	// Define which specials we're going to test for in the object keys
	var SPECIALS_USED = ['STAR_STAR', 'STAR'];

	// Get an array of specials used in the object by testing each key in `o`
	var specialsInObject = _.flatten(
			_.keys(o).map(function(v){ return parseSpecial(v) })
		).filter(function(v){ return _.indexOf(SPECIALS_USED, v.name) !== -1;});

	// Set up our environment by filtering out the keys that are used by specials
	// from the regular object keys
	var SPECIALS_ENV = SPECIALS_USED.reduce(function(acc,current){
			return genericStar(acc, current);
		}, {obj: o, keys: _.keys(o), specialsInObject: specialsInObject, preds: {}});

	// Register our specials evaluators with the environment
	SPECIALS_ENV.test = {};
	SPECIALS_ENV.test['STAR'] = test_special(test_star, 'STAR');
	SPECIALS_ENV.test['STAR_STAR'] = test_special(test_star_star, 'STAR_STAR');

	// Start building up the object parser
	var preds = [];
	// Add object test
	preds.push(testObjectKeys);

	// Ff no specials are used we want to be more strict that all keys in the object match
	// the keys specified in the schema.
	if (SPECIALS_PRESENT()) {
		preds.push(subSetKeys);

	// Otherwise, make sure that the keys in the schema that aren't specials related
	// are included in the object we're testing.
	} else {
		preds.push(equalKeys);
	}

	// Can't be {} (since we're using that as a shorthand for isObject)
	preds.push(isNonempty);
	// Make sure it's really an object! If this fails, all other tests will be skipped
	preds.push(isObject);

	// Return the composed object parser
	return composePredicatesWithWrapped(preds, andWrapped);
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
					console.log("STAR");
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

// // register the components to export
// exports['parser'] = parser;
// exports['o'] = o;
// exports['Failure'] = Failure;

// return exports;

// };
