macro $adt__load {
  rule {} => {
    typeof module !== 'undefined' ? require('adt') : window.adt
  }
}

macro $adt__toString {
  case { _ ( $param ) } => {
    var param = #{ $param };
    return [makeValue(unwrapSyntax(param[0]), param)];
  }
}

macro $adt__error {
  case { _ () } => {
    return [];
  }
  case { _ ( $tok ... ) } => {
    throwSyntaxError('adt.js', 'Unexpected token', #{ $tok ... });
  }
}

macro $adt__field {
  case { _ $adt $lib $name (*) } => {
    return #{
      ($adt__toString($name))
    }
  }
  case { _ $adt $lib $name ($constraint ...) } => {
    var adt = #{ $adt };
    var constraint = #{ $constraint ... };
    var constraintEnd = unwrapSyntax(constraint[constraint.length - 1]);
    var T = parser.Token;
    var useAsIs;

    function matchesTok(type, value, tok) {
      m = true;
      if (tok.length === 1) tok = tok[0];
      if (type && tok.token.type !== type) m = false;
      if (value && tok.token.value !== value) m = false;
      return m;
    }

    // Anything with parens is assumed literal
    if (constraint.length === 1 && matchesTok(T.Delimiter, '()', constraint)) {
      useAsIs = true;
    }

    // Function literal
    else if (constraint.length === 3 &&
             matchesTok(T.Keyword, 'function', constraint[0]) &&
             matchesTok(T.Delimiter, '()', constraint[1]) &&
             matchesTok(T.Delimiter, '{}', constraint[2])) {
      useAsIs = true;
    }

    // Named function literal
    else if (constraint.length === 4 &&
             matchesTok(T.Keyword, 'function', constraint[0]) &&
             matchesTok(T.Identifier, null, constraint[1]) &&
             matchesTok(T.Delimiter, '()', constraint[2]) &&
             matchesTok(T.Delimiter, '{}', constraint[3])) {
      useAsIs = true;
    }

    // Non-uppercased identifier/path
    else if (matchesTok(T.Identifier, null, constraint[0]) &&
             constraintEnd[0].toLowerCase() === constraintEnd[0]) {
      useAsIs = true;
    }

    // Recursive constraint
    if (constraint.length === 1 &&
        unwrapSyntax(adt) === unwrapSyntax(constraint)) {
      return #{
        ($adt__toString($name), $lib.only($adt))
      }
    }

    // Literal constraint
    else if (useAsIs) {
      return #{
        ($adt__toString($name), $constraint ...)
      }
    }

    // Type constraint
    else {
      return #{
        ($adt__toString($name), $lib.only($constraint ...))
      }
    }
  }
}

macro $adt__fields {
  rule { $adt $lib $fieldfn $typename ( $name $[:] $constraint:expr , $rest ... ) } => {
    $fieldfn $adt__field $adt $lib $name ($constraint);
    $adt__fields $adt $lib $fieldfn $typename ($rest ...)
  }
  rule { $adt $lib $fieldfn $typename ( $name $[:] * , $rest ... ) } => {
    $fieldfn $adt__field $adt $lib $name (*);
    $adt__fields $adt $lib $fieldfn $typename ($rest ...)
  }
  rule { $adt $lib $fieldfn $typename ( $name $[:] $constraint:expr $err ... ) } => {
    $fieldfn $adt__field $adt $lib $name ($constraint);
    $adt__error ($err ...)
  }
  rule { $adt $lib $fieldfn $typename ( $name $[:] * $err ... ) } => {
    $fieldfn $adt__field $adt $lib $name (*);
    $adt__error ($err ...)
  }
  rule { $adt $lib $fieldfn $typename () } => {}
}

macro $adt__record {
  rule { $adt $lib $name { $fields ... } } => {
    ($adt__toString($name), $lib.record(function(field, $name) {
      $adt__fields $adt $lib field $name ($fields ...)
    }))
  }
}

macro $adt__single {
  rule { $adt $lib $name ( $val ) } => {
    ($adt__toString($name), $val)
  }
}

macro $adt__types {
  rule { $adt $lib $typefn ( $name { $fields ... } , $rest ... ) } => {
    $typefn $adt__record $adt $lib $name { $fields ... };
    $adt__types $adt $lib $typefn ($rest ...)
  }
  rule { $adt $lib $typefn ( $name = $val:expr , $rest ... ) } => {
    $typefn $adt__single $adt $lib $name ($val);
    $adt__types $adt $lib $typefn ($rest ...)
  }
  rule { $adt $lib $typefn ( $name , $rest ... ) } => {
    $typefn $adt__single $adt $lib $name (null);
    $adt__types $adt $lib $typefn ($rest ...)
  }
  rule { $adt $lib $typefn ( $name { $fields ... } $err ... ) } => {
    $typefn $adt__record $adt $lib $name { $fields ... };
    $adt__error ($err ...)
  }
  rule { $adt $lib $typefn ( $name = $val:expr $err ... ) } => {
    $typefn $adt__single $adt $lib $name ($val);
    $adt__error ($err ...)
  }
  rule { $adt $lib $typefn ( $name $err ... ) } => {
    $typefn $adt__single $adt $lib $name (null);
    $adt__error ($err ...)
  }
  rule { $adt $lib $typefn () } => {}
}

macro $adt__unwrap {
  rule { $adt ( $name { $fields ... } , $rest ... ) } => {
    var $name = $adt.$name;
    $adt__unwrap $adt ($rest ...)
  }
  rule { $adt ( $name = $val:expr , $rest ... ) } => {
    var $name = $adt.$name;
    $adt__unwrap $adt ($rest ...)
  }
  rule { $adt ( $name , $rest ... ) } => {
    var $name = $adt.$name;
    $adt__unwrap $adt ($rest ...)
  }
  rule { $adt ( $name { $fields ... } ) } => {
    var $name = $adt.$name;
  }
  rule { $adt ( $name = $val:expr ) } => {
    var $name = $adt.$name;
  }
  rule { $adt ( $name ) } => {
    var $name = $adt.$name;
  }
  rule { $adt () } => {}
}

let data = macro {
  rule { $adt:ident { $types ... } } => {
    var $adt = (function(lib) {
      return lib.data(function(type, $adt) {
        $adt__types $adt lib type ($types ...)
      })
    })($adt__load);
    $adt__unwrap $adt ($types ...)
  }
  rule { } => { data }
}

let enum = macro {
  rule { $adt:ident { $types ... } } => {
    var $adt = (function(lib) {
      return lib.enumeration(function(type, $adt) {
        $adt__types $adt lib type ($types ...)
      });
    })($adt__load);
    $adt__unwrap $adt ($types ...)
  }
  rule { } => { enum }
}

let newtype = macro {
  rule { $adt:ident { $fields ... } } => {
    var $adt = (function(lib) {
      return lib.newtype($adt__toString($adt), lib.record(function(field, $adt) {
        $adt__fields $adt lib field $adt ($fields ...)
      }));
    })($adt__load);
  }
  rule { } => { newtype }
}

export data;
export enum;
export newtype;
