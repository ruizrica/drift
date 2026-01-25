//! User repository
//! 
//! Demonstrates SQLx data access patterns

use sqlx::{PgPool, Row};
use uuid::Uuid;
use crate::models::{User, UserRole, CreateUserRequest};
use crate::errors::{RepoResult, RepositoryError};

pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Find user by ID
    pub async fn find_by_id(&self, id: Uuid) -> RepoResult<User> {
        let row = sqlx::query(
            "SELECT id, email, name, role, created_at FROM users WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(RepositoryError::NotFound)?;

        Ok(User {
            id: row.get("id"),
            email: row.get("email"),
            name: row.get("name"),
            role: parse_role(row.get("role")),
            created_at: row.get("created_at"),
        })
    }

    /// Find user by email
    pub async fn find_by_email(&self, email: &str) -> RepoResult<Option<User>> {
        let row = sqlx::query(
            "SELECT id, email, name, role, created_at FROM users WHERE email = $1"
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| User {
            id: r.get("id"),
            email: r.get("email"),
            name: r.get("name"),
            role: parse_role(r.get("role")),
            created_at: r.get("created_at"),
        }))
    }

    /// Create new user
    pub async fn create(&self, req: &CreateUserRequest) -> RepoResult<User> {
        let id = Uuid::new_v4();
        
        // Check for duplicate email
        if self.find_by_email(&req.email).await?.is_some() {
            return Err(RepositoryError::DuplicateKey("email".to_string()));
        }

        let row = sqlx::query(
            r#"
            INSERT INTO users (id, email, name, password_hash, role, created_at)
            VALUES ($1, $2, $3, $4, 'user', NOW())
            RETURNING id, email, name, role, created_at
            "#
        )
        .bind(id)
        .bind(&req.email)
        .bind(&req.name)
        .bind(hash_password(&req.password))
        .fetch_one(&self.pool)
        .await?;

        Ok(User {
            id: row.get("id"),
            email: row.get("email"),
            name: row.get("name"),
            role: parse_role(row.get("role")),
            created_at: row.get("created_at"),
        })
    }

    /// Update user
    pub async fn update(&self, id: Uuid, name: Option<&str>, email: Option<&str>) -> RepoResult<User> {
        let row = sqlx::query(
            r#"
            UPDATE users 
            SET name = COALESCE($2, name),
                email = COALESCE($3, email)
            WHERE id = $1
            RETURNING id, email, name, role, created_at
            "#
        )
        .bind(id)
        .bind(name)
        .bind(email)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(RepositoryError::NotFound)?;

        Ok(User {
            id: row.get("id"),
            email: row.get("email"),
            name: row.get("name"),
            role: parse_role(row.get("role")),
            created_at: row.get("created_at"),
        })
    }

    /// Delete user
    pub async fn delete(&self, id: Uuid) -> RepoResult<()> {
        let result = sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(RepositoryError::NotFound);
        }

        Ok(())
    }

    /// List all users with pagination
    pub async fn list(&self, page: u32, limit: u32) -> RepoResult<(Vec<User>, i64)> {
        let offset = (page - 1) * limit;

        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
            .fetch_one(&self.pool)
            .await?;

        let rows = sqlx::query(
            "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await?;

        let users = rows.into_iter().map(|r| User {
            id: r.get("id"),
            email: r.get("email"),
            name: r.get("name"),
            role: parse_role(r.get("role")),
            created_at: r.get("created_at"),
        }).collect();

        Ok((users, count))
    }
}

fn parse_role(role: &str) -> UserRole {
    match role {
        "admin" => UserRole::Admin,
        "user" => UserRole::User,
        _ => UserRole::Guest,
    }
}

fn hash_password(password: &str) -> String {
    // In production, use bcrypt or argon2
    format!("hashed_{}", password)
}
