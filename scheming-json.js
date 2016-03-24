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

var isArray		=  _.isArray;
var isString 	=  _.isString;
var isBoolean 	=  _.isBoolean;
var isObject 	= function(val) { return (_.isObject(val) && !_.isArray(val)); };
var isFunction	= _.isFunction;
var isNumber	= _.isNumber;
var isUndefined	= _.isUndefined;
var isNonempty	= function(val) { return !_.isEmpty(val) }
var isAnything  = function() { return true; }

var specials = {
	'*': isAnything
};

function isPrimative(val) {
	switch (typeof val) {
		case 'object':
			return false;
			break;
		default:
			return true;
	}
}

function isStopValue(val) {
	return isPrimative(val) || (_.isObject(val) && _.isEmpty(val)); // all non-objects, or empty objects and empty arrays
}

function stopValuePredicate(val) {
	if (isArray(val)) return isArray;
	if (isObject(val)) return isObject;
	if (specials[val]) return specials[val];

	return function(x) {
		return _.isEqual(val,x);
	}
}

function thunk(f) {
	var EVALUATED = false;

	var theThunk = function(args, thisArg) {
		thisArg = thisArg || undefined;
		if (!_.isArray(args)) args = [args];

		var returnValue = f.apply(thisArg, args);
		EVALUATED = true;
		return returnValue;

	}
	theThunk.__IS_THUNK__ = true;

	return theThunk;
}

function Failure(fakeFunctionNames) {
	var fail = {};
	if (fakeFunctionNames) {
		fakeFunctionNames.forEach(function(v){
			fail[v] = function() { return new Failure (fakeFunctionNames)}
		});
	}

	_.merge(this, fail);

	return this;
}

function isSubset(a, b) {
	function s(x) { return _.uniqWith(x, _.isEqual) }
	return (_.intersectionWith(s(a),s(b),_.isEqual).length === s(a).length);
}

function compose1Preds(funcs) {
	function convertToPred(x) {
		var p = function(){return true;};

		if (_.isObject(x))		p = isObject;
		if (_.isArray(x))		p = isArray;
		if (_.isUndefined(x))	p = isUndefined;
		if (_.isFunction(x))	p = x;
		
		return p;
	}

	if (funcs.length < 2) return convertToPred(funcs[0]);

	return funcs.reduce(function(acc, current) {
		var c = convertToPred(current);
		return function(x) { return c(x) && acc(x)}; 
	}, function(){return true;});
}

function parseSiblingVar(v, f) {
	var isSpecial = v.match(/^\$(.+)\$$/);
	if(!_.isNull(isSpecial)) {
		var keyName = (isSpecial[isSpecial.length-1]);
		return thunk(f(keyName));
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

function parseSchemaArray(a) {
	var preds = a.map(function(v){
		if (isArray(v)) return parseSchemaArray(v);
		if (isFunction(v)) return v;
		if (isObject(v)) return parseSchemaObject(v);
	});
	
	function processArray(a) {
		var p = compose1Preds(preds);
		return a.reduce(function(acc, current){
			return acc && p(current);
		}, true);
	}

	return compose1Preds([processArray, isArray]);
}

function parseSchemaObject(o) {
	var keys = _.keys(o).sort();

	var STAR_STAR;
	var STAR;

	//see if we have any '**' wildcard keys
	var star_star_preds = keys.filter(function(k){ return k === '**'; }).map(function(k){ return o[k]; });

	if(star_star_preds.length > 0) {
		if(star_star_preds.length > 1) throw new Error("only one ** key is allowed");

		STAR_STAR = true;
		STAR_STAR_PRED = getPred(o['**']);
		keys = keys.filter(function(k) {return k !== '**'; }).sort();
	}

	//see if we have any '*' single keys
	//multiple * keys must be anded together ....
	// {*:isString, *:isBoolean, *:isString, *:'*'} -> we don't care what the keys are, but we have to have
	// two fields that are strings, and one that's a boolean, and one field that can be anything

	function filter_star(k) { return (k === '*' || k.match(/^\*[^*]+\*$/)!== null); }
	var star_preds = keys.filter(filter_star).map(function(k){ return getPred(o[k]); });

	if (star_preds.length > 0) {
		STAR = true;
		STAR_PREDS = star_preds;
		keys = keys.filter(function(k) { return !filter_star(k)}).sort();
		
	}

	

	//predicate to make sure keys are equal
	function equalKeys(x) {
		return _.isEqual(_.keys(x).sort(), keys);
	}

	//predicate to see if our filtered keys are a subset of the object keys
	function subSetKeys(x) {
		return isSubset(keys, _.keys(x));
	}

	function getPred(v) {
		if (isFunction(v))	return v;
		if (isArray(v)) 	return parseSchemaArray(v);
		if (isObject(v))	return parseSchemaObject(v);
		if (isString(v)) {
			var isSibling = parseSiblingVar(v, parseSiblingKey);
			if (isSibling) return isSibling;
		}

		return stopValuePredicate(v);
	}

	var preds = [];

	//parse each key out
	var validator = {};
	keys.forEach(function(k){
		var current = o[k];
		validator[k] = getPred(current);
	});

	

	function testObjectKeys(obj) {
		function testStarPreds(obj) {
			var star_keys = _.difference(_.keys(obj), keys); // keys in the object not in our filtered keys
			
			// we need to count each distinct predicate function ... there is no way to distinguish
			// between two functions that *do* the same thing, so beware.......

			var star_preds_counts = {};
			STAR_PREDS.forEach(function(p){
				if(star_preds_counts[p]) {
					star_preds_counts[p]++;
				} else {
					star_preds_counts[p] = 1;
				}
			});

			// now, take all the keys leftover from the object that aren't in 'keys'
			// apply all the star preds
			var star_preds_successes = {};
			STAR_PREDS.forEach(function(p){
				var successes = star_keys.reduce(function(acc,current){
					if(p(obj[current])) {
						return acc +1;
					} else {
						return acc;
					}
				}, 0);

				if (star_preds_successes[p]) {
					star_preds_successes[p] = star_preds_successes[p] + successes;
				} else {
					star_preds_successes[p] = successes;
				}
			});

			// and count how many trues there are, and make sure the numbers match up!
			return _.isEqual(star_preds_counts, star_preds_successes);
		}

		function testOtherPreds(obj) {
			return _.keys(obj).reduce(function(acc, current){
				var validatorFunc = validator[current];

				if (!validatorFunc){ // oh noooo the function is undefined
					if(STAR_STAR) { // should we accept any key name, that satisfies the ** predicate?
						return acc && STAR_STAR_PRED(obj[current]);
					}

					return acc; // we shouldn't get here... somehow it's all fucked up, so just ignore the janky predicate
				}

				if(validatorFunc.__IS_THUNK__) {
					return acc && validatorFunc([obj, obj[current]]);
				}
				return acc && validatorFunc(obj[current]);
			}, true);
		}

		return (STAR ? (testOtherPreds(obj) && testStarPreds(obj)) : testOtherPreds(obj));
	}

	preds.push(testObjectKeys);

	if (STAR_STAR || STAR) {
		preds.push(subSetKeys);
	} else {
		preds.push(equalKeys);
	}

	preds.push(isNonempty);
	preds.push(isObject);

	return compose1Preds(preds);
}

function parseSchema(schema) {
	if (isArray(schema)) return parseSchemaArray(schema);
	if (isObject(schema)) return parseSchemaObject(schema);
	throw new Error('Invalid Schema');
}

var parser = parseSchema;

