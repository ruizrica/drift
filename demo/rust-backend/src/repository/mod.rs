//! Repository module
//! 
//! Data access layer with SQLx

pub mod user_repository;
pub mod product_repository;

pub use user_repository::UserRepository;
pub use product_repository::ProductRepository;
