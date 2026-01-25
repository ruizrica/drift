//! Authentication middleware
//! 
//! Demonstrates Actix-web middleware and async patterns

use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage,
};
use futures::future::{ok, LocalBoxFuture, Ready};
use std::rc::Rc;

/// Authentication middleware
pub struct AuthMiddleware;

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = AuthMiddlewareService<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(AuthMiddlewareService {
            service: Rc::new(service),
        })
    }
}

pub struct AuthMiddlewareService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let service = Rc::clone(&self.service);

        Box::pin(async move {
            // Extract and validate token
            let token = req
                .headers()
                .get("Authorization")
                .and_then(|h| h.to_str().ok())
                .and_then(|h| h.strip_prefix("Bearer "));

            if let Some(token) = token {
                // Validate token and extract user info
                if let Ok(user_id) = validate_token(token).await {
                    req.extensions_mut().insert(AuthenticatedUser { id: user_id });
                }
            }

            service.call(req).await
        })
    }
}

/// Authenticated user info stored in request extensions
#[derive(Clone)]
pub struct AuthenticatedUser {
    pub id: uuid::Uuid,
}

/// Validate JWT token
async fn validate_token(token: &str) -> Result<uuid::Uuid, AuthError> {
    // In production, use jsonwebtoken crate
    if token.starts_with("valid_") {
        Ok(uuid::Uuid::new_v4())
    } else {
        Err(AuthError::InvalidToken)
    }
}

#[derive(Debug)]
enum AuthError {
    InvalidToken,
    ExpiredToken,
}
