// Create specialized Maybe types using a type constructor.
// For example:
//     var NMaybe = Maybe(Number);
//     var mnum = NMaybe.Just(42); // OK
//     var mstr = NMaybe.Just('abc'); // TypeError!

var adt = require('../adt');

var Maybe = adt.construct(function (A) {
  this.of = Maybe.of;
  return {
    Nothing: null,
    Just: { value: adt.only(A) }
  };
});

// Make it a functor.
Maybe.prototype.map = function (fn) {
  return this.isNothing ? this : this.set({
    value: fn(this.value)
  });
};

// Make it a monad.
Maybe.prototype.chain = function (fn) {
  return this.isNothing ? this : fn(this.value);
};

// This `of` should never be called from the type constructor. It's copied over
// to the specialized types above.
Maybe.of = function (value) {
  if (this === Maybe) throw new Error('Bad invocation.');
  return this.Just(value);
};

// Make it an applicative.
Maybe.prototype.ap = function (arg) {
  return this.isNothing ? this : arg.map(this.value);
};

module.exports = Maybe;
