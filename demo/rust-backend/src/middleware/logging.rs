//! Logging middleware
//! 
//! Demonstrates request/response logging

use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error,
};
use futures::future::{ok, LocalBoxFuture, Ready};
use std::rc::Rc;
use std::time::Instant;
use tracing::{info, warn};

/// Logging middleware
pub struct LoggingMiddleware;

impl<S, B> Transform<S, ServiceRequest> for LoggingMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = LoggingMiddlewareService<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(LoggingMiddlewareService {
            service: Rc::new(service),
        })
    }
}

pub struct LoggingMiddlewareService<S> {
    service: Rc<S>,
}

impl<S, B> Service<ServiceRequest> for LoggingMiddlewareService<S>
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
        let method = req.method().to_string();
        let path = req.path().to_string();
        let start = Instant::now();

        Box::pin(async move {
            let result = service.call(req).await;
            let duration = start.elapsed();

            match &result {
                Ok(res) => {
                    let status = res.status().as_u16();
                    if status >= 400 {
                        warn!(
                            method = %method,
                            path = %path,
                            status = status,
                            duration_ms = duration.as_millis() as u64,
                            "Request completed with error"
                        );
                    } else {
                        info!(
                            method = %method,
                            path = %path,
                            status = status,
                            duration_ms = duration.as_millis() as u64,
                            "Request completed"
                        );
                    }
                }
                Err(e) => {
                    warn!(
                        method = %method,
                        path = %path,
                        error = %e,
                        duration_ms = duration.as_millis() as u64,
                        "Request failed"
                    );
                }
            }

            result
        })
    }
}
