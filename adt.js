// adt.js : Algebraic data types and immutable structures in Javascript
// Nathan Faubion <nathan@n-son.com>
//
// TODO: clones adt records, but also should clone Arrays or objects

;(function (window, module) {

  // adt namespace
  var adt = {};

  // Export
  window.adt = module.exports = adt;

  function throwError(expected, s){
    throw new Error("expected " + expected + ", got: " + s.toString());
  }
  adt.convert = {
      all:         function(a){return a}
    , record:         function(record, name){
        return function(r){
          if (r instanceof record) return r;
          else return record.create(r, name);
        }
    }
    , toString:    function(s){return s.toString()}
    , positiveInt: function(i){return parseInt(i) || throwError("a positive integer", i)}
    , Bool:        function(b){if(b === true || b === false) return b;
                             else throwError("a boolean", b);
                   }

    , Array:       function(convertEach){return function(arr){
      var result = [];
      for(i=0,len=arr.len;i<len;i++){ result.push(convertEach(arr[i])) }
      return result;
    }}
  };

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
        ctr.className = name;

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

    ctr.create = function () { return ctr(); };
    ctr.unapply = function () { return []; };
    ctr.unapplyObj = function () { return {}; };

    return ctr;
  };

  // Create a new class that has named fields. Each value can be obtained by
  // calling the name as a method. Each value can be changed by calling `set`
  // with an object of values to update. `set` returns a clone of the object.
  adt.record = function (schema /* names... */) {
    var converters = null;
    var args = [];
    if (typeof schema === "string")
      var args = adt.util.toArray(arguments);
    else
      if (!arguments.length == 1)
        throw new Error("expected strings or an object, got: " + arguments.toString());

      // Note: Object property ordering is not guaranteed
      // therefore all creations for an object with a schema should be with an object
      var converters = [];
      for (var k in schema) {
        args.push(k)
        var converter = schema[k]
        converters[k] = adt.convert[converter] || converter
      }

    var names = adt.util.toArray(args), ctr;
    ctr = function (maybeObj) {
      // TODO: this will break if only one field in the record
      // probably this is a bad idea and should just use create
      /*
      var args = [];
      if (arguments.length !== names.length) {
        if (converters){
          for (var i=0,len=names.length;i<len;i++) {
            name = names[i];
            if (!maybeObj.hasOwnProperty(name))
              throw new Error("key does not exist: " + name);
            args.push(converters[name](maybeObj[name]));
          }
        } else throw new Error("Constructor applied to wrong # of arguments");
      } else {
      }
      */
      var args = adt.util.toArray(arguments);

      if (!(this instanceof ctr)) return adt.util.ctrApply(ctr, args);
      for (var i = 0, len = args.length; i < len; i++) {
        var name = names[i];
        var arg = args[i];
        if(!this.hasOwnProperty(name)) this[name] = arg;
        // TODO: remove. for getter function access
        this[names[i]] = args[i];
      }
    };

    ctr = adt.util.curry(ctr, names.length);
    ctr.__names = names.slice();
    ctr.prototype = new adt.__Base__();
    ctr.prototype.constructor = ctr;

    ctr.prototype.clone = function () {
      var self = this;
      var args = [];
      for (var i = 0, len = names.length; i < len; i++) {
        var val = self[names[i]];
        args.push( n instanceof adt.__Base__ ? val.clone() : val );
      };
      return ctr.apply(null, args);
    };

    ctr.prototype.slot = function (num) {
      if (num < 0 || num > names.length - 1) throw new Error("Slot index out of range");
      return this[names[num]]();
    };

    ctr.prototype.set = function (vals) {
      var self = this;
      var args = [];
      for (var i = 0, len = names.length; i < len; i++) {
        var n = names[i];
        var val = n in vals
          ? vals[n]
          : self[n];

        args.push( n instanceof adt.__Base__ ? val.clone() : val );
      }
      return ctr.apply(null, args);
    };

    ctr.create = function (vals, name) {
      if (!vals) throw new Error("Expected " + (name || "an object") + ", but got falsy");
      var args = [];
      for (var i=0,len=names.length;i<len;i++) {
        var name = names[i];
        if (!(name in vals)) throw new Error("Expected key: " + name.toString());
        var unConverted = vals[name];
        var val = converters ? converters[name].call(null, unConverted) : unConverted;
        //if (name == "start_time") debugger
        args.push( name instanceof adt.__Base__ ? val.clone() : val );
      }
      return ctr.apply(null, args);
    };

    ctr.unapply = function (inst) {
      var result = [];
      for (var i=0,len=names.length;i<len;i++) {
        result.push(inst[names[i]]()); 
      }
      return result;
    };

    ctr.unapplyObj = function (inst) {
      var ret = {};
      names.forEach(function (n) { ret[n] = inst[n](); });
      return ret;
    };

    // Generate boilerplate getters
    /*
    names.forEach(function (n) {
      ctr.prototype[n] = function () {
        return this['_' + n];
      };
    });
    */

    return ctr;
  };

})(
  typeof window !== "undefined" ? window : {},
  typeof module !== "undefined" ? module : {}
);
