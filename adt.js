// adt.js : Algebraic data types and immutable structures in Javascript
// Nathan Faubion <nathan@n-son.com>

;(function (window, module) {

  // adt namespace
  var adt = {};

  // Export
  window.adt = module.exports = adt;

  // Utility functions
  adt.util = {};

  // Cache slice since it's used so often
  var slice = Array.prototype.slice;

  // Return an array of the supplied argument. Used for `arguments` objects.
  adt.util.toArray = function (a) {
    return slice.call(a);
  };

  // A basic extend method for copying attributes of on object into another.
  adt.util.extend = function (dest /*, sources... */) {
    var args = slice.call(arguments, 1);
    for (var i = 0, len = args.length; i < len; i++) {
      for (var k in args[i]) {
        dest[k] = args[i][k];
      }
    }
    return dest;
  };

  // Given a constructor and an array of args, instanciates a new objects with
  // said args. Like calling `apply` on a constructor.
  adt.util.ctrApply = function (ctr, args) {
    var C = function () {};
    C.prototype = ctr.prototype;
    var inst = new C();
    var ret = ctr.apply(inst, args);
    return Object(ret) === ret ? ret : inst;
  };

  // Partially applies arguments to a function in the same way `bind` would,
  // but doesn't cement the context in anyway.
  adt.util.partial = function (func) {
    var args = slice.call(arguments, 1);
    return function () {
      return func.apply(this, args.concat(adt.util.toArray(arguments)));
    };
  };

  // Automatically curries a function so that it can be called with too few
  // arguments. Calling it with too few arguments will return a function that
  // takes however many arguments are left.
  // Adapted from http://fitzgen.github.com/wu.js/
  adt.util.curry = function (func, len) {
    if (len === undefined) len = func.length;
    return function () {
      var args = adt.util.toArray(arguments);
      if (args.length < len) {
        var applied = adt.util.partial.apply(this, [func].concat(args));
        return len - args.length > 0
          ? adt.util.curry(applied, len - args.length)
          : applied;
      } else {
        return func.apply(this, args);
      }
    };
  };

  // Internal cache of data types.
  // Data constructors are cached here so we can perform lookups based on name.
  var typeCache = {};

  // Base class from which all adt.js classes inherit.
  // All adt.js classes should have a clone method that clones the
  // object as best it can.
  adt.__Base__ = function () {};

  // Generates a new set of Algebraic data types. This will create a lot of
  // boilerplate to help with type checking. Each type will get is<type>()
  // methods that return true or false.
  adt.data = function (types) {
    // Create a new parent class.
    // This class should never be created directly. It serves as a common
    // denominator for the supplied types.
    var D = function () {};
    D.prototype = new adt.__Base__();

    for (var name in types) {
      // Wrap in a closure so we can keep a reference to the name and
      // constructor.
      (function (name) {
        var ctr = types[name];
        var proto = ctr.prototype;
        ctr.prototype = new D();
        ctr.prototype.constructor = ctr;

        // Generate boilerplate type checking methods
        for (var name2 in types)
          ctr.prototype['is' + name2] = name2 === name
            ? function () { return true; }
            : function () { return false; };

        // Extend the contructors prototype with its old prototype since we
        // overwrote it making it a subclass of D.
        adt.util.extend(ctr.prototype, proto);

        // Export constructor as a static property on the parent class.
        D[name] = ctr;

        // Keep it in the cache.
        if (name in typeCache) typeCache[name].push(ctr);
        else typeCache[name] = [ctr];
      })(name);
    }

    return D;
  };

  // Create a single empty class that always return the same instance.
  // Useful for sentinal values such as Nothing, Empty, etc.
  adt.single = function () {
    var inst, ctr;

    ctr = function () {
      if (!(this instanceof ctr)) return new ctr();
      if (inst) return inst;
      inst = this;
    };

    ctr.prototype = new adt.__Base__();
    ctr.prototype = ctr;

    ctr.prototype.clone = function () {
      return inst;
    };

    return ctr;
  };

  // Create a new class that has named fields. Each value can be obtained by
  // calling the name as a method. Each value can be changed by calling `set`
  // with an object of values to update. `set` returns a clone of the object.
  adt.record = function (/* names... */) {
    var names = adt.util.toArray(arguments), ctr;

    ctr = function () {
      var args = adt.util.toArray(arguments);
      if (!(this instanceof ctr)) return adt.util.ctrApply(ctr, args);
      if (args.length > names.length) throw new Error("Constructor applied to too many arguments");
      for (var i = 0, len = args.length; i < len; i++) {
        this['_' + names[i]] = args[i];
      }
    };

    ctr = adt.util.curry(ctr, names.length);
    ctr.__names = names.slice();
    ctr.prototype = new adt.__Base__();
    ctr.prototype.constructor = ctr;

    ctr.prototype.clone = function () {
      var self = this;
      var args = names.map(function (n) {
        var val = self['_' + n];
        return n instanceof adt.__Base__
          ? val.clone()
          : val;
      });
      return ctr.apply(null, args);
    };

    ctr.prototype.slot = function (num) {
      if (num < 0 || num > names.length - 1) throw new Error("Slot index out of range");
      return this[names[num]]();
    };

    ctr.prototype.set = function (vals) {
      var self = this;
      var args = names.map(function (n) {
        var val = n in vals
          ? vals[n]
          : self['_' + n];

        return n instanceof adt.__Base__
          ? val.clone()
          : val;
      });
      return ctr.apply(null, args);
    };

    ctr.create = function (vals) {
      var args = names.map(function (n) {
        if (!(n in vals)) throw new Error("Constructor applied to too few arguments");
        var val = vals[n];
        return n instanceof adt.__Base__
          ? val.clone()
          : val;
      });
      return ctr.apply(null, args);
    };

    // Generate boilerplate getters
    names.forEach(function (n) {
      ctr.prototype[n] = function () {
        return this['_' + n];
      };
    });

    return ctr;
  };

  // Returns a list of constructors given a string type name
  adt.lookup = function (type) {
    var ctrs = typeCache[type];
    return ctrs ? ctrs.slice() : undefined;
  };

})(
  typeof window !== "undefined" ? window : {},
  typeof module !== "undefined" ? module : {}
);
