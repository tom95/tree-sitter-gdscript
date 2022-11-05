const PREC = {
  typed_parameter: -1,
  conditional: -1,

  parenthesized_expression: 1,
  compare: 2,
  or: 3,
  and: 4,
  bitwise_or: 5,
  bitwise_and: 6,
  xor: 7,
  shift: 8,
  plus: 9,
  times: 10,
  power: 11,
  unary: 12,
  is: 13,
  as: 14,
  call: 15,
  attribute: 16,
}

module.exports = grammar({

  name: 'gdscript',

  word: $ => $._identifier,

  supertypes: $ => [$.expression, $.primary_expression],

  extras: $ => [
    $.comment,
    /[\s\uFEFF\u2060\u200B]|\\\r?\n/
  ],

  externals: $ => [
    $._newline,
    $._indent,
    $._dedent,
    $._string_start,
    $._string_content,
    $._string_end,
  ],

  inline: $ => [
    $._simple_statement,
    $._compound_statement,
    $.keyword_identifier,
  ],

  rules: {

    source: $ => repeat($._statement),

// -----------------------------------------------------------------------------
// -                                     Atoms                                 -
// -----------------------------------------------------------------------------

    _identifier: $ => /[a-zA-Z_][a-zA-Z_0-9]*/,
    // any "symbol"
    identifier: $ => $._identifier,
    // named symbol of a statement
    // such as a function name or class name
    name: $ => $._identifier,
    // symbol that only represents a type
    type: $ => $._identifier,
    comment: $ => token(seq('#', /.*/)),
    _semicolon: $ => ';',
    true: $ => 'true',
    false: $ => 'false',
    null: $ => 'null',
    underscore: $ => '_',
    static_keyword: $ => 'static',
    remote_keyword: $ => choice(
      'remote', 'master', 'puppet',
      'remotesync', 'mastersync', 'puppetsync'
    ),

    escape_sequence: $ => token(seq(
      '\\',
      choice(
        /u[a-fA-F\d]{4}/,
        /U[a-fA-F\d]{8}/,
        /x[a-fA-F\d]{2}/,
        /o\d{3}/,
        /\r\n/,
        /[^uxo]/
      )
    )),

    string: $ => seq(
      alias($._string_start, '"'),
      repeat(choice($.escape_sequence, $._string_content)),
      alias($._string_end, '"')
    ),

    float: $ => {
      const digits = repeat1(/[0-9]+_?/);
      const exponent = seq(/[eE][\+-]?/, digits)

      return token(choice(
        seq(digits, '.', optional(digits), optional(exponent)),
        seq(optional(digits), '.', digits, optional(exponent)),
        seq(digits, exponent)
      ))
    },

    integer: $ => token(choice(
      seq(
        choice('0x', '0X'),
        repeat1(/_?[A-Fa-f0-9]+/)
      ),
      seq(
        choice('0o', '0O'),
        repeat1(/_?[0-7]+/),
      ),
      seq(
        choice('0b', '0B'),
        repeat1(/_?[0-1]+/),
      ),
      repeat1(/[0-9]+_?/)
    )),

    // FIXME: node_path will need custom parsing as Godot supports all forms of
    // strings following '@'
    node_path: $ => token(seq(
      '@',
      choice("'", '"'),
      /[0-9a-zA-Z_/\- ]*/,
      choice("'", '"')
    )),

    get_node: $ => token(seq(
      '$',
      choice(
        seq(
          choice("'", '"'),
          /[0-9a-zA-Z_/\- .]*/,
          choice("'", '"')
        ),
        /[a-zA-Z_][a-zA-Z_/0-9]*/
      ),
    )),

// -----------------------------------------------------------------------------
// -                                  Statements                               -
// -----------------------------------------------------------------------------

    _statement: $ => choice(
      $._simple_statements,
      $._compound_statement
    ),

    body: $ => choice(
      $._simple_statements,
      seq(
        $._indent,
        repeat($._statement),
        $._dedent
      )
    ),

    // Simple statements

    _simple_statements: $ => seq(
      $._simple_statement,
      optional(repeat(seq($._semicolon, $._simple_statement))),
      optional($._semicolon),
      $._newline
    ),

    _simple_statement: $ => choice(
      $.tool_statement,
      $.signal_statement,
      $.class_name_statement,
      $.extends_statement,
      $.expression_statement,
      $.match_statement,
      $.export_variable_statement,
      $.onready_variable_statement,
      $.variable_statement,
      $.const_statement,
      $.return_statement,
      $.pass_statement,
      $.break_statement,
      $.breakpoint_statement,
      $.continue_statement
    ),

    expression_statement: $ => choice(
      $.expression,
      $.assignment,
      $.augmented_assignment,
    ),

    // -- Variables

    inferred_type: $ => choice(':=', seq(':', '=')),

    _variable_assignment: $ => seq('=', $.expression),
    _variable_inferred_type_assignment: $ => seq($.inferred_type, $.expression),
    _variable_typed_assignment: $ => seq(':', $.type, '=', $.expression),

    _variable_typed_definition: $ => choice(
      seq(':', $.type),
      $._variable_typed_assignment
    ),

    setter: $ => $._identifier,
    getter: $ => $._identifier,
    setget: $ => seq(
      'setget',
      choice(
        $.setter,
        seq($.setter, ',', $.getter),
        seq(',', $.getter)
      )
    ),

    _variable_statement: $ => seq(
      'var', $.name,
      optional(choice(
        $._variable_typed_definition,
        $._variable_inferred_type_assignment,
        $._variable_assignment
      )),
      optional($.setget)
    ),

    variable_statement: $ => seq(
      optional($.remote_keyword),
      $._variable_statement,
    ),

    export_argument_list: $ => seq(
      '(',
      optional(trailCommaSep1($.expression)),
      ')'
    ),

    export_variable_statement: $ => seq(
      'export',
      optional($.export_argument_list),
      optional($.remote_keyword),
      $._variable_statement
    ),

    onready_variable_statement: $ => seq(
      'onready',
      $._variable_statement
    ),

    const_statement: $ => seq(
      'const',
      $.name,
      choice(
        $._variable_inferred_type_assignment,
        $._variable_typed_assignment,
        $._variable_assignment
      )
    ),

    return_statement: $ => seq(
      'return',
      optional($.expression)
    ),

    pass_statement: $ => prec.left('pass'),
    break_statement: $ => prec.left('break'),
    breakpoint_statement: $ => 'breakpoint',
    continue_statement: $ => prec.left('continue'),
    tool_statement: $ => 'tool',

    signal_argument_list: $ => seq(
      '(',
      optional(trailCommaSep1($.identifier, ',')),
      ')'
    ),
    signal_statement: $ => seq(
      'signal',
      $.name,
      optional($.signal_argument_list)
    ),

    class_name_icon_path: $ => $.string,
    class_name_statement: $ => seq(
      'class_name',
      $.name,
      optional(seq(',', $.class_name_icon_path))
    ),

    dotted_type: $ => sep1($.type, '.'),
    extends_statement: $ => seq(
      'extends',
      choice(
        $.dotted_type,
        seq($.string, optional(seq('.', $.dotted_type))),
      )
    ),

    _compound_statement: $ => choice(
      $.if_statement,
      $.for_statement,
      $.while_statement,
      $.function_definition,
      $.constructor_definition,
      $.class_definition,
      $.enum_definition,
    ),

    if_statement: $ => seq(
      'if',
      $.expression,
      ':',
      $.body,
      repeat($.elif_clause),
      optional($.else_clause)
    ),

    elif_clause: $ => seq(
      'elif',
      $.expression,
      ':',
      $.body
    ),

    else_clause: $ => seq(
      'else',
      ':',
      $.body
    ),

    for_statement: $ => seq(
      'for',
      $.identifier,
      'in',
      $.expression,
      ':',
      $.body
    ),

    while_statement: $ => seq(
      'while',
      $.expression,
      ':',
      $.body
    ),

    class_definition: $ => seq(
      'class',
      $.name,
      optional($.extends_statement),
      ':',
      $.body
    ),

    // -- Enum
    enum_definition: $ => seq(
      'enum',
      optional($.name),
      $.enumerator_list
    ),

    enumerator_list: $ => seq(
      '{',
      trailCommaSep1($.enumerator),
      '}'
    ),

    _enumerator_expression: $ => choice(
      $.integer,
      $.binary_operator,
      $.identifier,
      $.unary_operator,
      $.attribute,
      $.subscript,
      $.call,
      $.parenthesized_expression
    ),

    enumerator: $ => seq(
      $.identifier,
      optional(seq('=', $._enumerator_expression))
    ),

// -----------------------------------------------------------------------------
// -                                     Match                                 -
// -----------------------------------------------------------------------------

    match_statement: $ => seq(
      'match',
      $.expression,
      ':',
      $.match_body
    ),

    match_body: $ => seq(
      $._indent,
      repeat1($.pattern_section),
      $._dedent
    ),

    pattern_section: $ => seq(
      commaSep1($._pattern),
      ':',
      $.body,
    ),

    _pattern: $ => choice(
      $.pattern_array,
      $.pattern_dictionary,
      $.pattern_binding,
      $.identifier,
      $.underscore,
      $.string,
      $.integer,
      $.float,
      $.true,
      $.false,
      $.null
    ),

    pattern_binding: $ => seq(
      'var',
      $.identifier
    ),

    pattern_open_ending: $ => '..',

    pattern_array: $ => seq(
      '[',
      optional(commaSep1(choice($._pattern, $.pattern_open_ending))),
      ']'
    ),

    pattern_dictionary: $ => seq(
      '{',
      optional(commaSep1(choice($.pattern_pair, $.pattern_open_ending))),
      '}'
    ),

    pattern_pair: $ => seq(
      $.string,
      ':',
      $._pattern
    ),

// -----------------------------------------------------------------------------
// -                                  Expressions                              -
// -----------------------------------------------------------------------------

    expression: $ => choice(
      $.comparison_operator,
      $.primary_expression,
      $.conditional_expression
    ),

    primary_expression: $ => choice(
      $.binary_operator,
      $.identifier,
      $.string,
      $.integer,
      $.float,
      $.true,
      $.false,
      $.null,
      $.unary_operator,
      $.node_path,
      $.get_node,
      $.attribute,
      $.subscript,
      $.base_call,
      $.call,
      $.array,
      $.dictionary,
      $.parenthesized_expression
    ),

    // -- Operators

    binary_operator: $ => choice(
      prec.left(PREC.and, seq($.primary_expression, choice('and', '&&'), $.primary_expression)),
      prec.left(PREC.or, seq($.primary_expression, choice('or', '||'), $.primary_expression)),
      prec.left(PREC.plus, seq($.primary_expression, '+', $.primary_expression)),
      prec.left(PREC.plus, seq($.primary_expression, '-', $.primary_expression)),
      prec.left(PREC.times, seq($.primary_expression, '*', $.primary_expression)),
      prec.left(PREC.times, seq($.primary_expression, '/', $.primary_expression)),
      prec.left(PREC.times, seq($.primary_expression, '%', $.primary_expression)),
      prec.left(PREC.bitwise_or, seq($.primary_expression, '|', $.primary_expression)),
      prec.left(PREC.bitwise_and, seq($.primary_expression, '&', $.primary_expression)),
      prec.left(PREC.xor, seq($.primary_expression, '^', $.primary_expression)),
      prec.left(PREC.shift, seq($.primary_expression, '<<', $.primary_expression)),
      prec.left(PREC.shift, seq($.primary_expression, '>>', $.primary_expression)),
      prec.left(PREC.is, seq($.primary_expression, 'is', $.primary_expression)),
      prec.left(PREC.as, seq($.primary_expression, 'as', $.identifier))
    ),

    unary_operator: $ => choice(
      prec(PREC.unary, seq( choice('not', '!'), $.primary_expression)),
      prec(PREC.unary, seq('-', $.primary_expression)),
      prec(PREC.unary, seq('+', $.primary_expression)),
      prec(PREC.unary, seq('~', $.primary_expression))
    ),

    comparison_operator: $ => prec.left(PREC.compare, seq(
      $.primary_expression,
      repeat1(seq(
        choice(
          '<',
          '<=',
          '==',
          '!=',
          '>=',
          '>',
          'in',
          'is',
        ),
        $.primary_expression
      ))
    )),

    // -- Accessors
    subscript: $ => seq(
      $.primary_expression,
      '[',
      $.expression,
      ']'
    ),

    attribute_call: $ => prec(PREC.attribute, seq(
      $.identifier, $.argument_list
    )),
    attribute_subscript: $ => prec(PREC.attribute, seq(
      $.identifier, '[', $.primary_expression, ']'
    )),
    attribute: $ => prec(PREC.attribute, seq(
      $.primary_expression,
      seq('.', $.identifier)
    )),

    conditional_expression: $ => prec.right(PREC.conditional, seq(
      $.expression,
      'if',
      $.expression,
      'else',
      $.expression
    )),

    parenthesized_expression: $ => prec(PREC.parenthesized_expression, seq(
      '(',
      $.expression,
      ')'
    )),

// -----------------------------------------------------------------------------
// -                                  Assignment                               -
// -----------------------------------------------------------------------------

    assignment: $ => seq(
      $.expression,
      '=',
      $.expression
    ),

    augmented_assignment: $ => seq(
      $.expression,
      choice('+=', '-=', '*=', '/=', '%=', '>>=', '<<=', '&=', '^=', '|='),
      $.expression
    ),

// -----------------------------------------------------------------------------
// -                                 Data Structs                              -
// -----------------------------------------------------------------------------

    pair: $ => seq(
      choice(
        seq(
          $.expression,
          ':',
        ),
        seq(
          $.identifier,
          '=',
        )),
      $.expression
    ),

    dictionary: $ => seq(
      '{',
      optional(trailCommaSep1($.pair)),
      '}'
    ),

    array: $ => seq(
      '[',
      optional(trailCommaSep1($.expression)),
      ']'
    ),

// -----------------------------------------------------------------------------
// -                              Function Definition                          -
// -----------------------------------------------------------------------------


    typed_parameter: $ => prec(PREC.typed_parameter, seq(
      $.identifier,
      ':',
      $.type
    )),

    default_parameter: $ => seq(
      $.identifier,
      '=',
      $.expression
    ),

    typed_default_parameter: $ => prec(PREC.typed_parameter, seq(
      $.identifier,
      ':',
      $.type,
      '=',
      $.expression
    )),

    _parameters: $ => commaSep1(choice(
        $.identifier,
        $.typed_parameter,
        $.default_parameter,
        $.typed_default_parameter,
    )),

    parameters: $ => seq(
      '(',
      optional($._parameters),
      ')'
    ),

    return_type: $ => seq(
      '->',
      $.type
    ),

    function_definition: $ => seq(
      optional(choice($.static_keyword, $.remote_keyword)),
      'func',
      $.name,
      $.parameters,
      optional($.return_type),
      ':',
      $.body
    ),

    constructor_definition: $ => seq(
      'func', '_init',
      $.parameters,
      optional(seq('.', $.argument_list)),
      optional($.return_type),
      ':',
      $.body
    ),


// -----------------------------------------------------------------------------
// -                                 Function Call                             -
// -----------------------------------------------------------------------------

    argument_list: $ => seq(
      '(',
      optional(commaSep1($.expression)),
      ')'
    ),

    base_call: $ => prec(PREC.call, seq(
      '.',
      $.identifier,
      $.argument_list
    )),

    call: $ => prec(PREC.call, seq(
      $.primary_expression,
      $.argument_list
    )),

  } // end rules

})

function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)))
}

function commaSep1(rule) {
  return sep1(rule, ',')
}

function trailCommaSep1(rule) {
  return seq(sep1(rule, ','), optional(','))
}
