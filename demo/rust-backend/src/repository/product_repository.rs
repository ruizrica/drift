//! Product repository
//! 
//! Demonstrates SQLx data access with complex queries

use sqlx::{PgPool, Row};
use uuid::Uuid;
use crate::models::{Product, CreateProductRequest, ProductQuery};
use crate::errors::{RepoResult, RepositoryError};

pub struct ProductRepository {
    pool: PgPool,
}

impl ProductRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Find product by ID
    pub async fn find_by_id(&self, id: Uuid) -> RepoResult<Product> {
        let row = sqlx::query(
            "SELECT id, name, description, price, stock, category_id FROM products WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(RepositoryError::NotFound)?;

        Ok(Product {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            price: row.get("price"),
            stock: row.get("stock"),
            category_id: row.get("category_id"),
        })
    }

    /// Create new product
    pub async fn create(&self, req: &CreateProductRequest) -> RepoResult<Product> {
        let id = Uuid::new_v4();

        let row = sqlx::query(
            r#"
            INSERT INTO products (id, name, description, price, stock, category_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, description, price, stock, category_id
            "#
        )
        .bind(id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(req.price)
        .bind(req.stock)
        .bind(req.category_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(Product {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            price: row.get("price"),
            stock: row.get("stock"),
            category_id: row.get("category_id"),
        })
    }

    /// Search products with filters
    pub async fn search(&self, query: &ProductQuery) -> RepoResult<(Vec<Product>, i64)> {
        let page = query.page.unwrap_or(1);
        let limit = query.limit.unwrap_or(20);
        let offset = (page - 1) * limit;

        // Build dynamic query
        let mut sql = String::from(
            "SELECT id, name, description, price, stock, category_id FROM products WHERE 1=1"
        );
        let mut count_sql = String::from("SELECT COUNT(*) FROM products WHERE 1=1");

        if query.category.is_some() {
            sql.push_str(" AND category_id = $1");
            count_sql.push_str(" AND category_id = $1");
        }
        if query.min_price.is_some() {
            sql.push_str(" AND price >= $2");
            count_sql.push_str(" AND price >= $2");
        }
        if query.max_price.is_some() {
            sql.push_str(" AND price <= $3");
            count_sql.push_str(" AND price <= $3");
        }

        sql.push_str(" ORDER BY name LIMIT $4 OFFSET $5");

        let rows = sqlx::query(&sql)
            .bind(query.category)
            .bind(query.min_price)
            .bind(query.max_price)
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&self.pool)
            .await?;

        let count: i64 = sqlx::query_scalar(&count_sql)
            .bind(query.category)
            .bind(query.min_price)
            .bind(query.max_price)
            .fetch_one(&self.pool)
            .await?;

        let products = rows.into_iter().map(|r| Product {
            id: r.get("id"),
            name: r.get("name"),
            description: r.get("description"),
            price: r.get("price"),
            stock: r.get("stock"),
            category_id: r.get("category_id"),
        }).collect();

        Ok((products, count))
    }

    /// Update product stock
    pub async fn update_stock(&self, id: Uuid, delta: i32) -> RepoResult<Product> {
        let row = sqlx::query(
            r#"
            UPDATE products 
            SET stock = stock + $2
            WHERE id = $1 AND stock + $2 >= 0
            RETURNING id, name, description, price, stock, category_id
            "#
        )
        .bind(id)
        .bind(delta)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(RepositoryError::NotFound)?;

        Ok(Product {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            price: row.get("price"),
            stock: row.get("stock"),
            category_id: row.get("category_id"),
        })
    }

    /// Delete product
    pub async fn delete(&self, id: Uuid) -> RepoResult<()> {
        let result = sqlx::query("DELETE FROM products WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(RepositoryError::NotFound);
        }

        Ok(())
    }

    /// Get products by category
    pub async fn find_by_category(&self, category_id: Uuid) -> RepoResult<Vec<Product>> {
        let rows = sqlx::query(
            "SELECT id, name, description, price, stock, category_id FROM products WHERE category_id = $1"
        )
        .bind(category_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| Product {
            id: r.get("id"),
            name: r.get("name"),
            description: r.get("description"),
            price: r.get("price"),
            stock: r.get("stock"),
            category_id: r.get("category_id"),
        }).collect())
    }
}
