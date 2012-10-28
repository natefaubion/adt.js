adt.js
======

Algebraic data types and immutable structures in Javascript.

Install
-------

`npm install adt`

Examples
--------

```js
var adt = require("adt");

// Create a new Maybe type
var Maybe = adt.data();
var Nothing = Maybe.type('Nothing');
var Just = Maybe.type('Just', { val: adt.any });

var noth = Nothing();
var just = Just(42);

// Inheritance
just instanceof Just;
just instanceof Maybe;

// Singles always return the same instance
noth === Nothing();

// Types exported on the parent
Maybe.Just === Just;

// Type-checking
just.isNothing === false;
just.isJust === true;

// toString implementation
just.toString() === "Just(42)"

// Attributes
just.val === 42;

// Setters return a new instance
var just2 = just.set({ val: 43 });
just2.val === 43;
just2 !== just;

// Equals method recursively compares inner values
var recjust1 = Just(Just(42));
var recjust2 = Just(Just(42));
recjust1.equals(recjust2) === true;

// Create a new linked-list type
var List = adt.data();
var Empty = List.type('Empty');
var Cons = List.type('Cons', { head: adt.any, tail: adt.only(List) });

// Arguments can be applied by order
var list = Cons(42, Empty());

// Or by key-value pairs using create
var list = Cons.create({
  head: 42,
  tail: Empty()
});

// Constructors can be curried
var partial = Cons(42);
var list = partial(Empty());
```

Pattern Matching
----------------

Data types made with adt.js have builtin support for matches.js, a powerful
pattern matching library for Javascript.

```js
var pattern = require("matches").pattern;
var adt = require("adt");

var Tree  = adt.data();
var Empty = Tree.type('Empty');
var Node  = Tree.type('Node', {
  val   : adt.any,
  left  : adt.only(Tree),
  right : adt.only(Tree)
});

var treefn = pattern({
  'Empty': function () { ... },
  'Node(42, ...)': function () { ... },
  'Node{left: Node(12, ...)}': function () { ... }
});
```

Find out more about matches.js: https://github.com/natefaubion/matches.js

Usage
-----

### adt.data()

Returns a parent type which you can use to create new data types.

```js
var Maybe = adt.data();
```

You can create new data types by passing an object:

```js
var Maybe = adt.data({
  Nothing : adt.single(),
  Just    : adt.record('val')
});
```

Or you can use a callback to configure the data types. The callback is passed
two arguments: the parent type, and the `type` function. The `this` context is
also set to be the parent type.

```js
// Configure using the type function
var List = adt.data(function (List, type) {
  type('Empty');
  type('Cons', {
    head: adt.any,
    tail: adt.only(List);
  });
});

// Configure by returning a template
var List = adt.data(function (List) {
  return {
    Empty: null,
    Cons: {
      head: adt.any,
      tail: adt.only(List)
    } 
  };
});
```

#### type()

Creates and returns a new data type as a subtype of the parent. `type` can be
called with no arguments, but you should almost always provide a string name
as the first argument so that the proper type-checking and toString functions
can be generated.

```js
var Maybe = adt.data();

// Creates a new adt.single type
var Nothing = Maybe.type('Nothing')

// Or you can explicitly pass in a generated type
var Nothing = Maybe.type('Nothing', adt.single());
```

If the second argument to `type` is an object or callback, an `adt.record`
type will be created.

```js
// Create an adt.record type using a template
var Just = Maybe.type('Just', { val: adt.any });
```

#### seal()

Removes the ability to add new data types. You can call this if you don't want 
anyone else further extending the family. This will also call `seal` on any
child types.

```js
Maybe.seal();

// Throws an error
Maybe.type( ... );
```

#### apply()

Adt.js recognizes when you've overridden the `apply` method of your parent type
and will call it when you invoke the parent constructor.

```js
var List = adt.data(function () {
  this.apply = function (ctx, args) {
    return this.fromArray(args);
  };
  this.fromArray = function (arr) {
    // Build a list from an array
  };
});
```

Now we can just call `List` to build our linked list.

```js
var list = List(1, 2, 3);
list.toString() === "Cons(1, Cons(2, Cons(3, Empty)))"
```

---

### adt.single()

Generates a singleton type. Every call to the constructor returns the same
instance.

```js
var Foo = adt.single();
var foo = Foo();
foo === Foo();
```

Note: an orphan adt.single type won't have any type-checking methods, a
`toString` method or pattern matching integration.

---

### adt.record()

Generates a type that can hold other types using named fields. Fields can have
constraints to only allow certain types or to coerce one type to another.

You can create a record by passing in field names. These fields will allow
any type.

```js
var Foo = adt.record('bar', 'baz');
var foo = Foo(42, null);
foo.bar === 42;
foo.baz === null;
```

You can also pass in an object:

```js
var Foo = adt.record({
  // Allow any value
  bar: adt.any,
  // Allow only strings
  baz: adt.only(String),
  // Try to coerce a value to an integer
  bin: parseInt
});

var foo = Foo(42, "foo", "12");
foo.bar === 42;
foo.baz === "foo";
foo.bin === 12;
```

You can use chaining:

```js
var Foo = 
  adt.record()
    .field('bar')
    .field('baz', adt.only(String))
```

Finally, you can use a callback. The callback is passed two arguments, the
record type, and the `field` function. The `this` context is set to the record
type.

```js
// Configure using the `field` function
var Foo = adt.record(function (Foo, field) {
  field('bar');
  field('baz', adt.only(String));
});

// Configure by returning a template
var Foo = adt.record(function () {
  return {
    bar: adt.any,
    baz: adt.only(String)
  };
});
```

Note: an orphan adt.record type won't have any type-checking methods, a
`toString` method or pattern matching integration.

#### field(name, constraint)

Adds a new field to the type given a name and a constraint. If no constraint
is provided, `adt.any` will be used.

```js
var Foo = adt.record().field('val', adt.only(String));
```

#### seal()

Removes the ability to add new fields to the type.

```js
var Foo = adt.record('foo', 'bar').seal();

// Throws an error
Foo.field('bin')
```

#### create(obj)

Creates a new instance using key-value pairs instead of positional arguments.

```js
var foo = Foo.create({ bar: 42, baz: 'baz' });
```

#### record.set(obj)

Returns a new instance with fields changed.

```js
var foo = Foo(42, 'baz');
var foo2 = foo.set({ bar: 12 });
foo2.bar === 12;
foo2 !== foo;
```

**Note:** `set` should almost always be used instead of attribute mutation.
Just setting attributes using assignment bypasses any constraints on the field
and can cause unexpected results.

#### record.clone()

Recursively clones all values that are adt types. Native Javascript arrays and
objects are not cloned but copied by reference.

#### record.slot(index)

Returns the value at the given index. Raises an error if the index is out of
range.

```js
var foo = Foo(42, 'baz');
foo.slot(1) === 'baz';
```

#### record.equals(that)

Performs a deep equality check on all adt values. Other values will be compared
using strict equality.

```js
// Two separate instances
var foo1 = Foo(Foo(42, 'bin'), 'baz');
var foo2 = Foo(Foo(42, 'bin'), 'baz');
foo1.equals(foo2) === true;

// Does not recursively compare objects and arrays
var foo3 = Foo({ a: 1 }, 'baz');
var foo4 = Foo({ a: 1 }, 'baz');
foo1.equals(foo2) === false;
```

---

### adt.enumeration()

Generates a family of types that can be compared using `lt`, `gt`, `lte`, `gte`,
`eq`, and `neq`.

```js
var Days = adt.enumeration('Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun');
var fri = Days.Fri();
var wed = Days.Wed();
wed.lt(fri) === true;
fri.gt(wed) === true;
fri.eq(foo); // Throws a TypeError
```

It also be used just like `adt.data`.

```js
var Days = adt.enumeration();
var Mon = Days.type('Mon');
var Tue = Days.type('Tue');
// etc...

// Or with a callback
var Days = adt.enumeration(function (Days, type) {
  type('Mon');
  type('Tue');
  // etc...
});
```

---

### adt.newtype()

Creates a type that does not belong to a specific family. It's like calling
`adt.data` and only adding one type to it.

```js
var Foo = adt.newtype('Foo', { bar: adt.any, baz: adt.any });
```

---

### Constraints

Constraints are functions that either raise an error for an invalid type or
coerce the type to another.

#### adt.any

Returns whatever value is passed to it (ie. no constraint).

#### adt.only(types...)

Returns a constraint function that only allows the specified types or values.

```js
var strings = adt.only(String);
strings('foo') === 'foo';
strings(42); // Throws a TypeError

var numOrNull = adt.only(Number, null);
numOrNull(42) === 42;
numOrNull(null) === null;
numOrNull('foo'); // Throws a TypeError
```

#### Custom Constraints

Any function that takes a single value and returns another can be used as a
constraint. For example, `parseInt` can be a constraint that attempts to
coerce a value to an integer.

```js
function toString (x) { return x.toString() };

var Foo = adt.record({ bar: toString });
var foo = Foo(12);
foo.bar === '12';
```
