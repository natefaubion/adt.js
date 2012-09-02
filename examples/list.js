var List = adt.data({
  Empty  : adt.single(),
  Cons   : adt.names("head", "tail")
});

// Fold left
List.prototype.foldl = function (fn, memo) {
  var item = this;
  while (item.isCons()) {
    memo = fn(item.head(), memo);
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
  return this.foldl(function (val, arr) {
    arr.push(val);
    return arr;
  }, []);
};

// Custom toString method
List.Cons.prototype.toString = function () {
  return "Cons(" + this.head() + ", " + this.tail().toString() + ")";
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

// Make it a functor
List.prototype.map = function (fn) {
  return this.isEmpty() ? this : List.Cons(fn(this.head()), this.tail().map(fn));
};
