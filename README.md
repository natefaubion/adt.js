adt.js
======

Algebraic data types and immutable structures in Javascript

```js
// Create a new Maybe type
var Maybe = adt.data({
  Nothing : adt.single(),
  Just    : adt.record("val")
});

var nothing = Maybe.Nothing();
var just    = Maybe.Just(42);

// Inheritance
just instanceof Maybe.Just;
just instanceof Maybe;

// Types have boilerplate for type checking
just.isNothing() === false;
just.isJust() === true;

// Singles always return the same instance
nothing === Maybe.Nothing();

// Records have getters
just.val() === 42;

// And setters (which returns a new copy)
var newJust = just.set({ val: 43 });
newJust.val() === 43;
newJust !== just;

// Create a linked list
var List = adt.data({
  Empty : adt.single(),
  Cons  : adt.record("head", "tail")
});

// Record fields are applied by order
var start = List.Cons(42, List.Empty());

// Or by name using `create`
var start2 = List.Cons.create({
  head: 42,
  tail: List.Empty()
});

// Arguments to constructors are automatically curried
var partial = List.Cons(42);
var item = partial(List.Empty());

// Make it a functor
List.prototype.map = function (fn) {
  return this.isEmpty() ? this : List.Cons(fn(this.head()), this.tail().map(fn));
};
```
