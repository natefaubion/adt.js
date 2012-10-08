var adt = require("../adt");

var Maybe   = adt.data();
var Nothing = Maybe.type("Nothing");
var Just    = Maybe.type("Just", { val: adt.any });

// Make it a functor.
Maybe.prototype.map = function (fn) {
  return this.isNothing() ? this : Just(fn(this.val));
};

// Make it a monad.
Maybe.unit = function (val) {
  return Just(val);
};

// Call bind `then` so that it doesn't clash with the semantics of js bind
Maybe.prototype.then = function (fn) {
  return this.isNothing() ? this : fn(this.val);
};

module.exports = Maybe;
