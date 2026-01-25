//! Middleware module
//! 
//! Demonstrates Actix-web middleware patterns

pub mod auth;
pub mod logging;

pub use auth::AuthMiddleware;
pub use logging::LoggingMiddleware;
