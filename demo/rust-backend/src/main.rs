//! Rust Backend Demo
//! 
//! Demonstrates patterns for Drift analysis:
//! - Actix-web routes
//! - Error handling with thiserror/anyhow
//! - SQLx data access
//! - Async patterns

mod handlers;
mod models;
mod errors;
mod repository;
mod middleware;

use actix_web::{web, App, HttpServer};
use handlers::{user_handlers, product_handlers};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    tracing_subscriber::init();
    
    HttpServer::new(|| {
        App::new()
            .configure(user_handlers::configure)
            .configure(product_handlers::configure)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
