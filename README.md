tree-sitter-gdscript
==================

Fork of [PrestonKnopp/tree-sitter-gdscript](https://github.com/PrestonKnopp/tree-sitter-gdscript)'s GDScript grammar for tree-sitter. Carries fixes and updates to the grammar.

### Todo

- [ ] Format Specifiers
- [X] Statements
  - [X] setget
  - [X] export
  - [X] const
  - [X] signal
- [X] Literals
  - [X] @"NodePath/StringName"
  - [X] $node and $"../node"
- [X] Operators
  - [X] is
  - [X] as
- [X] Keyword Statements
  - [X] breakpoint
- [X] Variable Attributes
  - [X] onready
  - These can come after 'export' or before 'var'
    - [X] remote[sync]
    - [X] master[sync]
    - [X] puppet[sync]
- [X] Function Attributes
  - [X] static
  - [X] remote[sync]
  - [X] master[sync]
  - [X] puppet[sync]
- [X] Compound Statements
  - [X] match
  - [X] enum
  - [X] inheriting class constructor
- [X] Expression
  - [X] call base class function
