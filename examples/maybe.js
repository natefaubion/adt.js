var adt = require('../adt');

var Maybe   = adt.data();
var Nothing = Maybe.type('Nothing');
var Just    = Maybe.type('Just', { value: adt.any });

// Make it a functor.
Maybe.prototype.map = function (fn) {
  return this.isNothing ? this : Just(fn(this.value));
};

// Make it a monad.
Maybe.prototype.chain = function (fn) {
  return this.isNothing ? this : fn(this.value);
};

Maybe.of = Just;

// Make it an applicative.
Maybe.prototype.ap = function (arg) {
  return this.isNothing ? this : arg.map(this.value);
};

module.exports = Maybe.seal();
