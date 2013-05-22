var adt = require('../adt');
var assert = require('assert');

function ok (name, expr) {
  test(name, function () {
    assert.ok(expr);
  })
}

suite('Examples', function () {
  function times2 (x) { return x * 2 };

  suite('Maybe', function () {
    var Maybe = require('../examples/maybe');
    var just = Maybe.Just(42);
    var noth = Maybe.Nothing;

    ok('Just.map', just.map(times2).value === 84);
    ok('Nothing.map', noth.map(times2) === Maybe.Nothing);
    ok('Maybe.of', Maybe.of(42).equals(just));

    function one (x) { return Maybe.Just(x + 1); }
    function two (x) { return Maybe.Just(x + 2); }
    function not (x) { return Maybe.Nothing; }
    ok('Bind with all Justs', just.chain(one).chain(two).value === 45);
    ok('Bind with a Nothing in the middle', just.chain(one).chain(not).chain(two) === Maybe.Nothing);
  });

  suite('List', function () {
    var List = require('../examples/list');
    var list = List.Cons(1, List.Cons(2, List.Cons(3, List.Nil)));
    var fadd = function (a, x) { return a + x };
    var mtwo = function (x) { return x * 2 };

    ok('List.fromArray', List.fromArray([1, 2, 3]).equals(list));
    ok('List.apply', List(1, 2, 3).equals(list));
    ok('List.reduce', list.reduce(fadd, 0) === 6);
    ok('List.length', list.length() === 3);

    var arr = list.toArray();
    ok('List.toArray', arr.length === 3 && arr[0] === 1 && arr[1] === 2 && arr[2] === 3);
    ok('List.concat', list.concat(List(4, 5, 6)).equals(List(1, 2, 3, 4, 5, 6)));
    ok('List.flatten', List(list, List(4, 5, 6)).flatten().equals(List(1, 2, 3, 4, 5, 6)));
    ok('List.map', list.map(mtwo).equals(List(2, 4, 6)));
    ok('List.of', List.of(42).equals(List(42)));
    ok('List bind', list.chain(function (x) { return List(x, x) })
           .equals(List(1, 1, 2, 2, 3, 3)));
  });

  suite('Either', function () {
    var Either = require('../examples/either');
    var right = Either.Right(42);
    var left = Either.Left('error');

    ok('Right.map', right.map(times2).value === 84);
    ok('Left.map', left.map(times2).equals(left));
    ok('Either.of', Either.of(42).equals(right));

    function one (x) { return Either.Right(x + 1); }
    function two (x) { return Either.Right(x + 2); }
    function not (x) { return Either.Left('error'); }
    ok('Bind with all Rights', right.chain(one).chain(two).value === 45);
    ok('Bind with a Left in the middle', right.chain(one).chain(not).chain(two).equals(left));
  });
});
