//! C parser using native tree-sitter
//!
//! Extracts functions, structs, includes, and call sites from C code.
//! Optimized for embedded systems and systems programming patterns.

use std::time::Instant;
use tree_sitter::{Node, Parser, Query, QueryCursor};

use super::types::*;

/// C parser
pub struct CParser {
    parser: Parser,
    function_query: Query,
    struct_query: Query,
    include_query: Query,
    call_query: Query,
}

impl CParser {
    pub fn new() -> Result<Self, String> {
        let mut parser = Parser::new();
        let language = tree_sitter_c::LANGUAGE;
        parser.set_language(&language.into())
            .map_err(|e| format!("Failed to set language: {}", e))?;
        
        // Function definitions (including static functions common in embedded)
        let function_query = Query::new(
            &language.into(),
            r#"
            (function_definition
                declarator: (function_declarator
                    declarator: (identifier) @name
                    parameters: (parameter_list) @params
                )
                type: (_)? @return_type
            ) @function
            
            (function_definition
                declarator: (pointer_declarator
                    declarator: (function_declarator
                        declarator: (identifier) @name
                    )
                )
            ) @ptr_function
            "#,
        ).map_err(|e| format!("Failed to create function query: {}", e))?;
        
        // Structs, unions, enums, and typedefs
        let struct_query = Query::new(
            &language.into(),
            r#"
            (struct_specifier
                name: (type_identifier) @name
            ) @struct
            
            (union_specifier
                name: (type_identifier) @name
            ) @union
            
            (enum_specifier
                name: (type_identifier) @name
            ) @enum
            
            (type_definition
                declarator: (type_identifier) @name
            ) @typedef
            "#,
        ).map_err(|e| format!("Failed to create struct query: {}", e))?;

        // Include directives
        let include_query = Query::new(
            &language.into(),
            r#"
            (preproc_include
                path: [
                    (string_literal) @path
                    (system_lib_string) @system_path
                ]
            ) @include
            "#,
        ).map_err(|e| format!("Failed to create include query: {}", e))?;
        
        // Function calls
        let call_query = Query::new(
            &language.into(),
            r#"
            (call_expression
                function: [
                    (identifier) @callee
                    (field_expression
                        argument: (_) @receiver
                        field: (field_identifier) @callee
                    )
                    (parenthesized_expression
                        (pointer_expression
                            argument: (field_expression
                                argument: (_) @receiver
                                field: (field_identifier) @callee
                            )
                        )
                    )
                ]
                arguments: (argument_list) @args
            ) @call
            "#,
        ).map_err(|e| format!("Failed to create call query: {}", e))?;
        
        Ok(Self {
            parser,
            function_query,
            struct_query,
            include_query,
            call_query,
        })
    }
    
    pub fn parse(&mut self, source: &str) -> ParseResult {
        let start = Instant::now();
        
        let tree = match self.parser.parse(source, None) {
            Some(t) => t,
            None => {
                let mut result = ParseResult::new(Language::C);
                result.errors.push(ParseError {
                    message: "Failed to parse source".to_string(),
                    range: Range::new(0, 0, 0, 0),
                });
                return result;
            }
        };
        
        let root = tree.root_node();
        let source_bytes = source.as_bytes();
        
        let mut result = ParseResult::with_tree(Language::C, tree.clone());
        
        self.extract_functions(&root, source_bytes, &mut result);
        self.extract_structs(&root, source_bytes, &mut result);
        self.extract_includes(&root, source_bytes, &mut result);
        self.extract_calls(&root, source_bytes, &mut result);
        
        result.parse_time_us = start.elapsed().as_micros() as u64;
        result
    }

    fn extract_functions(&self, root: &Node, source: &[u8], result: &mut ParseResult) {
        let mut cursor = QueryCursor::new();
        let matches = cursor.matches(&self.function_query, *root, source);
        
        for m in matches {
            let mut name = String::new();
            let mut range = Range::new(0, 0, 0, 0);
            
            for capture in m.captures {
                let node = capture.node;
                let capture_name = self.function_query.capture_names()[capture.index as usize];
                
                match capture_name {
                    "name" => {
                        name = node.utf8_text(source).unwrap_or("").to_string();
                    }
                    "function" | "ptr_function" => {
                        range = node_range(&node);
                    }
                    _ => {}
                }
            }
            
            if !name.is_empty() {
                result.functions.push(FunctionInfo {
                    name,
                    qualified_name: None,
                    parameters: Vec::new(),
                    return_type: None,
                    is_exported: true,
                    is_async: false,
                    is_generator: false,
                    range,
                    decorators: Vec::new(),
                    doc_comment: None,
                });
            }
        }
    }
    
    fn extract_structs(&self, root: &Node, source: &[u8], result: &mut ParseResult) {
        let mut cursor = QueryCursor::new();
        let matches = cursor.matches(&self.struct_query, *root, source);
        
        for m in matches {
            let mut name = String::new();
            let mut range = Range::new(0, 0, 0, 0);
            
            for capture in m.captures {
                let node = capture.node;
                let capture_name = self.struct_query.capture_names()[capture.index as usize];
                
                match capture_name {
                    "name" => {
                        name = node.utf8_text(source).unwrap_or("").to_string();
                    }
                    "struct" | "union" | "enum" | "typedef" => {
                        range = node_range(&node);
                    }
                    _ => {}
                }
            }
            
            if !name.is_empty() {
                result.classes.push(ClassInfo {
                    name,
                    extends: None,
                    implements: Vec::new(),
                    is_exported: true,
                    is_abstract: false,
                    methods: Vec::new(),
                    properties: Vec::new(),
                    range,
                    decorators: Vec::new(),
                });
            }
        }
    }

    fn extract_includes(&self, root: &Node, source: &[u8], result: &mut ParseResult) {
        let mut cursor = QueryCursor::new();
        let matches = cursor.matches(&self.include_query, *root, source);
        
        for m in matches {
            let mut path = String::new();
            let mut range = Range::new(0, 0, 0, 0);
            
            for capture in m.captures {
                let node = capture.node;
                let capture_name = self.include_query.capture_names()[capture.index as usize];
                
                match capture_name {
                    "path" | "system_path" => {
                        let text = node.utf8_text(source).unwrap_or("");
                        path = text.trim_matches(|c| c == '"' || c == '<' || c == '>').to_string();
                    }
                    "include" => {
                        range = node_range(&node);
                    }
                    _ => {}
                }
            }
            
            if !path.is_empty() {
                result.imports.push(ImportInfo {
                    source: path,
                    named: Vec::new(),
                    default: None,
                    namespace: None,
                    is_type_only: false,
                    range,
                });
            }
        }
    }
    
    fn extract_calls(&self, root: &Node, source: &[u8], result: &mut ParseResult) {
        let mut cursor = QueryCursor::new();
        let matches = cursor.matches(&self.call_query, *root, source);
        
        for m in matches {
            let mut callee = String::new();
            let mut receiver = None;
            let mut arg_count = 0;
            let mut range = Range::new(0, 0, 0, 0);
            
            for capture in m.captures {
                let node = capture.node;
                let capture_name = self.call_query.capture_names()[capture.index as usize];
                
                match capture_name {
                    "callee" => {
                        callee = node.utf8_text(source).unwrap_or("").to_string();
                    }
                    "receiver" => {
                        receiver = Some(node.utf8_text(source).unwrap_or("").to_string());
                    }
                    "args" => {
                        arg_count = node.named_child_count();
                    }
                    "call" => {
                        range = node_range(&node);
                    }
                    _ => {}
                }
            }
            
            if !callee.is_empty() {
                result.calls.push(CallSite {
                    callee,
                    receiver,
                    arg_count,
                    range,
                });
            }
        }
    }
}

impl Default for CParser {
    fn default() -> Self {
        Self::new().expect("Failed to create C parser")
    }
}

fn node_range(node: &Node) -> Range {
    Range {
        start: Position {
            line: node.start_position().row as u32,
            column: node.start_position().column as u32,
        },
        end: Position {
            line: node.end_position().row as u32,
            column: node.end_position().column as u32,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_function() {
        let mut parser = CParser::new().unwrap();
        let result = parser.parse("int main(void) { return 0; }");
        
        assert_eq!(result.functions.len(), 1);
        assert_eq!(result.functions[0].name, "main");
    }

    #[test]
    fn test_parse_static_function() {
        let mut parser = CParser::new().unwrap();
        let result = parser.parse("static void init_hardware(void) { }");
        
        assert_eq!(result.functions.len(), 1);
        assert_eq!(result.functions[0].name, "init_hardware");
    }

    #[test]
    fn test_parse_struct() {
        let mut parser = CParser::new().unwrap();
        let result = parser.parse("struct gpio_config { int pin; int mode; };");
        
        assert_eq!(result.classes.len(), 1);
        assert_eq!(result.classes[0].name, "gpio_config");
    }

    #[test]
    fn test_parse_typedef_struct() {
        let mut parser = CParser::new().unwrap();
        let result = parser.parse("typedef struct { int x; int y; } Point;");
        
        assert!(result.classes.len() >= 1);
    }

    #[test]
    fn test_parse_include() {
        let mut parser = CParser::new().unwrap();
        let result = parser.parse("#include <stdio.h>\n#include \"myheader.h\"");
        
        assert_eq!(result.imports.len(), 2);
        assert_eq!(result.imports[0].source, "stdio.h");
        assert_eq!(result.imports[1].source, "myheader.h");
    }

    #[test]
    fn test_parse_function_call() {
        let mut parser = CParser::new().unwrap();
        let result = parser.parse("void test() { printf(\"hello\"); }");
        
        assert!(result.calls.len() >= 1);
        let call = result.calls.iter().find(|c| c.callee == "printf").unwrap();
        assert_eq!(call.callee, "printf");
    }

    #[test]
    fn test_parse_struct_field_call() {
        let mut parser = CParser::new().unwrap();
        let result = parser.parse("void test() { device->init(); }");
        
        assert!(result.calls.len() >= 1);
        let call = result.calls.iter().find(|c| c.callee == "init").unwrap();
        assert_eq!(call.receiver, Some("device".to_string()));
    }

    #[test]
    fn test_parse_embedded_patterns() {
        let mut parser = CParser::new().unwrap();
        let source = r#"
            #include "stm32f4xx.h"
            
            typedef struct {
                uint32_t pin;
                uint32_t mode;
            } GPIO_Config;
            
            static void GPIO_Init(GPIO_Config* config) {
                HAL_GPIO_Init(GPIOA, config);
            }
            
            int main(void) {
                GPIO_Config led = {.pin = 5, .mode = OUTPUT};
                GPIO_Init(&led);
                while(1) {
                    HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);
                    HAL_Delay(500);
                }
                return 0;
            }
        "#;
        
        let result = parser.parse(source);
        
        // Should find functions
        assert!(result.functions.len() >= 2);
        assert!(result.functions.iter().any(|f| f.name == "GPIO_Init"));
        assert!(result.functions.iter().any(|f| f.name == "main"));
        
        // Should find struct/typedef
        assert!(result.classes.len() >= 1);
        
        // Should find includes
        assert!(result.imports.len() >= 1);
        
        // Should find HAL calls
        assert!(result.calls.iter().any(|c| c.callee == "HAL_GPIO_Init"));
        assert!(result.calls.iter().any(|c| c.callee == "HAL_Delay"));
    }
}
