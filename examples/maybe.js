var Maybe = adt.data({
  Nothing : adt.single(),
  Just    : adt.record("val")
});

// Make it a functor.
Maybe.prototype.map = function (fn) {
  return this.isNothing() ? this : Maybe.Just(fn(this.val()));
};

// Make it a monad.
Maybe.unit = function (val) {
  return Maybe.Just(val);
};

// Call bind `then` so that it doesn't clash with the semantics of js bind
Maybe.prototype.then = function (fn) {
  return this.isNothing() ? this : fn(this.val());
};
