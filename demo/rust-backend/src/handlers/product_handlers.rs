//! Product HTTP handlers
//! 
//! Demonstrates Actix-web route patterns with query parameters

use actix_web::{web, HttpResponse, get, post, put, delete, patch};
use uuid::Uuid;
use crate::models::{CreateProductRequest, ProductQuery, PaginatedResponse};
use crate::repository::ProductRepository;
use crate::errors::{AppError, AppResult};

/// Configure product routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/products")
            .service(search_products)
            .service(get_product)
            .service(create_product)
            .service(update_stock)
            .service(delete_product)
            .service(get_by_category)
    );
}

/// Search products with filters
#[get("")]
async fn search_products(
    repo: web::Data<ProductRepository>,
    query: web::Query<ProductQuery>,
) -> AppResult<HttpResponse> {
    let (products, total) = repo.search(&query).await?;

    Ok(HttpResponse::Ok().json(PaginatedResponse {
        data: products,
        total,
        page: query.page.unwrap_or(1),
        limit: query.limit.unwrap_or(20),
    }))
}

/// Get product by ID
#[get("/{id}")]
async fn get_product(
    repo: web::Data<ProductRepository>,
    path: web::Path<Uuid>,
) -> AppResult<HttpResponse> {
    let id = path.into_inner();
    let product = repo.find_by_id(id).await
        .map_err(|_| AppError::ProductNotFound(id.to_string()))?;

    Ok(HttpResponse::Ok().json(product))
}

/// Create new product
#[post("")]
async fn create_product(
    repo: web::Data<ProductRepository>,
    body: web::Json<CreateProductRequest>,
) -> AppResult<HttpResponse> {
    // Validate request
    if body.name.is_empty() {
        return Err(AppError::ValidationError("Name is required".to_string()));
    }
    if body.price < 0.0 {
        return Err(AppError::ValidationError("Price must be positive".to_string()));
    }
    if body.stock < 0 {
        return Err(AppError::ValidationError("Stock must be non-negative".to_string()));
    }

    let product = repo.create(&body).await?;

    Ok(HttpResponse::Created().json(product))
}

/// Update product stock
#[patch("/{id}/stock")]
async fn update_stock(
    repo: web::Data<ProductRepository>,
    path: web::Path<Uuid>,
    body: web::Json<StockUpdate>,
) -> AppResult<HttpResponse> {
    let id = path.into_inner();

    let product = repo.update_stock(id, body.delta).await
        .map_err(|_| AppError::ProductNotFound(id.to_string()))?;

    Ok(HttpResponse::Ok().json(product))
}

/// Delete product
#[delete("/{id}")]
async fn delete_product(
    repo: web::Data<ProductRepository>,
    path: web::Path<Uuid>,
) -> AppResult<HttpResponse> {
    let id = path.into_inner();

    repo.delete(id).await
        .map_err(|_| AppError::ProductNotFound(id.to_string()))?;

    Ok(HttpResponse::NoContent().finish())
}

/// Get products by category
#[get("/category/{category_id}")]
async fn get_by_category(
    repo: web::Data<ProductRepository>,
    path: web::Path<Uuid>,
) -> AppResult<HttpResponse> {
    let category_id = path.into_inner();
    let products = repo.find_by_category(category_id).await?;

    Ok(HttpResponse::Ok().json(products))
}

#[derive(serde::Deserialize)]
struct StockUpdate {
    delta: i32,
}
