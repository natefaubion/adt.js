// adt.js 
// ------
// Algebraic data types and immutable structures in Javascript
//
// version : 0.4.0
// author  : Nathan Faubion <nathan@n-son.com>
// license : MIT

;(function (window, module) {
  // adt namespace
  var adt = {};

  // Export
  window.adt = module.exports = adt;

  // Utility functions
  adt.util = {};

  // Cache some prototype methods for easy use.
  var slice = Array.prototype.slice;
  var funcApply = Function.prototype.apply;

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

  // A shared `toString` method that will work with any adt type that has a
  // className set on the constructor.
  adt.util.toString = function () {
    var ctr = this.constructor;
    var name = ctr.className || "Anonymous";
    var vals = ctr.unapply(this);
    return name + (vals.length ? "(" + vals.join(", ") + ")" : "");
  };

  // Base class from which all adt.js classes inherit.
  // All adt.js classes should have a clone method that clones the
  // object as best it can.
  adt.__Base__ = function () {};

  // Generates a new set of Algebraic data types. This will create a lot of
  // boilerplate to help with type checking. Each type will get is<type>()
  // methods that return true or false.
  adt.data = function () {
    var targ0 = typeof arguments[0];
    var callback, types, names;

    // adt.data(typesObj)
    if (targ0 === "object") {
      types = arguments[0];
      
      // Call adt.data again with a desugared callback.
      return adt.data(function (d, type) {
        for (var name in types) type(name, types[name]);
      });
    }

    // adt.data(callback)
    callback = arguments[0] || function () {};
    names = [];

    // Create a new parent class.
    // This class should never be created using `new`. You obviously can,
    // but it won't be of much use. You can however override the apply method
    // to create default instances.
    var D = function () {
      if (!(this instanceof D) && D.apply !== funcApply) {
        return D.apply(this, arguments);
      }
    };

    // Make it an instance of the adt Base class.
    D.prototype = new adt.__Base__();

    // Declares an adt type as part of the family.
    D.type = function (name, ctr) {
      if (typeof name !== "string") {
        ctr = name;
        name = uniqueId("Anonymous");
      }
      // Create a new adt constructor if not provided with one
      if (!ctr) ctr = adt.single();
      else if (!(ctr.prototype instanceof adt.__Base__)) ctr = adt.record(ctr);

      // Reset the prototype so its a subclass of D.
      var proto = ctr.prototype;
      ctr.prototype = new D();
      ctr.prototype.constructor = ctr;
      ctr.prototype.toString = adt.util.toString;
      ctr.className = name;

      // Add typechecking attributes for this type.
      D.prototype["is" + name] = false;
      ctr.prototype["is" + name] = true;

      // Extend the contructor's prototype with its old prototype since we
      // overwrote it making it a subclass of D.
      adt.util.extend(ctr.prototype, proto);

      // Export constructor as a static property on the parent class.
      D[name] = ctr;
      names.push(name);
      return ctr;
    };

    // Call the callback with the constructor as the context.
    var types = callback.call(D, D, D.type);

    // If an object was returned in the callback, assume it's a mapping of
    // more types to add.
    if (typeof types === 'object' && !(types instanceof adt.__Base__)) {
      for (var name in types) D.type(name, types[name]);
    }

    // Keep the type function around because it allows for nice type
    // declarations, but give the option to seal it. This will call `seal`
    // on any sub types to.
    D.seal = function () { 
      var i = 0, len = names.length, seal;
      for (; i < len; i++) {
        seal = this[name].seal;
        seal instanceof Function && seal();
      }
      delete D.type;
      delete D.seal;
      return D;
    };

    // Export names as a meta object
    D.__names__ = names;
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
    ctr.prototype.constructor = ctr;

    ctr.prototype.clone = function () { return inst; };
    ctr.prototype.equals = function (obj) { return this === obj; };

    ctr.create = function () { return ctr(); };
    ctr.unapply = function () { return []; };
    ctr.unapplyObj = function () { return {}; };

    return ctr;
  };

  // Create a new class that has named fields. Each value can be obtained by
  // calling the name as a method. Each value can be changed by calling `set`
  // with an object of values to update. `set` returns a clone of the object.
  adt.record = function () {
    var targ0 = typeof arguments[0];
    var names, constraints, ctr, fields, callback;
    
    // adt.record(fieldNames...)
    if (targ0 === 'string') {
      var args = adt.util.toArray(arguments);
      return adt.record(function (r, field) {
        var i = 0, len = args.length;
        for (; i < len; i++) field(args[i], adt.any);
      });
    }

    // adt.record(fieldsObj)
    else if (targ0 === 'object') {
      fields = arguments[0];
      return adt.record(function (r, field) {
        for (var name in fields) field(name, fields[name]);
      });
    }

    // adt.record(callback)
    callback = arguments[0] || function () {};
    names = [];
    constraints = {};

    // A record's constructor can be called without `new` and will also throw
    // an error if called with too many arguments. Its arguments can be curried
    // as long as it isn't called with the `new` keyword.
    ctr = function () {
      var args = adt.util.toArray(arguments);
      var len = names.length;
      if (!(this instanceof ctr)) {
        return args.length < len
          ? adt.util.partial.apply(null, [ctr].concat(args))
          : adt.util.ctrApply(ctr, args);
      } else {
        if (args.length < len) throw new Error("Too few arguments");
        if (args.length > len) throw new Error("Too many arguments");
        var i = 0, len = args.length, n;
        for (; i < len; i++) {
          n = names[i];
          this[n] = constraints[n](args[i]);
        }
      }
    };

    // Inherit from Base in case someone wants to create a record outside of
    // a call to adt.data.
    ctr.prototype = new adt.__Base__();
    ctr.prototype.constructor = ctr;

    // This clone method will clone any values that are also adt types and
    // leaves anything else alone.
    ctr.prototype.clone = function () {
      var args = [];
      var i = 0, len = names.length, val;
      for (; i < len; i++) {
        val = this[names[i]];
        args.push(val instanceof adt.__Base__ ? val.clone() : val);
      }
      return ctr.apply(null, args);
    };

    // Lookup a field's value by either name or index. Looking up by name
    // requires that we use indexOf to verify that the field exists. Normally
    // in js, it would just return undefined, but undefined is a valid value
    // with these types.
    ctr.prototype.slot = function (field) {
      if (typeof field === "number") {
        if (field < 0 || field > names.length - 1) {
          throw new Error("Field index out of range");
        }
        field = names[field];
      } else {
        if (!constraints.hasOwnProperty(field)) {
          throw new Error("Field name does not exist");
        }
      }
      return this[field];
    };

    // Returns a new instance.
    ctr.prototype.set = function (vals) {
      var args = []
      var i = 0, len = names.length, val, n;
      for (; i < len; i++) {
        n = names[i];
        val = n in vals ? vals[n] : this[n];
        args.push(val);
      }
      return ctr.apply(null, args);
    };

    // Performs deep equality checks on each field as long as it holds an
    // adt type. Any other types will just be compared using ===.
    ctr.prototype.equals = function (that) {
      if (this === that) return true;
      if (!(that instanceof ctr)) return false;
      var i = 0, len = names.length;
      var vala, valb, n;
      for (; i < len; i++) {
        n = names[i];
        vala = this[n];
        valb = that[n];
        if (vala instanceof adt.__Base__) {
          if (!vala.equals(valb)) return false;
        } else if (vala !== valb) return false;
      }
      return true;
    };

    // Creates a new instance using key-value pairs instead of by
    // positional arguments.
    ctr.create = function (vals) {
      var args = [];
      var i = 0, len = names.length, n;
      for (; i < len; i++) {
        n = names[i];
        if (!(n in vals)) throw new Error("Could not find field in arguments: " + n);
        args.push(vals[n]);
      }
      return ctr.apply(null, args);
    };

    // Returns an array representation of the fields
    ctr.unapply = function (inst) {
      var vals = [];
      var i = 0, len = names.length;
      for (; i < len; i++) vals.push(inst[names[i]]);
      return vals;
    };

    // Returns an object representation of the field
    ctr.unapplyObj = function (inst) {
      var vals = {};
      var i = 0, len = names.length;
      for (; i < len; i++) vals[names[i]] = inst[names[i]];
      return vals;
    };

    // Declares a field as part of the type.
    ctr.field = function (name, constraint) {
      if (!constraint) constraint = adt.any;
      if (typeof constraint !== 'function') {
        throw new TypeError('Constraints must be functions')
      }
      names.push(name);
      constraints[name] = constraint;
      return ctr;
    };

    // Call the callback with the contructor as the context.
    fields = callback.call(ctr, ctr, ctr.field);

    // If an object was returned in the callback, assume it's a mapping of
    // more fields to add.
    if (typeof fields === 'object' && fields !== ctr) {
      for (var name in fields) ctr.field(name, fields[name]);
    }

    // Export names and constraints as meta attributes.
    ctr.__names__ = names;
    ctr.__constraints__ = constraints;

    // Keep the field function around because it allows for nice type
    // declarations, but give the option to seal it.
    ctr.seal = function () { 
      delete ctr.field;
      delete ctr.seal;
      return ctr;
    };

    return ctr;
  };

  // Enumerations are types that have an order and can be compared using lt,
  // gt, lte, and gte.
  adt.enumeration = function () {
    var targ0 = typeof arguments[0];
    
    // adt.enumeration(typeNames...)
    if (targ0 === 'string') {
      var args = adt.util.toArray(arguments);
      return adt.enumeration(function (r, type) {
        var i = 0, len = args.length;
        for (; i < len; i++) type(args[i]);
      });
    }

    // Create the types
    var E = adt.data.apply(null, arguments);

    // Iterate through created types, applying an order meta attribute.
    var i = 0, len = E.__names__.length, name;
    for (; i < len; i++) {
      name = E.__names__[i];
      E[name].__order__ = i;
    }

    // Helper function to make sure we are comparing the same types. We can't
    // compare the order of a different type, so it throws a TypeError if the
    // types are incompatible.
    function verifyType (that) {
      if (!(that instanceof E)) throw new TypeError("Unexpected type");
      return true;
    }

    // Helper to return the order of the particular instance
    function order (that) {
      return that.constructor.__order__;
    }

    // Less than
    E.prototype.lt = function (that) {
      return verifyType(that) && order(this) < order(that);
    };

    // Less than or equal
    E.prototype.lte = function (that) {
      return verifyType(that) && order(this) <= order(that);
    };

    // Greater than
    E.prototype.gt = function (that) {
      return verifyType(that) && order(this) > order(that);
    };

    // Greater than or equal
    E.prototype.gte = function (that) {
      return verifyType(that) && order(this) >= order(that);
    };

    // Equal (not that same as `equals`
    E.prototype.eq = function (that) {
      return verifyType(that) && order(this) === order(that);
    };

    // Not equals
    E.prototype.neq = function (that) {
      return verifyType(that) && order(this) !== order(that);
    };

    return E;
  };

  // Creates a singleton type that belongs to its own family.
  adt.newtype = function () {
    var args = adt.util.toArray(arguments);
    var data = adt.data();
    return data.type.apply(data, args);
  };

  // A contraint function that will accept any value.
  adt.any = function (x) { return x; };

  // A constraint generator that will perform instanceof checks on the value
  // to make sure it is of the correct type. If a value besides a function
  // is passed in, it will perform equality checks on it.
  //
  // It has special handling for Number, String, and Boolean. Literals won't
  // match an instanceof check, but will match with typeof.
  adt.only = function () {
    var args = arguments;
    return function (x) {
      var i = 0, len = args.length, type;
      for (; i < len; i++) {
        type = args[i];
        if (type instanceof Function) {
          if (x instanceof type
          || type === Number && typeof x === "number"
          || type === String && typeof x === "string"
          || type === Boolean && typeof x === "boolean") return x;
        } else {
          if (type instanceof adt.__Base__ && type.equals(x)
          || type === x) return x;
        }
      }
      throw new TypeError('Unexpected type');
    };
  };

  // Helper function to return a unique id
  var uniqueId = (function () {
    var id = 0;
    return function (pre) { return pre + (id++); };
  })();

})(
  typeof window !== "undefined" ? window : {},
  typeof module !== "undefined" ? module : {}
);
