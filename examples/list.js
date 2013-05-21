var adt = require('../adt');

var List = adt.data(function () {
  this.apply = function (ctx, args) {
    return this.fromArray(args);
  };
});

var Nil  = List.type('Nil');
var Cons = List.type('Cons', { 
  head: adt.any, 
  tail: adt.only(List) 
});

// Create a list from an array
List.fromArray = function (arr) {
  var i = arr.length, l = Nil;
  while (i--) l = Cons(arr[i], l);
  return l;
};

// Make it foldable
List.prototype.reduce = function (fn, memo) {
  var item = this;
  while (item.isCons) {
    memo = fn(memo, item.head);
    item = item.tail;
  }
  return memo;
};

// Create an array from a list
List.prototype.toArray = function () {
  return this.reduce(function (arr, val) {
    arr.push(val);
    return arr;
  }, []);
};

// Find the length of the list
List.prototype.length = function () {
  return this.reduce(function (len, val) {
    return len + 1;
  }, 0);
};

// Concat two lists together
List.prototype.concat = function (list) {
  return this.isNil ? list : Cons(this.head, this.tail.concat(list));
};

// Flatten a level
List.prototype.flatten = function () {
  return this.reduce(function (memo, list) {
    return memo.concat(list);
  }, Nil);
};

// Make it a functor
List.prototype.map = function (fn) {
  return this.isNil ? this : Cons(fn(this.head), this.tail.map(fn));
};

// Make it a monad
List.prototype.chain = function (fn) {
  return this.isNil ? this : this.map(fn).flatten();
};

List.of = function (val) {
  return Cons(val, Nil);
};

// Make it an applicative
List.prototype.ap = function (val) {
  return this.isNil ? this : this.chain(function (fn) {
    return val.map(fn);
  });
};

module.exports = List.seal();
