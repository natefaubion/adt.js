var adt = require("../adt");
var assert = require("assert");

function ok (expr, name) {
  test(name, function () {
    assert.ok(expr);
  })
}

suite("Examples", function () {
  function times2 (x) { return x * 2 };

  suite("Maybe", function () {
    var Maybe = require("../examples/maybe");
    var just = Maybe.Just(42);
    var noth = Maybe.Nothing();

    ok(just.map(times2).val() === 84, "Just.map");
    ok(noth.map(times2) === Maybe.Nothing(), "Nothing.map");
    ok(Maybe.unit(42).equals(just), "Maybe.unit");

    function one (x) { return Maybe.Just(x + 1); }
    function two (x) { return Maybe.Just(x + 2); }
    function not (x) { return Maybe.Nothing() }
    ok(just.then(one).then(two).val() === 45, "Bind with all Justs");
    ok(just.then(one).then(not).then(two) === Maybe.Nothing(), "Bind with a Nothing in the middle");
  });

  suite("List", function () {
    var List = require("../examples/list");
    var list = List.Cons(1, List.Cons(2, List.Cons(3, List.Empty())));
    var fadd = function (a, x) { return a + x };
    var mtwo = function (x) { return x * 2 };

    ok(List.fromArray([1, 2, 3]).equals(list), "List.fromArray");
    ok(List(1, 2, 3).equals(list), "List.apply");
    ok(list.foldl(fadd, 0) === 6, "List.foldl");
    ok(list.length() === 3, "List.length");

    var arr = list.toArray();
    ok(arr.length === 3 && arr[0] === 1 && arr[1] === 2 && arr[2] === 3, "List.toArray");
    ok(list.concat(List(4, 5, 6)).equals(List(1, 2, 3, 4, 5, 6)), "List.concat");
    ok(List(list, List(4, 5, 6)).flatten().equals(List(1, 2, 3, 4, 5, 6)), "List.flatten");
    ok(list.map(mtwo).equals(List(2, 4, 6)), "List.map");
    ok(List.unit(42).equals(List(42)), "List.unit");
    ok(list.then(function (x) { return List(x, x) })
           .equals(List(1, 1, 2, 2, 3, 3)), "List bind");
  });
});
