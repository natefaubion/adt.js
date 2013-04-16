var adt = require('../adt');

var Maybe   = adt.data();
var Nothing = Maybe.type('Nothing');
var Just    = Maybe.type('Just', { val: adt.any });

// Make it a functor.
Maybe.prototype.map = function (fn) {
  return this.isNothing ? this : Just(fn(this.val));
};

// Make it a monad.
Maybe.prototype.chain = function (fn) {
  return this.isNothing ? this : fn(this.val);
};

Maybe.of = function (val) {
  return Just(val);
};

// Make it an applicative.
Maybe.prototype.ap = function (arg) {
  return this.isNothing ? this : arg.map(this.val);
};

module.exports = Maybe.seal();
