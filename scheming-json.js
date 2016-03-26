'use strict';
/*
	var emptyObject = {'*': [_.isObject]} // all keys have array of objects for values
	var emptyObject_ = {'*': [{}] }

To match an object with one key (called anything), whose type satisfies the predicate
	{'*': {}} // matches any key name, with a value of object (does not parse the contents)
	{'*': isObject}

	{'*': []} // matches any key name, with a value of array (does not parse the contents)
	{'*': isArray}

	{'*': isString}
	{'*': isFunction}
	{'*': isBoolean}

	{'*': isUndefined} // note you cannot yet write {'*': undefined}

To match an object with one key (called 'name'), all remaining keys have any value
	{name: isString, '**':'*'}

To match an object with one key (called 'name'), whose value satisfies the isString predicate
	{name: isString}

To match an object with one key (called 'name'), whose value is exactly 'Literal'
	{name: 'Literal'}

Special access to keys in the same object $name$ is the same as get the value of name -> d.name
	{tags: [{price: number, yen:toYen('$price$')}]}
	{tags: [{price: number, yen:toYen(function(d) { return d.price }) }]}
*/

var SPECIALS = [
	{name: 'STAR',		rule: /(?:^\*$)|(?:^\*[^*]+\*$)/},
	{name: 'STAR_STAR',	rule: /^\*{2}$/},
	{name: 'SIBLING',	rule: /^\$(.+)\$$/}
];

function parseSpecial(s) {

	function parseSymbol(s, regex, selector) {
		selector = selector || _.last;

		var matches = s.match(regex);
		if (!_.isNull(matches)) {
			return selector(matches);
		}
	}

	return SPECIALS.map(function(v) {
		return {name: v.name, result: parseSymbol(s, v.rule), input: s};
	}).filter(function(v){
		return !_.isUndefined(v.result);
	});
}



var isArray		=  _.isArray;
var isString 	=  _.isString;
var isBoolean 	=  _.isBoolean;
var isObject 	= function(val) { return (_.isObject(val) && !_.isArray(val) && !_.isFunction(val)); };
var isFunction	= _.isFunction;
var isNumber	= _.isNumber;
var isUndefined	= _.isUndefined;
var isEmpty 	= _.isEmpty;
var isNonempty	= function(val) { return !_.isEmpty(val) }
var isAnything  = function() { return true; }

function and(a, b) { return (a && b); }
function or(a, b) { return (a || b); }

function isStopValue(val) {
	function isPrimative(val) {
		switch (typeof val) {
			case 'object':
				return false;
				break;
			default:
				return true;
		}
	}

	return isPrimative(val) || (_.isObject(val) && _.isEmpty(val)); // all non-objects, or empty objects and empty arrays
}

function isSubset(a, b) {
	function s(x) { return _.uniqWith(x, _.isEqual) }
	return (_.intersectionWith(s(a),s(b),_.isEqual).length === s(a).length);
}
/***** end predicates ******/

/***** utility funcs ******/

function getPredicateForValue(v) {
	var p = function(x){ return _.isEqual(x,v); };

	if (_.isObject(v))		p = isObject;
	if (_.isArray(v))		p = isArray;
	if (_.isUndefined(v))	p = isUndefined;
	if (_.isFunction(v))	p = v;

	return p;
}

function composePredicatesWith(funcs, glue) {
	glue = glue || and;

	if (funcs.length < 2) {
		return getPredicateForValue(funcs[0]); // need at least two arguments for and, or, glue etc
	}

	return funcs.reduce(function(acc, current) {
		var c = getPredicateForValue(current);
		return function(x) { 
			return glue(acc(x), c(x)); 
		}; 
	});
}

function thunk(f) {
	var theThunk = function(args, thisArg) {
		return f.apply(thisArg, [].concat(args));
	}
	theThunk.__IS_THUNK__ = true;
	return theThunk;
}

function Failure(fakeFunctionNames) {
	fakeFunctionNames = fakeFunctionNames || [];
	var fail = {};

	fakeFunctionNames.forEach(function(v){
		fail[v] = function() { return new Failure (fakeFunctionNames) }
	});
	_.merge(this, fail);

	return this;
}

function parseSiblingVar(v, f) {
	var token = parseSpecial(v).filter(function(t){ return t.name === 'SIBLING'; })[0];
	if(token) {
		return thunk(f(token.value));
	}
}

function parseSiblingKey(keyName) {
	return function(d, val) {
		if(d[keyName]) {
			return _.isEqual(d[keyName], val);
		}
		return false;
	}
}

function arrayParser(a) {
	var preds = a.map(function(v){ parser(v) });
	
	function processArray(a) {
		var p = composePredicatesWith(preds, and);
		return a.reduce(function(acc, current){
			return acc && p(current);
		}, true);
	}

	return composePredicatesWith([processArray, isArray], and);
}

function objectParser(o) {
	var SPECIALS_USED;
	var SPECIALS_ENV;
	
	function SPECIALS_PRESENT() { return _.keys(SPECIALS_ENV.preds).length > 0; }

	function genericStar(config/*={obj, keys, anySpecials, tokenName}*/, tokenName){

		var obj = config.obj;
		var keys = config.keys;
		var anySpecials = config.anySpecials;

		var preds = anySpecials.filter(function(v){ return v.name === tokenName }).map(function(v){ return obj[v.input] });
		
		var remainingKeys = keys.filter(function(v) { 
			var notInSpecials = anySpecials.reduce(function(acc, current){
				return acc && (v !== current.input);
			}, true);
			return notInSpecials;
		});

		if (preds.length > 0) {
			if(!config.preds[tokenName]) {
				config.preds[tokenName] = preds;
			} else {
				config.preds[tokenName] = config.preds[tokenName].concat(preds);
			}
		}

		return {obj: obj, keys: remainingKeys, anySpecials: anySpecials, preds: config.preds};
	}

	function test_special(f, SPECIAL_NAME){
		return function(obj) {
			var preds = SPECIALS_ENV.preds[SPECIAL_NAME];
			var remaining_keys = SPECIALS_ENV.keys;
			var affected_keys = _.difference(_.keys(obj), remaining_keys); // keys in the object not in our filtered keys

			return f(obj, remaining_keys, affected_keys, preds);
		}
	};

	function test_star(obj, remaining_keys, affected_keys, preds) {
			function incrementIfExists(o, k, inc) {
				if(o[k]) {
					o[k] = o[k] + inc;
				} else {
					o[k] = inc;
				}
			}
			// we need to count each distinct predicate function ... there is no way to distinguish
			// between two functions that *do* the same thing, so beware.......
			var pred_counts = preds.reduce( function(acc, p){ incrementIfExists(acc, p, 1); }, {});

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
			return _.isEqual(pred_counts, pred_successes);
		};

	function test_star_star(obj, remaining_keys, affected_keys, preds) {
		return affected_keys.reduce(function(a,k){
			var predsMatchForK = preds.reduce(function(acc,p){
				return (acc || parser(p)(obj[k]))
			}, false);
			
			return (a && predsMatchForK);
		}, true);
	};	

	function test_regular_keys(obj) {
		var expected_keys = SPECIALS_ENV.keys;
		var unexpected_keys = _.difference(_.keys(obj), expected_keys);

		var expected_valid = expected_keys.reduce(function(acc,k){
			var currentPred = parser(o[k]); // the top level object, refactor out
			if(currentPred.__IS_THUNK__) {
					return acc && currentPred([obj, obj[k]]);
				}
			return acc && currentPred(obj[k]);
		}, true);

		var unexpected_ok = SPECIALS_PRESENT();

		return (unexpected_keys.length > 0)? (expected_valid && unexpected_ok) : expected_valid;
	}

	function testObjectKeys(obj) {
		// compose test_regular and all specials
		var regular = test_regular_keys(obj);
		var specials = SPECIALS_USED.reduce(function(acc, current){
			if(SPECIALS_ENV.preds[current]) {
				return acc && SPECIALS_ENV.test[current](obj);
			} else {
				return acc;
			}
		}, true);

		return (SPECIALS_PRESENT()) ? (regular && specials) : regular;
	}


	function equalKeys(x) { return _.isEqual(_.keys(x).sort(), SPECIALS_ENV.keys.sort()); }
	function subSetKeys(x) { return isSubset(SPECIALS_ENV.keys, _.keys(x)); }


	var anySpecials = _.flatten(_.keys(o).map(function(v){ return parseSpecial(v) }));

	var SPECIALS_USED = ['STAR_STAR', 'STAR'];
	var SPECIALS_ENV = SPECIALS_USED.reduce(function(acc,current){
			return genericStar(acc, current);
		}, {obj: o, keys: _.keys(o), anySpecials: anySpecials, preds: {}});

	SPECIALS_ENV.test = {};
	SPECIALS_ENV.test['STAR'] = test_special(test_star, 'STAR');
	SPECIALS_ENV.test['STAR_STAR'] = test_special(test_star_star, 'STAR_STAR');

	var preds = [];
	preds.push(testObjectKeys);

	if (SPECIALS_PRESENT()) {
		preds.push(subSetKeys);
	} else {
		preds.push(equalKeys);
	}

	preds.push(isNonempty);
	preds.push(isObject);

	return composePredicatesWith(preds, and);
}

function parser(v) {
	var = getPredicateForValue; // default value parser fallback

	if (isArray(v)) 	p = arrayParser; // override getPredicateForValue
	if (isObject(v))	p = objectParser; // override getPredicateForValue, note that this def of isObject excludes arrays and functions
	if (isString(v)) {
		var specials = parseSpecial(v);
		if(specials.length > 0) {
			switch (specials[0].name) {
				case 'STAR':
					p = isAnything;
					break;
				case 'SIBLING':
					p = parseSiblingVar(v, parseSiblingKey);
					break;
				default:
					p = parseSpecial;
			}
		};
	};

	return p(v);
}

