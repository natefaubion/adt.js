var adt = require("../adt");
var assert = require("assert");

function ok (expr, name) {
  test(name, function () {
    assert.ok(expr);
  })
}

suite("Core", function () {
  suite("adt.single()", function () {
    var Foo = adt.single();
    var foo = Foo();
    ok(foo instanceof adt.__Base__, "Instance of adt base class");
    ok(foo instanceof Foo, "Instance of constructor");
    ok(foo === Foo(), "Singles always refer to the same instance");
    ok(foo.clone() === foo, "`clone` returns the same instance");
    ok(foo.equals(new Foo), "`equals` matches same instance");
    ok(!foo.equals(12), "`equals` doesn't match something else");
    ok(Foo.create({}) === foo, "`create` returns same instance");

    var arr = Foo.unapply(foo);
    var obj = Foo.unapplyObj(foo);
    ok(arr instanceof Array && arr.length === 0, "`unapply` returns empty array");
    ok(obj instanceof Object && Object.keys(obj).length === 0, "`unapplyObj` returns empty object");
  });
  
  var constraint = function (x) {
    if (x === 42) throw new TypeError("42 not allowed");
    return x;
  };

  suite("adt.record(callback)", function () {
    var inner;
    var Foo = adt.record(function (foo, field) {
      inner = foo;
      ok(foo === this, "Class passed to callback")
      ok(field === this.field, "`field` passed to callback");
      field("a", adt.any);
      field("b");
      field("c", constraint);
      return {
        d: adt.any
      };
    });

    var ns = Foo.__names__;
    var cs = Foo.__constraints__;
    ok(inner === Foo, "Class passed to callback is the same as the one returned");
    ok(ns.length === 4, "Class has right number of fields");
    ok(ns[0] === 'a' && ns[1] === 'b' && ns[2] === 'c' && ns[3] === 'd', "Class has fields in right order");
    ok(cs.a === adt.any && cs.b === adt.any && cs.c === constraint && cs.d === adt.any, "Class has correct constraints");

    var foo = Foo(1, 2, 3, 4);
    ok(foo instanceof adt.__Base__, "Instance of adt base class");
    ok(foo instanceof Foo, "Instance of constructor");
    ok(foo.a() === 1 && foo.b() === 2 && foo.c() === 3, "Boilerplate getters");
    ok(foo.slot(0) === 1 && foo.slot(1) === 2 && foo.slot(2) === 3, "Index based getters");
    ok(foo.slot('a') === 1 && foo.slot('b') === 2 && foo.slot('c') === 3, "Name based getters");

    var foo2 = foo.set({ a: 4, b: 5 });
    ok(foo2.a() === 4 && foo2.b() === 5 && foo.c() === 3, "`set` changes values");
    ok(foo2 !== foo, "`set` returns a copy");
    ok(foo.equals(Foo(1, 2, 3, 4)), "`equals` matches on an instance with the same values");
    ok(!foo.equals(Foo(1, 2, 4, 5)), "`equals` doesn't match on an instance on an instance with different values");

    var foo3 = Foo.create({ a: 1, b: 2, c: 3, d: 4 });
    ok(foo3.a() === 1 && foo3.b() === 2 && foo3.c() === 3, "`create` with key value pairs");

    var arr = Foo.unapply(foo);
    var obj = Foo.unapplyObj(foo);
    ok(arr instanceof Array && arr.length === 4 &&
       arr[0] === 1 && arr[1] === 2 && arr[2] === 3 && arr[3] === 4, "`unapply` returns array representation");
    ok(obj instanceof Object && Object.keys(obj).length === 4 &&
       obj.a === 1 && obj.b === 2 && obj.c === 3 && obj.d === 4, "`unapplyObj` returns object representation");

    var partial = Foo(1, 2);
    ok(foo.equals(partial(3, 4)), "Constructor curries");

    test("Constraint throws an error", function () {
      assert.throws(function () {
        new Foo(1, 2, 42, 4);
      }, TypeError);
    });
  });

  suite("adt.record(fieldsObj)", function () {
    var Foo = adt.record({
      a: adt.any,
      b: null,
      c: constraint
    });

    var ns = Foo.__names__;
    var cs = Foo.__constraints__;
    ok(ns.length === 3, "Class has right number of fields");
    ok(ns[0] === 'a' && ns[1] === 'b' && ns[2] === 'c', "Class has fields in right order");
    ok(cs.a === adt.any && cs.b === adt.any && cs.c === constraint, "Class has correct constraints");
  });

  suite("adt.record(fieldNames...)", function () {
    var Foo = adt.record("a", "b", "c");
    var ns = Foo.__names__;
    var cs = Foo.__constraints__;
    ok(ns.length === 3, "Class has right number of fields");
    ok(ns[0] === 'a' && ns[1] === 'b' && ns[2] === 'c', "Class has fields in right order");
    ok(cs.a === adt.any && cs.b === adt.any && cs.c === adt.any, "Class has correct constraints");
  });

  suite("adt.data(callback)", function () {
    var inner;
    var Foo = adt.data(function (foo, type) {
      inner = foo;
      ok(foo === this, "Class passed to callback")
      ok(type === this.type, "`type` passed to callback");
      type("A", adt.single());
      type("B");
      type("C", adt.record("a", "b", "c"));
      type("D", {
        a: adt.any,
        b: null,
        c: constraint
      });
      return {
        E: adt.single()
      };
    });

    var a = Foo.A(), b = Foo.B(), c = Foo.C(1, 2, 3), d = Foo.D(4, 5, 6), e = Foo.E();
    ok(inner === Foo, "Class passed to callback is the same as the one returned");
    ok(a instanceof adt.__Base__ &&
       b instanceof adt.__Base__ &&
       c instanceof adt.__Base__ &&
       d instanceof adt.__Base__ &&
       e instanceof adt.__Base__, "Instance of base class");
    ok(a instanceof Foo &&
       b instanceof Foo &&
       c instanceof Foo &&
       d instanceof Foo &&
       e instanceof Foo, "Instance of type constructor");

    ok(a.isA() && !a.isB() && !a.isC() && !a.isD() && !a.isE() &&
       !b.isA() && b.isB() && !b.isC() && !b.isD() && !b.isE() &&
       !c.isA() && !c.isB() && c.isC() && !c.isD() && !c.isE() &&
       !d.isA() && !d.isB() && !d.isC() && d.isD() && !d.isE() &&
       !e.isA() && !e.isB() && !e.isC() && !e.isD() && e.isE(), "Boilerplate type checking");

    ok(Foo.A.className === 'A' && Foo.B.className === 'B' && Foo.C.className === 'C' &&
       Foo.D.className === 'D' && Foo.E.className === 'E', "Correct `className`");

    var ns = Foo.D.__names__;
    var cs = Foo.D.__constraints__;
    ok(ns.length === 3, "Class has right number of fields");
    ok(ns[0] === 'a' && ns[1] === 'b' && ns[2] === 'c', "Class has fields in right order");
    ok(cs.a === adt.any && cs.b === adt.any && cs.c === constraint, "Class has correct constraints");
  });

  suite("adt.data(typesObj)", function () {
    var Foo = adt.data({
      A: adt.single(),
      B: adt.single()
    });

    var a = Foo.A(), b = Foo.B();
    ok(a instanceof adt.__Base__ && b instanceof adt.__Base__, "Instance of base class");
    ok(a instanceof Foo && b instanceof Foo, "Instance of type constructor");
    ok(Foo.A.className === 'A' && Foo.B.className === 'B', "Correct `className`");
  });
});
