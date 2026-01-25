//! Error handling module
//! 
//! Demonstrates Rust error patterns:
//! - thiserror for custom errors
//! - anyhow for application errors
//! - Error propagation with ?

use thiserror::Error;
use actix_web::{HttpResponse, ResponseError};
use std::fmt;

/// Application-level errors using thiserror
#[derive(Error, Debug)]
pub enum AppError {
    #[error("User not found: {0}")]
    UserNotFound(String),
    
    #[error("Product not found: {0}")]
    ProductNotFound(String),
    
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    
    #[error("Validation error: {0}")]
    ValidationError(String),
    
    #[error("Authentication failed")]
    AuthenticationError,
    
    #[error("Authorization denied: {0}")]
    AuthorizationError(String),
    
    #[error("Internal server error")]
    InternalError,
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        match self {
            AppError::UserNotFound(_) => HttpResponse::NotFound().json(ErrorResponse {
                error: self.to_string(),
                code: "USER_NOT_FOUND",
            }),
            AppError::ProductNotFound(_) => HttpResponse::NotFound().json(ErrorResponse {
                error: self.to_string(),
                code: "PRODUCT_NOT_FOUND",
            }),
            AppError::ValidationError(_) => HttpResponse::BadRequest().json(ErrorResponse {
                error: self.to_string(),
                code: "VALIDATION_ERROR",
            }),
            AppError::AuthenticationError => HttpResponse::Unauthorized().json(ErrorResponse {
                error: self.to_string(),
                code: "AUTH_ERROR",
            }),
            AppError::AuthorizationError(_) => HttpResponse::Forbidden().json(ErrorResponse {
                error: self.to_string(),
                code: "FORBIDDEN",
            }),
            _ => HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Internal server error".to_string(),
                code: "INTERNAL_ERROR",
            }),
        }
    }
}

#[derive(serde::Serialize)]
struct ErrorResponse {
    error: String,
    code: &'static str,
}

/// Repository-level errors
#[derive(Error, Debug)]
pub enum RepositoryError {
    #[error("Record not found")]
    NotFound,
    
    #[error("Duplicate key: {0}")]
    DuplicateKey(String),
    
    #[error("Connection error: {0}")]
    ConnectionError(String),
    
    #[error("Query error: {0}")]
    QueryError(#[from] sqlx::Error),
}

impl From<RepositoryError> for AppError {
    fn from(err: RepositoryError) -> Self {
        match err {
            RepositoryError::NotFound => AppError::InternalError,
            RepositoryError::DuplicateKey(msg) => AppError::ValidationError(msg),
            RepositoryError::ConnectionError(_) => AppError::InternalError,
            RepositoryError::QueryError(e) => AppError::DatabaseError(e),
        }
    }
}

/// Result type alias for application errors
pub type AppResult<T> = Result<T, AppError>;

/// Result type alias for repository errors  
pub type RepoResult<T> = Result<T, RepositoryError>;
