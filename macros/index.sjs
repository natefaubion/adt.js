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
  case { _ $adt ( $tok ... ) } => {
    var tok = #{ $tok ... };
    var adt = #{ $adt };
    if (tok.length) {
      var tokStr = unwrapSyntax(tok[0]);
      var adtStr = unwrapSyntax(adt[0]);
      throw new SyntaxError('(adt.js) Unexpected token "' + tokStr + 
                            '" in definition for "' + adtStr + '"');
    }
  }
}

macro $adt__field {
  case { _ $lib $adt $name (*) } => {
    return #{
      ($adt__toString($name));
    }
  }
  case { _ $lib $adt $name ($constraint:expr) } => {
    var adt = #{ $adt };
    var adtStr = unwrapSyntax(adt[0]);
    var constraint = #{ $constraint };
    var constraintStr = unwrapSyntax(constraint[0]);
    var constraintEnd = constraint[constraint.length - 1];
    var useAsIs;

    if (constraint[0].token.type === parser.Token.Keyword ||
        constraintEnd.token.type === parser.Token.Delimiter) {
      useAsIs = true;
    } else if (constraint[0].token.type === parser.Token.Identifier) {
      var identStr = unwrapSyntax(constraint[constraint.length - 1]);
      if (identStr[0].toLowerCase() === identStr[0]) {
        useAsIs = true;
      }
    }

    if (adtStr === constraintStr) {
      return #{
        ($adt__toString($name), $lib.only($adt));
      }
    } else if (useAsIs) {
      return #{
        ($adt__toString($name), $constraint);
      }
    } else {
      return #{
        ($adt__toString($name), $lib.only($constraint));
      }
    }
  }
}

macro $adt__fields {
  rule { $lib $adt $field $rec ( $name $(:) $constraint:expr , $tail ... ) } => {
    $field $adt__field $lib $adt $name ($constraint)
    $adt__fields $lib $adt $field $rec ($tail ...)
  }
  rule { $lib $adt $field $rec ( $name $(:) * , $tail ... ) } => {
    $field $adt__field $lob $adt $name (*)
    $adt__fields $lib $adt $field $rec ($tail ...)
  }
  rule { $lib $adt $field $rec ( $name $(:) $constraint:expr $err ... ) } => {
    $field $adt__field $lib $adt $name ($constraint)
    $adt__error $rec ($err ...)
  }
  rule { $lib $adt $field $rec ( $name $(:) * $err ... ) } => {
    $field $adt__field $lib $adt $name (*)
    $adt__error $rec ($err ...)
  }
  rule { $lib $adt $field $rec () } => {}
}

macro $adt__record {
  rule { $lib $adt $name { $fields ... } } => {
    ($adt__toString($name), $lib.record(function(field, $name) {
      $adt__fields $lib $adt field $name ($fields ...)
    }));
  }
}

macro $adt__single {
  rule { $lib $adt $name } => {
    ($adt__toString($name));
  }
}

macro $adt__types {
  rule { $lib $type $adt ( $name { $fields ... } , $tail ... ) } => {
    $type $adt__record $lib $adt $name { $fields ... }
    $adt__types $lib $type $adt ($tail ...)
  }
  rule { $lib $type $adt ( $name , $tail ... ) } => {
    $type $adt__single $lib $adt $name
    $adt__types $lib $type $adt ($tail ...)
  }
  rule { $lib $type $adt ( $name { $fields ... } $err ... ) } => {
    $type $adt__record $lib $adt $name { $fields ... }
    $adt__error $adt ($err ...)
  }
  rule { $lib $type $adt ( $name $err ... ) } => {
    $type $adt__single $lib $adt $name
    $adt__error $adt ($err ...)
  }
  rule { $lib $type $adt () } => {}
}

macro $adt__unwrap {
  rule { $adt ( $name { $fields ... } , $tail ... ) } => {
    var $name = $adt.$name;
    $adt__unwrap $adt ($tail ...)
  }
  rule { $adt ( $name , $tail ... ) } => {
    var $name = $adt.$name;
    $adt__unwrap $adt ($tail ...)
  }
  rule { $adt ( $name { $fields ... } ) } => {
    var $name = $adt.$name;
  }
  rule { $adt ( $name ) } => {
    var $name = $adt.$name;
  }
  rule { $adt () } => {}
}

let data = macro {
  rule { $name { $types ...  } } => {
    var $name = (function(lib) {
      return lib.data(function(type, $name) {
        $adt__types lib type $name ($types ...)
      });
    })($adt__load);
    $adt__unwrap $name ($types ...)
  }
  rule {} => {
    data
  }
}

let enum = macro {
  rule { $name { $types ... } } => {
    var $name = (function(lib) {
      return lib.enumeration(function(type, $name) {
        $adt__types lib type $name ($types ...)
      });
    })($adt__load);
    $adt__unwrap $name ($types ...)
  }
  rule {} => {
    enum
  }
}

let newtype = macro {
  rule { $name { $fields ... } } => {
    var $name = (function(lib) {
      return lib.newtype($adt__toString($name), lib.record(function(field, $name) {
        $adt__fields lib $name field $name ($fields ...)
      }));
    })($adt__load);
  }
  rule {} => {
    newtype
  }
}
