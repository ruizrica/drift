//! User HTTP handlers
//! 
//! Demonstrates Actix-web route patterns

use actix_web::{web, HttpResponse, get, post, put, delete};
use uuid::Uuid;
use crate::models::{CreateUserRequest, UpdateUserRequest, PaginatedResponse};
use crate::repository::UserRepository;
use crate::errors::{AppError, AppResult};

/// Configure user routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/users")
            .service(list_users)
            .service(get_user)
            .service(create_user)
            .service(update_user)
            .service(delete_user)
    );
}

/// List all users with pagination
#[get("")]
async fn list_users(
    repo: web::Data<UserRepository>,
    query: web::Query<PaginationQuery>,
) -> AppResult<HttpResponse> {
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(20);

    let (users, total) = repo.list(page, limit).await?;

    Ok(HttpResponse::Ok().json(PaginatedResponse {
        data: users,
        total,
        page,
        limit,
    }))
}

/// Get user by ID
#[get("/{id}")]
async fn get_user(
    repo: web::Data<UserRepository>,
    path: web::Path<Uuid>,
) -> AppResult<HttpResponse> {
    let id = path.into_inner();
    let user = repo.find_by_id(id).await
        .map_err(|_| AppError::UserNotFound(id.to_string()))?;

    Ok(HttpResponse::Ok().json(user))
}

/// Create new user
#[post("")]
async fn create_user(
    repo: web::Data<UserRepository>,
    body: web::Json<CreateUserRequest>,
) -> AppResult<HttpResponse> {
    // Validate request
    if body.email.is_empty() {
        return Err(AppError::ValidationError("Email is required".to_string()));
    }
    if body.name.is_empty() {
        return Err(AppError::ValidationError("Name is required".to_string()));
    }
    if body.password.len() < 8 {
        return Err(AppError::ValidationError("Password must be at least 8 characters".to_string()));
    }

    let user = repo.create(&body).await?;

    Ok(HttpResponse::Created().json(user))
}

/// Update user
#[put("/{id}")]
async fn update_user(
    repo: web::Data<UserRepository>,
    path: web::Path<Uuid>,
    body: web::Json<UpdateUserRequest>,
) -> AppResult<HttpResponse> {
    let id = path.into_inner();

    let user = repo.update(
        id,
        body.name.as_deref(),
        body.email.as_deref(),
    ).await
        .map_err(|_| AppError::UserNotFound(id.to_string()))?;

    Ok(HttpResponse::Ok().json(user))
}

/// Delete user
#[delete("/{id}")]
async fn delete_user(
    repo: web::Data<UserRepository>,
    path: web::Path<Uuid>,
) -> AppResult<HttpResponse> {
    let id = path.into_inner();

    repo.delete(id).await
        .map_err(|_| AppError::UserNotFound(id.to_string()))?;

    Ok(HttpResponse::NoContent().finish())
}

#[derive(serde::Deserialize)]
struct PaginationQuery {
    page: Option<u32>,
    limit: Option<u32>,
}
