var adt = require("../adt");

var List = adt.data(function (list, type) {
  type('Empty');
  type('Cons', function (cons, field) {
    field('head');
    field('tail', adt.only(list));
  });
});

List.prototype.foldl = function (fn, memo) {
  var item = this;
  while (item.isCons()) {
    memo = fn(memo, item.head());
    item = item.tail();
  }
  return memo;
};

// Create a list from an array
List.fromArray = function (arr) {
  var i = arr.length, l = List.Empty();
  while (i--) {
    l = List.Cons(arr[i], l);
  }
  return l;
};

// Create an array from a list
List.prototype.toArray = function () {
  return this.foldl(function (arr, val) {
    arr.push(val);
    return arr;
  }, []);
};

// Custom toString method
List.prototype.toString = function () {
  return this.isEmpty() ? "Empty" : "Cons(" + this.head() + ", " + this.tail().toString() + ")";
};

// Find the length of the list
List.prototype.length = function () {
  return this.foldl(function (val, len) {
    return len + 1;
  }, 0);
};

// Concat two lists together
List.prototype.concat = function (list) {
  return this.isEmpty() ? list : List.Cons(this.head(), this.tail().concat(list));
};

// Flatten a level
List.prototype.flatten = function () {
  return this.foldl(function (memo, list) {
    return memo.concat(list);
  }, List.Empty());
};

// Make it a functor
List.prototype.map = function (fn) {
  return this.isEmpty() ? this : List.Cons(fn(this.head()), this.tail().map(fn));
};

// Make it a monad
List.unit = function (val) {
  return List.Cons(val, List.Empty());
};

List.prototype.then = function (fn) {
  return this.isEmpty() ? this : this.map(fn).flatten();
};
