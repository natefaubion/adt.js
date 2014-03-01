// adt.js 
// ------
// Algebraic data types and immutable structures in Javascript
//
// version : 0.7.2
// author  : Nathan Faubion <nathan@n-son.com>
// license : MIT

;(function (adt) {
  'use strict';

  // Base class from which all adt.js classes inherit.
  adt.__Base__ = function () {};

  // ADT Class Generation
  // --------------------

  adt.data = function () {
    var targ0 = typeof arguments[0];

    // adt.data(...names: String)
    if (targ0 === 'string') {
      var names = arguments;
      return adt.data(function (type) {
        var i = 0, len = names.length;
        for (; i < len; i++) type(names[i]);
      });
    }

    // adt.data(types: Object)
    if (targ0 === 'object') {
      var types = arguments[0];
      return adt.data(function (type) {
        for (var name in types) {
          if (types.hasOwnProperty(name)) type(name, types[name]);
        }
      });
    }

    // adt.data(configure: Function)
    var callback = arguments[0] || noop;
    var names = [];

    // Create a new parent class.
    // This class should never be created using `new`. You obviously can,
    // but it won't be of much use. You can however override the apply method
    // to create default instances.
    var D = inherit(adt.__Base__, function () {
      if (!(this instanceof D) && D.apply !== Function.prototype.apply) {
        return D.apply(this, arguments);
      }
      throw new Error('Bad invocation');
    });

    // Adds a new type to the ADT.
    D.type = function (name, tmpl) {
      if (typeof name !== 'string') {
        tmpl = name;
        name = uniqueId('Anonymous');
      }
      
      // Create a new template if not provided with one
      var isSingle = checkTypes([String, Boolean, Number, Date, null, void 0], tmpl);
      if (isSingle) tmpl = adt.single(tmpl);
      else if (typeof tmpl !== 'function') {
        tmpl = checkType(Array, tmpl)
          ? adt.record.apply(null, tmpl)
          : adt.record(tmpl);
      }

      // Add typechecking attributes for this type. Everything starts out as
      // false by default. Each individual class should overrides its own.
      D.prototype['is' + name] = false;

      // Call the template to build our type.
      var d = tmpl(D, name);

      // Bind the constructor context to avoid conflicts with calling as a method.
      d = (typeof d === 'function') ? extend(d.bind(), d) : d;

      // Export it on the parent type.
      D[name] = d;
      names.push(name);

      return d;
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
      var i = 0, n, name;
      for (; n = names[i]; i++) if (this[n].seal) this[n].seal();
      delete D.type;
      delete D.seal;
      return D;
    };

    // Export names as a meta object
    D.__names__ = names;
    D.prototype.__adtClass__ = D;
    return D;
  };

  // Singleton Class Generation
  // --------------------------

  // Create a single empty class instance. You can pass in a value that the
  // class will use during JSON serialization.
  adt.single = function (val) {
    var ctr = function () {};
    ctr.__value__ = val === void 0 ? null : val;

    return function (parent, name) {
      inherit(parent, ctr);
      extend(ctr.prototype, adt.single.__methods__);

      ctr.className = name;
      ctr.prototype['is' + name] = true;

      return new ctr();
    };
  }

  // Singleton Methods
  // -----------------

  adt.single.__methods__ = {
    toString: function () {
      return this.constructor.className;
    },

    toJSON: function () {
      return this.constructor.__value__;
    },

    clone: function () {
      return this;
    },

    equals: function (that) {
      return this === that;
    },

    hasInstance: function(that) {
      return this === that;
    }
  };

  // Record Class Generation
  // -----------------------

  adt.record = function () {
    var targ0 = typeof arguments[0];

    // adt.record(...names: String)
    if (targ0 === 'string') {
      var names = arguments;
      return adt.record(function (field) {
        var i = 0, len = names.length;
        for (; i < len; i++) field(names[i], adt.any);
      });
    }

    // adt.record(fields: Object)
    else if (targ0 === 'object') {
      var fields = arguments[0];
      return adt.record(function (field) {
        for (var name in fields) {
          if (fields.hasOwnProperty(name)) field(name, fields[name]);
        }
      });
    }

    // adt.record(template: Function)
    var callback = arguments[0] || noop;
    var names = [];
    var constraints = {};

    // A record's constructor can be called without `new` and will also throw
    // an error if called with the wrong number of arguments. Its arguments can
    // be curried as long as it isn't called with the `new` keyword.
    var ctr = function () {
      var args = arguments;
      var len = names.length;
      if (this instanceof ctr) {
        if (args.length !== len) {
          throw new Error(
            'Unexpected number of arguments for ' + ctr.className + ': ' +
            'got ' + args.length + ', but need ' + len + '.'
          );
        }
        var i = 0, n;
        for (; n = names[i]; i++) {
          this[n] = constraints[n](args[i], n, ctr);
        }
      } else {
        return args.length < len
          ? partial(ctr, toArray(args))
          : ctrApply(ctr, args);
      }
    };

    return function (parent, name) {
      inherit(parent, ctr);
      extend(ctr, adt.record.__classMethods__);
      extend(ctr.prototype, adt.record.__methods__);

      ctr.className = name;
      ctr.prototype['is' + name] = true;

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
      var fields = callback.call(ctr, ctr.field, ctr);

      // If an object was returned in the callback, assume it's a mapping of
      // more fields to add.
      if (typeof fields === 'object' && fields !== ctr) {
        for (var name in fields) {
          if (fields.hasOwnProperty(name)) ctr.field(name, fields[name]);
        }
      }

      // Export names and constraints as meta attributes.
      ctr.__names__ = names;
      ctr.__constraints__ = constraints;
      return ctr;
    };
  };

  // Record Methods
  // --------------
  
  adt.record.__methods__ = {
    toString: function () {
      var ctr = this.constructor;
      var vals = ctr.unapply(this);
      return ctr.className + (vals.length ? '(' + vals.join(', ') + ')' : '');
    },

    toJSON: function () {
      return this.constructor.unapplyObject(this, toJSONValue);
    },

    // Clones any value that is an adt.js type, delegating other JS values
    // to `adt.nativeClone`.
    clone: function () {
      var ctr = this.constructor;
      var names = ctr.__names__;
      var args = [], i = 0, n, val;
      for (; n = names[i]; i++) {
        val = this[n];
        args[i] = val instanceof adt.__Base__ 
          ? val.clone()
          : adt.nativeClone(val);
      }
      return ctr.apply(null, args);
    },

    // Recursively compares all adt.js types, delegating other JS values
    // to `adt.nativeEquals`.
    equals: function (that) {
      var ctr = this.constructor;
      if (this === that) return true;
      if (!(that instanceof ctr)) return false;
      var names = ctr.__names__;
      var i = 0, len = names.length;
      var vala, valb, n;
      for (; i < len; i++) {
        n = names[i], vala = this[n], valb = that[n];
        if (vala instanceof adt.__Base__) {
          if (!vala.equals(valb)) return false;
        } else if (!adt.nativeEquals(vala, valb)) return false;
      }
      return true;
    },

    // Overloaded to take either strings or numbers. Throws an error if the
    // key can't be found.
    get: function (field) {
      var ctr = this.constructor;
      var names = ctr.__names__;
      var constraints = ctr.__constraints__;
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
    },

    set: function (vals) {
      var ctr = this.constructor;
      var names = ctr.__names__;
      var args = [], i = 0, n;
      for (; n = names[i]; i++) args[i] = n in vals ? vals[n] : this[n];
      return ctr.apply(null, args);
    }
  };

  adt.record.__classMethods__ = {
    create: function (vals) {
      var args = [];
      var names = this.__names__;
      var i = 0, len = names.length, n;
      for (; n = names[i]; i++) {
        if (!(n in vals)) {
          throw new Error('Missing `' + n + '` in arguments to ' + this.className);
        }
        args[i] = vals[n];
      }
      return this.apply(null, args);
    },

    hasInstance: function (inst) {
      return inst instanceof this;
    },

    unapply: function (inst, fn) {
      if (this.hasInstance(inst)) {
        var names = this.__names__;
        var vals = [], i = 0, n;
        for (; n = names[i]; i++) vals[i] = fn ? fn(inst[n], n) : inst[n];
        return vals;
      }
    },

    unapplyObject: function (inst, fn) {
      if (this.hasInstance(inst)) {
        var names = this.__names__;
        var vals = {}, i = 0, n;
        for (; n = names[i]; i++) vals[n] = fn ? fn(inst[n], n) : inst[n];
        return vals;
      }
    },

    seal: function () {
      delete this.field;
      delete this.seal;
      return this;
    }
  };

  // Enum Class Generation
  // ---------------------

  adt.enumeration = function () {
    var E = adt.data.apply(null, arguments);
    var order = 0;

    // Helper to add the order meta attribute to a type.
    function addOrder (that) {
      if (that.constructor) that = that.constructor;
      that.__order__ = order++;
      return that;
    }

    // Iterate through the created types, applying the order meta attribute.
    for (var i = 0, n; n = E.__names__[i]; i++) addOrder(E[n]);

    // Patch the type function to add an order to any types created later.
    var __type = E.type;
    E.type = function () {
      return addOrder(__type.apply(E, arguments));
    };

    extend(E.prototype, adt.enumeration.__methods__);
    return E;
  };

  adt['enum'] = adt.enumeration;

  // Enum Methods
  // ------------

  function assertADT (a, b) {
    if (b instanceof a.__adtClass__) return true;
    throw new TypeError('Unexpected type');
  }

  function orderOf (that) {
    return that.constructor.__order__;
  }

  adt.enumeration.__methods__ = {
    lt: function (that) {
      return assertADT(this, that) && orderOf(this) < orderOf(that);
    },

    lte: function (that) {
      return assertADT(this, that) && orderOf(this) <= orderOf(that);
    },

    gt: function (that) {
      return assertADT(this, that) && orderOf(this) > orderOf(that);
    },

    gte: function (that) {
      return assertADT(this, that) && orderOf(this) >= orderOf(that);
    },

    eq: function (that) {
      return assertADT(this, that) && orderOf(this) === orderOf(that);
    },

    neq: function (that) {
      return assertADT(this, that) && orderOf(this) !== orderOf(that);
    },
  };

  // Public Helpers
  // --------------

  // Cloning for native JS types just returns a reference.
  adt.nativeClone = function (x) { return x; };

  // Equality for native JS types is just strict comparison.
  adt.nativeEquals = function (a, b) { return a === b; };

  // Shortcut for creating an ADT with only one type.
  adt.newtype = function () {
    var args = toArray(arguments);
    var data = adt.data();
    return data.type.apply(data, args);
  };

  // A contraint function that will accept any value.
  adt.any = function (x) { return x; };

  // A constraint generator that will perform instanceof checks on the value
  // to make sure it is of the correct type.
  adt.only = function () {
    var args = arguments;
    return function (x, field, ctr) {
      if (checkTypes(args, x)) return x;
      var err = 'Unexpected type';
      if (field && ctr) err += ' for `' + field + '` of ' + ctr.className;
      throw new TypeError(err);
    };
  };

  // Utility Functions
  // -----------------

  function toArray (a, start) {
    var dest = [], i = start || 0, len = a.length;
    for (; i < len; i++) dest.push(a[i]);
    return dest;
  }

  function ctrApply (ctr, args) {
    var C = function () {};
    C.prototype = ctr.prototype;
    var inst = new C();
    var ret = ctr.apply(inst, args);
    return inst;
  }

  function inherit (sup, sub) {
    var C = function () {};
    C.prototype = sup.prototype;
    sub.prototype = new C();
    sub.prototype.constructor = sub;
    return sub;
  }

  function partial (func, args) {
    return function () {
      return func.apply(this, args.concat(toArray(arguments)));
    };
  }

  function extend (dest /*, ...sources*/) {
    var args = toArray(arguments, 1);
    var i = 0, len = args.length, k;
    for (; i < len; i++) {
      for (k in args[i]) {
        if (args[i].hasOwnProperty(k)) dest[k] = args[i][k];
      }
    }
    return dest;
  };

  function checkType (type, x) {
    if (type instanceof Function) {
      if (x instanceof type
      || type === Number  && typeof x === 'number'
      || type === String  && typeof x === 'string'
      || type === Boolean && typeof x === 'boolean') return true;
    } else {
      if (type instanceof adt.__Base__ && type.equals(x)
      || type === x) return true;
    }
    return false;
  }

  function checkTypes(types, x) {
    var i = 0, len = types.length;
    for (; i < len; i++) if (checkType(types[i], x)) return true;
    return false;
  }

  function toJSONValue (x) {
    return x && typeof x === 'object' && x.toJSON ? x.toJSON() : x;
  }

  var id = 0;
  function uniqueId (pre) {
    return (pre || '') + id++;
  }

  function noop () {}

})(typeof exports !== 'undefined' ? exports : (this.adt = {}));
