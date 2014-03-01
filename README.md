adt.js
======

Algebraic data types and immutable structures for Javascript.

Features
--------

adt.js gives you the following for free:

* Immutablity
* Type-checking attributes
* Deep equality and cloning
* Curried constructors
* `toString` and `toJSON` implementations
* Enums
* [Sweet.js](https://github.com/mozilla/sweet.js) macros

Install
-------

`npm install adt`

Basic Usage
-----------

Let's start by creating a simple `Maybe` ADT for possible failure:

**JS:**
``` js
var adt = require('adt');
var Maybe = adt.data({
  Nothing: null,
  Just: { value: adt.any }
});
```

**CS:**
```coffee
{data, any, only} = require 'adt'
Maybe = data
  Nothing : null
  Just :
    value : any
```

**Macros:**
``` js
data Maybe {
  Nothing,
  Just {
    value: *
  }
}
```
`adt.any` is a value constraint that will allow anything. If you wanted to
restrict the type, you could use `adt.only`.

Here's how you might use our new data type:

```js
var noth = Maybe.Nothing;
var just = Maybe.Just(42);

// Inheritance
(just instanceof Maybe.Just) === true;
(just instanceof Maybe) === true;

// Type-checking
just.isNothing === false;
just.isJust === true;

// Record attributes
just.value === 42;

// Immutablity: `set` returns a new instance
var just2 = just.set({ value: 43 });
just !== just2;

// Retrieve values by name or by index
just.get('value') === 42;
just.get(0) === 42;
just.get(1); // Error: Out of range

// `toString` implementation
just.toString() === 'Just(42)';
```

Since `Nothing` is not a record (it doesn't have any data attributes), it
exists as a singleton instance and does not need to be instanciated.

Recursive Types
---------------

Let's define a linked-list type:

**JS:**
```js
var adt = require('adt');
var List = adt.data(function () {
  return {
    Nil: null,
    Cons: {
      head: adt.any,
      tail: adt.only(this)
    }
  };
});
```

**CS:**
```coffee
{data, any, only} = require 'adt'
List = data ->
  Nil : null
  Cons :
    head : any
    tail : only this
```

**Macros:**
```js
data List {
  Nil,
  Cons {
    head: *,
    tail: List
  }
}
```

Note that we've introduced a lambda to house our definition. With our `Maybe`
type this wasn't necessary, because we didn't need to reference the ADT itself.
But here, we want to use `adt.only` to put a constraint on the value of `tail`
so it can only contain `List` types. If we left out the lambda and just used
the object literal syntax, `List` wouldn't exist when we try to pass it to
`adt.only` and we'd get a `ReferenceError`. See the end of this document for
an alternative that does not require a lambda.

And now let's put it to good use:

```js
var list = List.Cons(12, List.Cons(42, List.Nil));

// Record attributes
list.head === 12;
list.tail.toString() === 'Cons(42, Nil)';

// Deep equality
var list2 = List.Cons(42, List.Nil);
list.tail.equals(list2) === true;

// Instanciate with key/value pairs
List.Cons.create({
  head: 42,
  tail: List.Nil
});

// Curried constructor
var consPartial = List.Cons(12);
var list3 = consPartial(List.Nil);

// Constraints
List.Cons(42, 12) // TypeError!
```

Enums
-----

Let's define a simple days-of-the-week enum using `adt.enumeration` or its
alias `adt.enum`:

**JS:**
```js
var Days = adt.enum('Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat');
```

**Macros:**
```js
enum Days {
  Sun, Mon, Tues, Wed, Thur, Fri, Sat
}
```

Enums can be compared using `lt`, `lte`, `eq`, `gte`, and `gt`.

```js
var day1 = Days.Tues;
var day2 = Days.Fri;

day1.lt(day2) === true;
day2.gt(day1) === true;
day1.eq(Days.Mon) === false;
```

Enums can also have constant values for JSON serialization:

**JS:**
```js
var Days2 = adt.enum({
  Sun  : 1,
  Mon  : 2,
  Tues : 3,
  Wed  : 4,
  Thur : 5,
  Fri  : 6,
  Sat  : 7
});

// Our previous definition serializes everything to null.
Days.Mon.toJSON() === null;

// But our new one serializes to an integer.
Days2.Mon.toJSON() === 2;
```

**Macros:**
```js
enum Days2 {
  Sun = 1,
  Mon = 2,
  Tues = 3,
  // ...etc
}
```

Note that the value you give it does not affect the comparison methods. That
is determined solely by insertion order.

Enums aren't really special. They are just normal ADTs with some extra
behavior. You are not restricted to only using singleton types like we did
above. You could just as easily have an enum of record types too. Likewise, you
can also give a value to any singleton type. `null` is just the default value
and often times a good representation of the type (Nothing, Nil, Empty, etc).

Newtypes
--------

Sometimes you just need a type that exists by itself. Use `adt.newtype` as
a shortcut:

**JS:**
```js
// Instead of this:
var Lonely = adt.data({
  Lonely: {
    value: adt.any
  }
});
Lonely = Lonely.Lonely;

// Do this:
var Lonely = adt.newtype('Lonely', {
  value: adt.any
});
```

**Macros:**
```js
newtype Lonely {
  value: *
}
```

Constraints
-----------

adt.js has two builtin value constraints: `any`, to represent the lack of a
constraint, and `only`, to restrict a value to certain types.

```js
// `any` is an id function
adt.any(12) === 12;
adt.any('Foo') === 'Foo';

// Only is a constraint factory
var onlyNumbers = adt.only(Number);
var onlyStrings = adt.only(String);
var onlyPrimitives = adt.only(Number, String, Boolean);

onlyNumbers(12) === 12;
onlyStrings('Foo') === 'Foo';
onlyPrimitives(/^$/); // TypeError!
```

Constraints are just functions that take a value and return another or throw an
exception.

```js
function toString (x) { 
  return x.toString();
};

var OnlyStrings = adt.newtype({
  value: toString
});

OnlyStrings(12).value === '12';
```

Sealing Your ADT
----------------

All ADTs are left "open" by default, meaning you can add types and fields to it
at a later time. You can close your ADT by calling `seal`.

```js
var Maybe = adt.data();
var Nothing = Maybe.type('Nothing');
var Just = Maybe.type('Just', { value: adt.any });

// Close it.
Maybe.seal();

// Calling `type` results in an error
Maybe.type('Foo'); // Error!
```

Object Literal Insertion Order
------------------------------

Astute readers might notice that adt.js relies on a controversial feature: the 
host engine maintaining insertion order of keys in object literals. It's true
that the Javascript spec does not require this feature. However, it has become
a defacto standard, and all engines implement this feature for the string keys
we are using.

adt.js also offers a "safe" API that does not rely on this feature:

```js
var List = adt.data(function (type, List) {
  type('Nil', null);
  type('Cons', adt.record(function (field) {
    field('head', adt.any);
    field('tail', adt.only(List));
  }));
});
```

In fact, this is just the desugared form of the terse API. See the end of this
document for an alternative that uses chaining instead of lambdas and closures.

Immutability
------------

Javascript is inherently mutable, and so adt.js can't guarantee immutablity,
only facilitate it. By using `set` instead of direct attribute assignment, we
get safe, immutable structures. But if we were to store say an object literal
as a value, we could certainly get a reference to it and mutate it, affecting
any data that might be sharing it.

```js
var obj = { foo: 'bar' };
var just1 = Just(obj);
var just2 = Just(obj);

// Bad!
just1.value.foo = 'baz';
just2.value.foo === 'baz';
```

Deep Equality
-------------

adt.js only performs deep equality on adt.js types. It does not perform deep
equality on native arrays or objects. Anything that is not an adt.js type is
compared using strict equality (`===`).

```js
var arr = [1, 2, 3];
var just1 = Just(arr);
var just2 = Just(arr);

just1.equals(just2) === true;
just1.equals(Just([1, 2, 3])) === false;
```

If you would like to extend this behavior, you can override the default method
for equality on native JS types. For example, if you were using lodash:

```js
// Deep equality on all native JS types (Objects, Arrays, RegExps, Dates, etc.)
adt.nativeEquals = _.isEqual;
```

Cloning
-------

adt.js types all have a `clone` method for returning a safe copy of a data
structure. As with deep equality, it only clones adt.js types and copies arrays
and objects by reference. Singleton instances will always return the same
instance when copied.

```js
var just1 = Just(42);
var just2 = just.clone();

just2.value === 42;
just1 !== just2;
```

As with equality, you can extend the default cloning behavior for native JS
types. Using lodash:

```js
adt.nativeClone = _.cloneDeep;
```

Overriding `apply`
------------------

For some types, it can be nice to have some sugar on the parent type. For
example, it would be nice if you could build a `List` like you would an
`Array`:

```js
var arr = Array(1, 2, 3);

// Wouldn't this be nice?
var list = List(1, 2, 3);
list.toString() === 'Cons(1, Cons(2, Cons(3, Nil)))';
```

adt.js detects when you override your `apply` method and can use that to
create your types.

```js
List.apply = function (ctx, args) {
  // Hypothetical `fromArray` function
  return List.fromArray(args);
};
```

Pattern Matching
----------------

Data types made with adt.js have builtin support for sparkler, a pattern
matching engine for JavaScript:

```js
data Tree {
  Empty,
  Node {
    value: *,
    left: Tree,
    right: Tree
  }
}

function treeFn {
  case Empty => 'empty'
  case Node(42, ...) => '42'
  case Node{ left: Node(12, ...) } => 'left 12'
}
```

Find out more about sparkler: https://github.com/natefaubion/sparkler

API Variety
-----------

adt.js has a versatile API, so you can define your types in a way that suits
you. Some ways are very terse, while others are "safer" (don't rely on object
insert order).

If you don't like defining recursive types within a function, you might like:

```js
var List = adt.data();
var Nil  = List.type('Nil');
var Cons = List.type('Cons', {
  head: adt.any,
  tail: adt.only(List)
});
```

This has the advantage of shaving off a few lines but requires some name
duplication.

Another way of defining "safe" types is to use chaining instead of a closure:

```js
var List = adt.data();
var Nil  = List.type('Nil');
var Cons = List.type('Cons', {})
             .field('head', adt.any)
             .field('tail', adt.only(List));
```

Depending on you needs, there should hopefully be an easy, terse way of
defining your types.

Using Macros
------------

```
npm install -g sweet.js
npm install adt
sjs -m adt/macros myfile.js
```

In your file you don't need to `require('adt')`. The macro will load it for
you when you define a data type.

One nice property of the macros is that the data constructors are automatically
brought into the surrounding scope:

```js
data List {
  Nil,
  Cons {
    head: *,
    tail: List
  }
}

// Nil and Cons are in scope.
var list = Cons(42, Cons(12, Nil));
```

When declaring your constraints, the macros try to "do the right thing". If the
identifier for the constraint starts with an upper-case letter, it will use an
`adt.only` constraint. If it starts with a lower-case letter, it will use it
as is. You can also inline a function literal as a constraint.

---

### Author
Nathan Faubion (@natefaubion)

### License
MIT
