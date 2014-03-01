var assert = require('assert');

function ok (name, expr) {
  test(name, function () {
    assert.ok(expr);
  });
}

function throws (name, fn, type) {
  test(name, function () {
    assert.throws(fn, type || undefined);
  });
}

suite('Macros', function () {
  data List {
    Nil,
    Cons {
      head: *,
      tail: List
    }
  }

  newtype Foo {
    bar: *
  }

  enum Day {
    Sun, Mon, Tues, Wed, Thurs, Fri, Sat
  }

  function toString (x) {
    return x.toString();
  }

  var deep = {
    name: {
      Day: Day,
      toString: toString
    }
  };

  data ConstraintTest {
    ClassName {
      value: Day
    },
    DeepClassName {
      value: deep.name.Day
    },
    IdentName {
      value: toString
    },
    DeepIdentName {
      value: deep.name.toString
    },
    FuncLiteral {
      value: function (x) {
        return x.toString()
      }
    }
  }

  ok('ADT brought into scope', typeof List !== 'undefined');
  ok('Constructors brought into scope',
     typeof Nil !== 'undefined' &&
     typeof Cons !== 'undefined');

  ok('Class name passes', ClassName(Sun).value === Sun);
  throws('Class name throws', function() { ClassName(42) }, TypeError);

  ok('Deep class name passes', DeepClassName(Sun).value === Sun);
  throws('Deep class name throws', function() { DeepClassName(42) }, TypeError);

  ok('Ident name passes', IdentName(Sun).value === 'Sun');
  ok('Deep ident name passes', DeepIdentName(Sun).value === 'Sun');

  ok('Func literal passes', FuncLiteral(Sun).value === 'Sun');
});
