var adt = require("../adt");
var assert = require("assert");

function ok (expr, name) {
  test(name, function () {
    assert.ok(expr);
  })
}

suite("Core", function () {
  var Foo = adt.data({
    Bar : adt.single(),
    Baz : adt.record("a", "b", "c")
  });

  var bar = Foo.Bar();
  ok(bar instanceof adt.__Base__, "Instance of adt base class");
  ok(bar instanceof Foo, "Instance of type constructor");
  ok(bar instanceof Foo.Bar, "Instance of data constructor");
  ok(bar === Foo.Bar(), "Singles always refer to the same instance");
  ok(bar.isBar() === true && bar.isBaz() === false, "Boilerplate type checking");

  var baz = Foo.Baz(1, 2, 3);
  ok(baz.a() === 1 && baz.b() === 2 && baz.c() === 3, "Boilerplate getters");
  ok(baz.slot(0) === 1 && baz.slot(1) === 2 && baz.slot(2) === 3, "Index based getters")
  
  var baz2 = baz.set({ a: 4, b: 5 });
  ok(baz2.a() === 4 && baz2.b() === 5 && baz2.c() === 3, "Setters");
  ok(baz2 !== baz, "Setters return a copy");

  var baz3 = Foo.Baz.create({ a: 7, b: 8, c: 9 });
  ok(baz3.a() === 7 && baz3.b() === 8 && baz3.c() === 9, "Key based creation");

  var baz4 = baz3.clone();
  ok(baz4.a() === 7 && baz4.b() === 8 && baz4.c() === 9 && baz4 !== baz3, "Cloning");

  var cls = adt.lookup("Bar");
  ok(cls && cls.length && cls[0] === Foo.Bar, "Lookup constructor by name")
});
