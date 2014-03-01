var adt = require('../adt');
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

suite('Core', function () {
  suite('adt.single()', function () {
    var Foo = adt.single()(adt.__Base__, 'Foo');
    var foo = Foo;
    ok('Instance of adt base class', foo instanceof adt.__Base__);
    ok('`clone` returns the same instance', foo.clone() === foo);
    ok('`equals` matches same instance', foo.equals(Foo));
    ok('`equals` does not match something else', !foo.equals(12));
    ok('`toJSON` returns null by default', Foo.toJSON() === null);
  });

  suite('adt.single(val)', function () {
    var Foo = adt.single(42)(adt.__Base__);
    ok('`toJSON` returns value', Foo.toJSON() === 42);
  });
  
  var constraint = function (x) {
    if (x === 42) throw new TypeError('42 not allowed');
    return x;
  };

  suite('adt.record(callback)', function () {
    var inner;
    var Foo = adt.record(function (field, foo) {
      inner = foo;
      ok('Class passed to callback', foo === this);
      ok('`field` passed to callback', field === this.field);
      field('a', adt.any);
      field('b');
      field('c', constraint);
      return { d: adt.any };
    })(adt.__Base__);

    var ns = Foo.__names__;
    var cs = Foo.__constraints__;
    ok('Class passed to callback is the same as the one returned', inner === Foo);
    ok('Class has right number of fields', ns.length === 4);
    ok('Class has fields in right order', ns[0] === 'a' && ns[1] === 'b' && ns[2] === 'c' && ns[3] === 'd');
    ok('Class has correct constraints', cs.a === adt.any && cs.b === adt.any && cs.c === constraint && cs.d === adt.any);

    var foo = Foo(1, 2, 3, 4);
    ok('Instance of adt base class', foo instanceof adt.__Base__);
    ok('Instance of constructor', foo instanceof Foo);
    ok('Boilerplate getters', foo.a === 1 && foo.b === 2 && foo.c === 3);
    ok('Index based getters', foo.get(0) === 1 && foo.get(1) === 2 && foo.get(2) === 3);
    ok('Name based getters', foo.get('a') === 1 && foo.get('b') === 2 && foo.get('c') === 3);

    var foo2 = foo.set({ a: 4, b: 5 });
    ok('`set` changes values', foo2.a === 4 && foo2.b === 5 && foo.c === 3);
    ok('`set` returns a copy', foo2 !== foo);
    ok('`equals` matches on an instance with the same values', foo.equals(Foo(1, 2, 3, 4)));
    ok('`equals` does not match on an instance on an instance with different values', !foo.equals(Foo(1, 2, 4, 5)));
    ok('`equals` matches on a deep structure', Foo(foo, 1, 2, 3).equals(Foo(Foo(1, 2, 3, 4), 1, 2, 3)));

    var foo3 = Foo.create({ a: 1, b: 2, c: 3, d: 4 });
    ok('`create` with key value pairs', foo3.a === 1 && foo3.b === 2 && foo3.c === 3);

    var foo4 = Foo(Foo(1, 2, 3, 4), 2, 3, 4);
    var foo5 = foo4.clone();
    ok('`clone` returns a copy', foo4.equals(foo5) && foo4 !== foo5);
    ok('`clone` copies values', foo4.a !== foo5.a);

    var arr = Foo.unapply(foo);
    var obj = Foo.unapplyObject(foo);
    ok('`unapply` returns array representation',
       arr instanceof Array && arr.length === 4 &&
       arr[0] === 1 && arr[1] === 2 && arr[2] === 3 && arr[3] === 4);

    ok('`unapplyObject` returns object representation', 
       obj instanceof Object && Object.keys(obj).length === 4 &&
       obj.a === 1 && obj.b === 2 && obj.c === 3 && obj.d === 4);

    ok('`toJSON` returns object representation', 
       obj instanceof Object && Object.keys(obj).length === 4 &&
       obj.a === 1 && obj.b === 2 && obj.c === 3 && obj.d === 4);

    var partial = Foo(1, 2);
    ok('Constructor curries', foo.equals(partial(3, 4)));

    test('Constraint throws an error', function () {
      assert.throws(function () {
        new Foo(1, 2, 42, 4);
      }, TypeError);
    });

    Foo.seal();
    ok('`seal` removes `field` and `seal`', !Foo.field && !Foo.seal);
  });

  suite('adt.record(fieldsObj)', function () {
    var Foo = adt.record({
      a: adt.any,
      b: null,
      c: constraint
    })(adt.__Base__);

    var ns = Foo.__names__;
    var cs = Foo.__constraints__;
    ok('Class has right number of fields', ns.length === 3);
    ok('Class has fields in right order', ns[0] === 'a' && ns[1] === 'b' && ns[2] === 'c');
    ok('Class has correct constraints', cs.a === adt.any && cs.b === adt.any && cs.c === constraint);
  });

  suite('adt.record(fieldNames...)', function () {
    var Foo = adt.record('a', 'b', 'c')(adt.__Base__);
    var ns = Foo.__names__;
    var cs = Foo.__constraints__;
    ok('Class has right number of fields', ns.length === 3);
    ok('Class has fields in right order', ns[0] === 'a' && ns[1] === 'b' && ns[2] === 'c');
    ok('Class has correct constraints', cs.a === adt.any && cs.b === adt.any && cs.c === adt.any);
  });

  suite('adt.data(callback)', function () {
    var inner;
    var Foo = adt.data(function (type, foo) {
      inner = foo;
      ok('Class passed to callback', foo === this);
      ok('`type` passed to callback', type === this.type);
      type('A', adt.single());
      type('B');
      type('C', adt.record('a', 'b', 'c'));
      type('D', { a: adt.any, b: null, c: constraint });
      return { E: adt.single() };
    });

    var a = Foo.A, b = Foo.B, c = Foo.C(1, 2, 3), d = Foo.D(4, 5, 6), e = Foo.E;
    ok('Class passed to callback is the same as the one returned', inner === Foo);
    ok('Instance of base class', 
       a instanceof adt.__Base__ &&
       b instanceof adt.__Base__ &&
       c instanceof adt.__Base__ &&
       d instanceof adt.__Base__ &&
       e instanceof adt.__Base__);
    ok('Instance of type constructor', 
       a instanceof Foo &&
       b instanceof Foo &&
       c instanceof Foo &&
       d instanceof Foo &&
       e instanceof Foo);

    ok('Boilerplate type checking',
       a.isA && !a.isB && !a.isC && !a.isD && !a.isE &&
       !b.isA && b.isB && !b.isC && !b.isD && !b.isE &&
       !c.isA && !c.isB && c.isC && !c.isD && !c.isE &&
       !d.isA && !d.isB && !d.isC && d.isD && !d.isE &&
       !e.isA && !e.isB && !e.isC && !e.isD && e.isE);

    ok('Correct `className`',
       Foo.A.constructor.className === 'A' && Foo.B.constructor.className === 'B' && 
       Foo.C.className === 'C' && Foo.D.className === 'D' && 
       Foo.E.constructor.className === 'E');

    var ns = Foo.D.__names__;
    var cs = Foo.D.__constraints__;
    ok('Class has right number of fields', ns.length === 3);
    ok('Class has fields in right order', ns[0] === 'a' && ns[1] === 'b' && ns[2] === 'c');
    ok('Class has correct constraints', cs.a === adt.any && cs.b === adt.any && cs.c === constraint);

    Foo.seal();
    ok('`seal` removes `type` and `seal`', !Foo.type && !Foo.seal);
    ok('`seal` calls `seal` on types', !Foo.A.seal && !Foo.A.field);
  });

  suite('adt.data(typeNames...)', function () {
    var Foo = adt.data('A', 'B', 'C');
    ok('Single types are created', Foo.A && Foo.B && Foo.C);
  });

  suite('adt.data(typesObj)', function () {
    var Foo = adt.data({
      A: adt.single(),
      B: adt.single()
    });

    var a = Foo.A, b = Foo.B;
    ok('Instance of base class', a instanceof adt.__Base__ && b instanceof adt.__Base__);
    ok('Instance of type constructor', a instanceof Foo && b instanceof Foo);
    ok('Correct `className`', Foo.A.constructor.className === 'A' && Foo.B.constructor.className === 'B');
  });

  suite('adt.enumeration(typeNames...)', function () {
    var Foo = adt.enumeration('A', 'B');
    var a = Foo.A, b = Foo.B;

    ok('`lt`', a.lt(b));
    ok('not `lt`', !b.lt(a));
    ok('`lte`', a.lte(a) && a.lte(b));
    ok('not `lte`', !b.lte(a));
    ok('`gt`', b.gt(a));
    ok('not `gt`', !a.gt(b));
    ok('`gte`', b.gte(a) && a.gte(a));
    ok('not `gte`', !a.gte(b));
    ok('`eq`', a.eq(a));
    ok('`neq`', a.neq(b));
  });

  suite('adt.enumeration.type()', function () {
    var Foo = adt.enumeration('A');
    Foo.type('B');
    var a = Foo.A, b = Foo.B;

    ok('B is greater than A', b.gt(a));
  });

  suite('adt.newtype', function () {
    var Foo = adt.newtype('Foo', { a: adt.any, b: adt.any });
    var foo = Foo(1, 2);
    ok('Typecheck', foo.isFoo);
    ok('Fields', foo.a === 1 && foo.b === 2);
  });

  suite('adt.only', function () {
    ok('Number', adt.only(Number)(42));
    ok('String', adt.only(String)('foo'));
    ok('Literal', adt.only('foo')('foo'));
    throws('Number throws', function () { adt.only(Number)(null) }, TypeError);
    throws('String throws', function () { adt.only(String)(null) }, TypeError);
    throws('Literal throws', function () { adt.only('foo')('bar') }, TypeError);

    var mult = adt.only(String, Number, null);
    ok('Multiple types', mult('foo') && mult(42) && mult(null) === null);
    throws('Multiple throws', function () { mult(true); }, TypeError);
  });

  suite('Calling as a method on another instance:', function () {

    suite('adt.data().type()', function () {

      suite('non-curried', function () {
        var Foo = adt.data();
        var Bar = Foo.type('Bar', { value: adt.any });
        var bar = Bar(Bar).value('baz');
        ok('Not undefined', bar !== undefined);
        if (bar) ok('Correct value', bar.value === 'baz');
      });

      test('curried', function () {
        var Foo = adt.data();
        var Bar = Foo.type('Bar', { one: adt.any, two: adt.any });

        var bars = [
          Bar(Bar, Bar).one('baz', 'zuux'),
          Bar(Bar)(Bar).one('baz', 'zuux'),
          Bar(Bar, Bar).one('baz')('zuux'),
          Bar(Bar)(Bar).one('baz')('zuux'),
        ];

        bars.forEach(function (bar) {
          assert.ok('Not undefined', bar !== undefined);
          if (bar) {
            assert.ok('Correct one value', bar.one === 'baz');
            assert.ok('Correct two value', bar.two === 'zuux');
          }
        });
      });
    });

    suite('adt.newtype()', function () {

      suite('non-curried', function () {
        var Bar = adt.newtype('Bar', { value: adt.any });
        var bar = Bar(Bar).value('baz');
        ok('Not undefined', bar !== undefined);
        if (bar) ok('Correct value', bar.value === 'baz');
      });

      test('curried', function () {
        var Bar = adt.newtype('Bar', { one: adt.any, two: adt.any });

        var bars = [
          Bar(Bar, Bar).one('baz', 'zuux'),
          Bar(Bar)(Bar).one('baz', 'zuux'),
          Bar(Bar, Bar).one('baz')('zuux'),
          Bar(Bar)(Bar).one('baz')('zuux'),
        ];

        bars.forEach(function (bar) {
          assert.ok('Not undefined', bar !== undefined);
          if (bar) {
            assert.ok('Correct one value', bar.one === 'baz');
            assert.ok('Correct two value', bar.two === 'zuux');
          }
        });
      });
    });
  });

  suite('adt.data().type([a, b, c])', function () {
    test('all properties should be defined', function () {
      var Foo = adt.data('Foo');
      var Bar = Foo.type('Bar', ['foo', 'bar', 'baz', 'zuux']);
      var out = Bar('FOO', 'BAR')('BAZ', "ZUUX");

      assert.ok('Correct foo', out.foo === 'FOO');
      assert.ok('Correct bar', out.bar === 'BAR');
      assert.ok('Correct baz', out.baz === 'BAZ');
      assert.ok('Correct zuux', out.zuux === 'ZUUX');
    });
  });
});
