## 0.7.2

* Fix for `Foo.type('Bar', ['a', 'b', 'c'])` form
* Fix for newtype macros

## 0.7.1

* Constructors are all bound to undefined to get around a newless edge case (#10).
* Macros renamed to leave off the dollar sign.
* Renamed `unapplyObj` to `unapplyObject` for `sparkler`.

## 0.6.4

* Update macros for sweet.js 0.3.x

## 0.6.3

* Updated for sparkler

## 0.6.2

* MACROS!
* Better sharing of methods.

## 0.6.1

* Removed unused utility function and cruft cleanup
* Added `Either` example

## 0.6.0

* BREAKING: swapped the type/constructor paramaters in the callbacks to
`data` and `type`.
* Added `toJSON` implementations
* Added hooks for extending the deep clone/equality behavior for native
JS types.
* Rewritten docs

## 0.5.0

* `single` and `record` now act as factory factories so that we can call the
returned function later withing `type` to create the actual type. This was,
singles don't need to be instanciated with parens, and we don't have to splice
the prototypes to setup the inheritance.
* `slot` was renamed to `get`.

## 0.4.0

* Changed field and typechecking methods to attributes to cut down on the
paren noise.
* Added `newtype`.

## 0.3.0

* Added enumerations
* Corrected `seel` to `seal`

## 0.2.1

* Far more flexible type creation.
* Constraints for records.

## 0.2.0

* Removed the lookup cache.
* Constructors get tagged with `className`.
* Added `unapply` and `unapplyObj` static methods to get either array or object
representations of the type.

## 0.1.0

Initial release
