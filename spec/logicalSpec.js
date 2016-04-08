describe("Logical Funcs", function(){
	var sj = require('../scheming-json.js');
	var all = sj['__ALL__'];
	var jsc = require('jsverify');
	var _ = require('lodash');

	describe("Identity", function(){
		it("should return the values it's given", function(){

		});
	});
	describe("Not", function(){
		var not = all.not;
		it("should return true for falsy values", function(){
			var prop = jsc.forall(jsc.falsy, function(f) {
				return not(f) === true;
			});
			expect(prop).toHold();
		});

		it("should return false for truthy values", function(){
			// hmm what does a generator for truthy functions look like?
		});
	});

	describe("And", function(){
		var and = all.and;
		var andWrapped = all.andWrapped;

		it("should follow the normal logical rules of &&", function(){
			var p = jsc.forall(jsc.bool, function(f) {
				return and(true, f) === f;
			});
			expect(p).toHold();

			// we should check that all the weird javascript falsy rules hold too....
			// but why would you be using them and not real bools?
			
		});

		it("should still work when using wrapped thunks", function(){
			var t = function() { return true; };
			var f = function() { return false; };

			expect(andWrapped(t,t)).toBe(true);
			expect(andWrapped(t,f)).toBe(false);
			expect(andWrapped(f,t)).toBe(false);
			expect(andWrapped(f,f)).toBe(false);

		});
	});

	describe("Or", function(){
		var or = all.or;
		var orWrapped = all.orWrapped;

		it("should follow the normal logical rules of ||", function(){
			expect(or(true, true)).toBe(true);
			expect(or(true, false)).toBe(true);
			expect(or(false, true)).toBe(true);
			expect(or(false, false)).toBe(false);
		});

		it("should still work when using wrapped thunks", function(){
			var t = function() { return true; };
			var f = function() { return false; };

			expect(orWrapped(t,t)).toBe(true);
			expect(orWrapped(t,f)).toBe(true);
			expect(orWrapped(f,t)).toBe(true);
			expect(orWrapped(f,f)).toBe(false);
		});
	});

	describe("Nand", function(){
		var nand = all.nand;
		it("should follow the normal rules of !(&&)", function(){
			expect(nand(true, true)).toBe(false);
			expect(nand(true, false)).toBe(true);
			expect(nand(false, true)).toBe(true);
			expect(nand(false, false)).toBe(true);
		})
	});
	describe("Nor", function(){
		var nor = all.nor;
		it("should follor the normal rules of !(||)", function(){
			expect(nor(true, true)).toBe(false);
			expect(nor(true, false)).toBe(false);
			expect(nor(false, true)).toBe(false);
			expect(nor(false, false)).toBe(true);
		});
	});
});

