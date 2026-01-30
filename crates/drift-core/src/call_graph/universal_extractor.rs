//! Universal call graph extractor
//!
//! Extracts functions and calls from any language using the unified ParseResult.
//! Also extracts classes as callable entities (for constructor resolution).

use crate::parsers::{ParseResult, Language};
use super::extractor::{CallGraphExtractor, ExtractionResult, ExtractedFunction, ExtractedCall};

/// Universal extractor that works with any ParseResult
pub struct UniversalExtractor;

impl UniversalExtractor {
    pub fn new() -> Self {
        Self
    }
    
    /// Extract from a ParseResult
    pub fn extract_from_parse_result(&self, result: &ParseResult) -> ExtractionResult {
        // Extract functions
        let mut functions: Vec<ExtractedFunction> = result.functions
            .iter()
            .map(|f| ExtractedFunction {
                name: f.name.clone(),
                start_line: f.range.start.line,
                end_line: f.range.end.line,
                is_exported: f.is_exported,
                is_async: f.is_async,
            })
            .collect();
        
        // Also extract classes as callable entities (for constructor resolution)
        // When someone calls `new MyClass()` or `MyClass()`, we want to resolve it
        for class in &result.classes {
            functions.push(ExtractedFunction {
                name: class.name.clone(),
                start_line: class.range.start.line,
                end_line: class.range.end.line,
                is_exported: class.is_exported,
                is_async: false,
            });
            
            // Also add class methods as functions
            for method in &class.methods {
                // Create qualified name: ClassName.methodName
                let qualified_name = format!("{}.{}", class.name, method.name);
                functions.push(ExtractedFunction {
                    name: qualified_name,
                    start_line: method.range.start.line,
                    end_line: method.range.end.line,
                    is_exported: class.is_exported,
                    is_async: method.is_async,
                });
            }
        }
        
        let calls: Vec<ExtractedCall> = result.calls
            .iter()
            .map(|c| ExtractedCall {
                callee_name: c.callee.clone(),
                line: c.range.start.line,
                receiver: c.receiver.clone(),
            })
            .collect();
        
        ExtractionResult { functions, calls }
    }
}

impl Default for UniversalExtractor {
    fn default() -> Self {
        Self::new()
    }
}

impl CallGraphExtractor for UniversalExtractor {
    fn can_handle(&self, file: &str) -> bool {
        // Can handle any file that has a recognized extension
        Language::from_path(file).is_some()
    }
    
    fn extract(&self, parse_result: &ParseResult, _file: &str) -> ExtractionResult {
        self.extract_from_parse_result(parse_result)
    }
    
    fn language(&self) -> Language {
        // This is a universal extractor, but we need to return something
        Language::TypeScript
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parsers::ParserManager;
    
    #[test]
    fn test_extract_typescript() {
        let mut parser = ParserManager::new();
        let source = r#"
            export function hello() {
                console.log("hi");
                world();
            }
            
            function world() {
                return 42;
            }
        "#;
        
        let result = parser.parse(source, Language::TypeScript).unwrap();
        let extractor = UniversalExtractor::new();
        let extraction = extractor.extract_from_parse_result(&result);
        
        assert_eq!(extraction.functions.len(), 2);
        assert!(extraction.calls.len() >= 2); // console.log and world
    }
    
    #[test]
    fn test_extract_classes_as_callables() {
        let mut parser = ParserManager::new();
        let source = r#"
            export class UserService {
                constructor() {}
                
                getUser(id: string) {
                    return { id };
                }
            }
            
            function main() {
                const service = new UserService();
                service.getUser("123");
            }
        "#;
        
        let result = parser.parse(source, Language::TypeScript).unwrap();
        let extractor = UniversalExtractor::new();
        let extraction = extractor.extract_from_parse_result(&result);
        
        // Should have: main function + UserService class + methods
        let function_names: Vec<&str> = extraction.functions.iter().map(|f| f.name.as_str()).collect();
        
        assert!(function_names.contains(&"main"), "Should have main function");
        assert!(function_names.contains(&"UserService"), "Should have UserService class as callable");
        // Methods are extracted as top-level functions by the TS parser
        assert!(function_names.contains(&"getUser"), "Should have getUser method");
    }
    
    #[test]
    fn test_extract_python_classes() {
        let mut parser = ParserManager::new();
        let source = r#"
class AccountService:
    def __init__(self):
        pass
    
    def get_account(self, account_id):
        return {"id": account_id}

def main():
    service = AccountService()
    service.get_account("123")
        "#;
        
        let result = parser.parse(source, Language::Python).unwrap();
        let extractor = UniversalExtractor::new();
        let extraction = extractor.extract_from_parse_result(&result);
        
        let function_names: Vec<&str> = extraction.functions.iter().map(|f| f.name.as_str()).collect();
        assert!(function_names.contains(&"main"), "Should have main function");
        assert!(function_names.contains(&"AccountService"), "Should have AccountService class as callable");
    }
}
