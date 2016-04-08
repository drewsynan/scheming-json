/* global jasmine:true, beforeEach:true, jsc:true */
/* eslint strict:[2,"function"] */
beforeEach(function () {
  "use strict";
  var jsc = require('jsverify');
  jasmine.addMatchers({
    // Expects that property is synchronous
    toHold: function () {
      return {
        compare: function (actual) {

          // /* global window */
          // var quiet = window && !(/verbose=true/).test(window.location.search);
          var quiet = false;

          var r = jsc.check(actual, { quiet: quiet });

          var pass = r === true;
          var message = "";

          if (pass) {
            message = "Expected property not to hold.";
          } else {
            message = "Expected property to hold. Counterexample found: " + r.counterexamplestr;
          }

          return {
            pass: pass,
            message: message,
          };
        },
      };
    },
  });
});