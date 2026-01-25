//! Domain models
//! 
//! Demonstrates Rust struct patterns with serde

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// User model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: UserRole,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// User role enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UserRole {
    Admin,
    User,
    Guest,
}

/// Create user request
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub name: String,
    pub password: String,
}

/// Update user request
#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub email: Option<String>,
}

/// Product model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub stock: i32,
    pub category_id: Uuid,
}

/// Create product request
#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub description: String,
    pub price: f64,
    pub stock: i32,
    pub category_id: Uuid,
}

/// Product query parameters
#[derive(Debug, Deserialize)]
pub struct ProductQuery {
    pub category: Option<Uuid>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

/// Paginated response
#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
}
