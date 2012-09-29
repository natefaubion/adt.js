var adt = require("../adt");

var List = adt.data(function () {
  this.apply = function (ctx, args) {
    return List.fromArray(args);
  };
});

var Empty = List.type("Empty");
var Cons  = List.type("Cons", { head: adt.any, tail: adt.only(List) });

// Create a list from an array
List.fromArray = function (arr) {
  var i = arr.length, l = Empty();
  while (i--) {
    l = Cons(arr[i], l);
  }
  return l;
};

// Make it foldable
List.prototype.foldl = function (fn, memo) {
  var item = this;
  while (item.isCons()) {
    memo = fn(memo, item.head());
    item = item.tail();
  }
  return memo;
};

// Create an array from a list
List.prototype.toArray = function () {
  return this.foldl(function (arr, val) {
    arr.push(val);
    return arr;
  }, []);
};

// Find the length of the list
List.prototype.length = function () {
  return this.foldl(function (len, val) {
    return len + 1;
  }, 0);
};

// Concat two lists together
List.prototype.concat = function (list) {
  return this.isEmpty() ? list : Cons(this.head(), this.tail().concat(list));
};

// Flatten a level
List.prototype.flatten = function () {
  return this.foldl(function (memo, list) {
    return memo.concat(list);
  }, Empty());
};

// Make it a functor
List.prototype.map = function (fn) {
  return this.isEmpty() ? this : Cons(fn(this.head()), this.tail().map(fn));
};

// Make it a monad
List.unit = function (val) {
  return Cons(val, Empty());
};

List.prototype.then = function (fn) {
  return this.isEmpty() ? this : this.map(fn).flatten();
};

module.exports = List;
