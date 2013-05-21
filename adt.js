// adt.js 
// ------
// Algebraic data types and immutable structures in Javascript
//
// version : 0.5.0
// author  : Nathan Faubion <nathan@n-son.com>
// license : MIT

;(function (adt) {
  'use strict';

  // Cache some prototype methods for easy use.
  var slice = Array.prototype.slice;
  var funcApply = Function.prototype.apply;

  // Utility functions
  adt.util = {};

  // Return an array of the supplied argument. Used for `arguments` objects.
  adt.util.toArray = function (a) {
    var dest = [], i = 0, len = a.length;
    for (; i < len; i++) dest[i] = a[i];
    return dest;
  };

  // A basic extend method for copying attributes of on object into another.
  adt.util.extend = function (dest /*, sources... */) {
    var args = slice.call(arguments, 1);
    for (var i = 0, len = args.length; i < len; i++) {
      for (var k in args[i]) {
        if (args[i].hasOwnProperty(k)) dest[k] = args[i][k];
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

  // Standard inheritance helper.
  adt.util.inherit = function (sup, sub) {
    var C = function () {};
    C.prototype = sup.prototype;
    sub.prototype = new C();
    sub.prototype.constructor = sub;
    return sub;
  };

  // Helper function to return a unique id
  adt.util.uniqueId = (function (id) {
    return function (pre) { return (pre || '') + id++; };
  })(0);

  // Checks if a value is one of the given types.
  adt.util.typeCheck = function (types, x) {
    var i = 0, len = types.length, type;
    for (; i < len; i++) {
      type = types[i];
      if (type instanceof Function) {
        if (x instanceof type
        || type === Number && typeof x === 'number'
        || type === String && typeof x === 'string'
        || type === Boolean && typeof x === 'boolean') return true;
      } else {
        if (type instanceof adt.__Base__ && type.equals(x)
        || type === x) return true;
      }
    }
    return false;
  };

  // Checks if a val has a `toJSON` method, and if so returns that result,
  // otherwise just returns the value.
  adt.util.toJSONValue = function (val) {
    return val && typeof val === 'object' && val.toJSON ? val.toJSON() : val;
  };

  // Base class from which all adt.js classes inherit.
  // All adt.js classes should have a `clone` method that clones the
  // object as best it can and an `equals` method.
  adt.__Base__ = function () {};

  // Creates a new family from which you can create data types.
  adt.data = function () {
    var targ0 = typeof arguments[0];
    var callback, types, names;

    // adt.data(typeNames...)
    if (targ0 === 'string') {
      var args = arguments;
      return adt.data(function (type) {
        var i = 0, len = args.length;
        for (; i < len; i++) type(args[i]);
      });
    }

    // adt.data(typesObj)
    if (targ0 === 'object') {
      types = arguments[0];
      // Call adt.data again with a desugared callback.
      return adt.data(function (type) {
        for (var name in types) {
          if (types.hasOwnProperty(name)) type(name, types[name]);
        }
      });
    }

    // adt.data(callback)
    callback = arguments[0] || function () {};
    names = [];

    // Create a new parent class.
    // This class should never be created using `new`. You obviously can,
    // but it won't be of much use. You can however override the apply method
    // to create default instances.
    var D = adt.util.inherit(adt.__Base__, function () {
      if (!(this instanceof D) && D.apply !== funcApply) {
        return D.apply(this, arguments);
      }
    });

    // Declares an adt type as part of the family.
    D.type = function (name, tmpl) {
      if (typeof name !== 'string') {
        tmpl = name;
        name = adt.util.uniqueId('Anonymous');
      }
      
      // Create a new adt template if not provided with one
      var isSingle = adt.util.typeCheck([String, Boolean, Number, null, void 0], tmpl);
      if (isSingle) tmpl = adt.single(tmpl);
      else if (typeof tmpl !== 'function') tmpl = adt.record(tmpl);

      // Add typechecking attributes for this type.
      D.prototype['is' + name] = false;

      // Call the template to build our type and export it on the parent type.
      D[name] = tmpl(D, name);
      names.push(name);
      return D[name];
    };

    // Call the callback with the constructor as the context.
    var types = callback.call(D, D.type, D);

    // If an object was returned in the callback, assume it's a mapping of
    // more types to add.
    if (typeof types === 'object' && !(types instanceof adt.__Base__)) {
      for (var name in types) {
        if (types.hasOwnProperty(name)) D.type(name, types[name]);
      }
    }

    // Keep the type function around because it allows for nice type
    // declarations, but give the option to seal it. This will call `seal`
    // on any sub types to.
    D.seal = function () { 
      var i = 0, n, seal, name;
      for (; n = names[i]; i++) {
        seal = this[n].seal;
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

  // Create a single empty class instance. Useful for sentinal values such as
  // Nothing, Empty, etc. You can pass in a value that the class will use
  // during JSON serialization.
  adt.single = function (val) {
    if (typeof val === 'undefined') val = null;
    var ctr = function () {};
    return function (parent, name) {
      adt.util.inherit(parent, ctr);
      ctr.className = name;
      ctr.prototype.clone = function () { return this; };
      ctr.prototype.equals = function (obj) { return this === obj; };
      ctr.prototype.toString = function () { return name; };
      ctr.prototype.toJSON = function () { return val; };
      ctr.prototype['is' + name] = true;
      return new ctr();
    };
  };

  // Create a new class that has named fields.
  adt.record = function () {
    var targ0 = typeof arguments[0];
    var names, constraints, ctr, fields, callback;
    
    // adt.record(fieldNames...)
    if (targ0 === 'string') {
      var args = arguments;
      return adt.record(function (field) {
        var i = 0, len = args.length;
        for (; i < len; i++) field(args[i], adt.any);
      });
    }

    // adt.record(fieldsObj)
    else if (targ0 === 'object') {
      fields = arguments[0];
      return adt.record(function (field) {
        for (var name in fields) {
          if (fields.hasOwnProperty(name)) field(name, fields[name]);
        }
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
        if (args.length < len) throw new Error('Too few arguments');
        if (args.length > len) throw new Error('Too many arguments');
        var i = 0, n;
        for (; n = names[i]; i++) this[n] = constraints[n](args[i]);
      }
    };

    return function (parent, name) {
      adt.util.inherit(parent, ctr);
      ctr.className = name;
      ctr.prototype['is' + name] = true;

      // Custom `toString` implementation.
      ctr.prototype.toString = function () {
        var vals = ctr.unapply(this);
        return name + (vals.length ? '(' + vals.join(', ') + ')' : '');
      };

      // This clone method will clone any values that are also adt types and
      // leaves anything else alone.
      ctr.prototype.clone = function () {
        var args = [], i = 0, n, val;
        for (; n = names[i]; i++) {
          val = this[n];
          args[i] = val instanceof adt.__Base__ 
            ? val.clone()
            : adt.nativeClone(val);
        }
        return ctr.apply(null, args);
      };

      // Lookup fields by either name or index. Throws an error if the name
      // doesn't exist or if the index is out of range.
      ctr.prototype.get = function (field) {
        if (typeof field === 'number') {
          if (field < 0 || field > names.length - 1) {
            throw new Error('Field index out of range: ' + field);
          }
          field = names[field];
        } else {
          if (!constraints.hasOwnProperty(field)) {
            throw new Error('Field name does not exist: ' + field);
          }
        }
        return this[field];
      };

      // Creates a new instance with the specified values changed.
      ctr.prototype.set = function (vals) {
        var args = [], i = 0, n;
        for (; n = names[i]; i++) args[i] = n in vals ? vals[n] : this[n];
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
          } else if (!adt.nativeEquals(vala, valb)) return false;
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
          if (!(n in vals)) throw new Error('Could not find field in arguments: ' + n);
          args[i] = vals[n];
        }
        return ctr.apply(null, args);
      };
      
      // Returns an array representation of the fields.
      ctr.unapply = function (inst) {
        var vals = [], i = 0, n;
        for (; n = names[i]; i++) vals[i] = inst[n];
        return vals;
      };

      // Returns an object representation of the field. You can optionally
      // provide a function to map over the values.
      ctr.unapplyObj = function (inst, fn) {
        var vals = {}, i = 0, n;
        for (; n = names[i]; i++) vals[n] = fn ? fn(inst[n], n) : inst[n];
        return vals;
      };

      // Returns a plain object representation of the data.
      ctr.prototype.toJSON = function () {
        return ctr.unapplyObj(this, adt.util.toJSONValue);
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
      fields = callback.call(ctr, ctr.field, ctr);

      // If an object was returned in the callback, assume it's a mapping of
      // more fields to add.
      if (typeof fields === 'object' && fields !== ctr) {
        for (var name in fields) {
          if (!fields.hasOwnProperty(name)) continue;
          ctr.field(name, fields[name]);
        }
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
  };

  // Enumerations are types that have an order and can be compared using lt,
  // gt, lte, and gte.
  adt.enumeration = function () {
    // Create the types
    var E = adt.data.apply(null, arguments);
    var order = 0;

    // Helper to add the order attribute to a type.
    function addOrder (that) {
      if (that.constructor) that = that.constructor;
      that.__order__ = order++;
      return that;
    }

    // Helper function to make sure we are comparing the same types. We can't
    // compare the order of a different type, so it throws a TypeError if the
    // types are incompatible.
    function verifyType (that) {
      if (!(that instanceof E)) throw new TypeError('Unexpected type');
      return true;
    }

    // Helper to return the order of the particular instance
    function orderOf (that) {
      return that.constructor.__order__;
    }

    // Iterate through created types, applying an order meta attribute.
    var i = 0, n;
    for (; n = E.__names__[i]; i++) addOrder(E[n]);

    // Patch the type function to also add an order to any types created later.
    var oldType = E.type;
    E.type = function (name, tmpl) {
      return addOrder(oldType.call(E, name, tmpl));
    };

    // Less than
    E.prototype.lt = function (that) {
      return verifyType(that) && orderOf(this) < orderOf(that);
    };

    // Less than or equal
    E.prototype.lte = function (that) {
      return verifyType(that) && orderOf(this) <= orderOf(that);
    };

    // Greater than
    E.prototype.gt = function (that) {
      return verifyType(that) && orderOf(this) > orderOf(that);
    };

    // Greater than or equal
    E.prototype.gte = function (that) {
      return verifyType(that) && orderOf(this) >= orderOf(that);
    };

    // Equal (not that same as `equals`
    E.prototype.eq = function (that) {
      return verifyType(that) && orderOf(this) === orderOf(that);
    };

    // Not equals
    E.prototype.neq = function (that) {
      return verifyType(that) && orderOf(this) !== orderOf(that);
    };

    return E;
  };

  // Alias `enumeration`
  adt['enum'] = adt.enumeration;

  // Creates a singleton type that belongs to its own family.
  adt.newtype = function () {
    var args = adt.util.toArray(arguments);
    var data = adt.data();
    return data.type.apply(data, args);
  };

  // A contraint function that will accept any value.
  adt.any = function (x) { return x; };

  // A constraint generator that will perform instanceof checks on the value
  // to make sure it is of the correct type.
  // TODO: This needs a more helpful error message.
  adt.only = function () {
    var args = arguments;
    return function (x) {
      if (adt.util.typeCheck(args, x)) return x;
      throw new TypeError('Unexpected type');
    };
  };

  // Cloning for native JS types just returns a reference.
  adt.nativeClone = function (x) { return x; };

  // Equality for native JS types is just strict comparison.
  adt.nativeEquals = function (a, b) { return a === b; };
})(
  typeof exports !== 'undefined' ? exports : (this.adt = {})
);
