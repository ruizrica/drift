//! NAPI bindings for enforcement systems (Phase 6).
//!
//! Exposes drift_check(), drift_audit(), drift_violations(), drift_gates().

#[allow(unused_imports)]
use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};

use crate::conversions::error_codes;
use crate::runtime;

// ─── Violation Types ─────────────────────────────────────────────────

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsViolation {
    pub id: String,
    pub file: String,
    pub line: u32,
    pub column: Option<u32>,
    pub end_line: Option<u32>,
    pub end_column: Option<u32>,
    pub severity: String,
    pub pattern_id: String,
    pub rule_id: String,
    pub message: String,
    pub quick_fix_strategy: Option<String>,
    pub quick_fix_description: Option<String>,
    pub cwe_id: Option<u32>,
    pub owasp_category: Option<String>,
    pub suppressed: bool,
    pub is_new: bool,
}

// ─── Gate Result Types ───────────────────────────────────────────────

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsGateResult {
    pub gate_id: String,
    pub status: String,
    pub passed: bool,
    pub score: f64,
    pub summary: String,
    pub violation_count: u32,
    pub warning_count: u32,
    pub execution_time_ms: u32,
    pub details: Option<String>,
    pub error: Option<String>,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsCheckResult {
    pub overall_passed: bool,
    pub total_violations: u32,
    pub gates: Vec<JsGateResult>,
    pub sarif: Option<String>,
}

// ─── Audit Types ─────────────────────────────────────────────────────

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsHealthBreakdown {
    pub avg_confidence: f64,
    pub approval_ratio: f64,
    pub compliance_rate: f64,
    pub cross_validation_rate: f64,
    pub duplicate_free_rate: f64,
}

#[napi(object)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsAuditResult {
    pub health_score: f64,
    pub breakdown: JsHealthBreakdown,
    pub trend: String,
    pub degradation_alerts: Vec<String>,
    pub auto_approved_count: u32,
    pub needs_review_count: u32,
}

// ─── NAPI Functions ──────────────────────────────────────────────────

/// Run quality gate checks on the project.
#[napi]
pub fn drift_check(_root: String) -> napi::Result<JsCheckResult> {
    let rt = runtime::get()?;

    let violations = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::query_all_violations(conn)
    }).map_err(|e| napi::Error::from_reason(format!("[{}] {e}", error_codes::STORAGE_ERROR)))?;

    let gates = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::query_gate_results(conn)
    }).map_err(|e| napi::Error::from_reason(format!("[{}] {e}", error_codes::STORAGE_ERROR)))?;

    let js_gates: Vec<JsGateResult> = gates.iter().map(|g| JsGateResult {
        gate_id: g.gate_id.clone(),
        status: g.status.clone(),
        passed: g.passed,
        score: g.score,
        summary: g.summary.clone(),
        violation_count: g.violation_count,
        warning_count: g.warning_count,
        execution_time_ms: g.execution_time_ms as u32,
        details: g.details.clone(),
        error: g.error.clone(),
    }).collect();

    let overall_passed = js_gates.iter().all(|g| g.passed);

    // PH2-04: Generate SARIF inline
    let sarif = drift_analysis::enforcement::reporters::create_reporter("sarif")
        .and_then(|reporter| {
            let gate_results = storage_to_gate_results(&violations, &gates);
            reporter.generate(&gate_results).ok()
        });

    Ok(JsCheckResult {
        overall_passed,
        total_violations: violations.len() as u32,
        gates: js_gates,
        sarif,
    })
}

/// Run audit analysis on the project.
#[napi]
pub fn drift_audit(_root: String) -> napi::Result<JsAuditResult> {
    let rt = runtime::get()?;

    let alerts = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::query_recent_degradation_alerts(conn, 50)
    }).map_err(|e| napi::Error::from_reason(format!("[{}] {e}", error_codes::STORAGE_ERROR)))?;

    let alert_messages: Vec<String> = alerts.iter().map(|a| a.message.clone()).collect();

    let confidence_scores = rt.storage.with_reader(|conn| {
        drift_storage::queries::patterns::query_all_confidence(conn)
    }).map_err(|e| napi::Error::from_reason(format!("[{}] {e}", error_codes::STORAGE_ERROR)))?;

    let avg_confidence = if confidence_scores.is_empty() {
        0.0
    } else {
        confidence_scores.iter().map(|c| c.posterior_mean).sum::<f64>() / confidence_scores.len() as f64
    };

    let trend = if alerts.is_empty() { "stable" } else { "degrading" };

    // PH2-01: Wire approval_ratio from feedback stats
    let feedback_stats = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::query_feedback_stats(conn)
    }).unwrap_or_default();

    let approval_ratio = if feedback_stats.total_count > 0 {
        (feedback_stats.fix_count + feedback_stats.escalate_count) as f64 / feedback_stats.total_count as f64
    } else {
        0.0
    };

    // PH2-02: Wire cross_validation_rate from gate results
    let gates = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::query_gate_results(conn)
    }).unwrap_or_default();
    let cross_validation_rate = if gates.is_empty() {
        0.0
    } else {
        gates.iter().filter(|g| g.passed).count() as f64 / gates.len() as f64
    };

    // Compliance rate from violations
    let violations = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::query_all_violations(conn)
    }).unwrap_or_default();
    let compliance_rate = if violations.is_empty() {
        1.0
    } else {
        violations.iter().filter(|v| v.suppressed).count() as f64 / violations.len() as f64
    };

    // PH2-03: Wire auto_approved_count and needs_review_count
    let auto_approved_count = feedback_stats.fix_count + feedback_stats.suppress_count;
    let needs_review_count = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::count_needs_review(conn)
    }).unwrap_or(0);

    // PH2-13: 5-factor health scoring
    let health_score = (
        avg_confidence * 20.0
        + approval_ratio * 20.0
        + compliance_rate * 20.0
        + cross_validation_rate * 20.0
        + 1.0 * 20.0 // duplicate_free_rate placeholder
    ).clamp(0.0, 100.0);

    // Adjust health downward for active degradation alerts
    let health_score = if !alerts.is_empty() {
        (health_score - alerts.len() as f64 * 2.0).max(0.0)
    } else {
        health_score
    };

    Ok(JsAuditResult {
        health_score,
        breakdown: JsHealthBreakdown {
            avg_confidence,
            approval_ratio,
            compliance_rate,
            cross_validation_rate,
            duplicate_free_rate: 1.0,
        },
        trend: trend.to_string(),
        degradation_alerts: alert_messages,
        auto_approved_count,
        needs_review_count,
    })
}

/// Query violations for the project.
#[napi]
pub fn drift_violations(_root: String) -> napi::Result<Vec<JsViolation>> {
    let rt = runtime::get()?;

    let rows = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::query_all_violations(conn)
    }).map_err(|e| napi::Error::from_reason(format!("[{}] {e}", error_codes::STORAGE_ERROR)))?;

    Ok(rows.into_iter().map(|v| JsViolation {
        id: v.id,
        file: v.file,
        line: v.line,
        column: v.column,
        end_line: v.end_line,
        end_column: v.end_column,
        severity: v.severity,
        pattern_id: v.pattern_id,
        rule_id: v.rule_id,
        message: v.message,
        quick_fix_strategy: v.quick_fix_strategy,
        quick_fix_description: v.quick_fix_description,
        cwe_id: v.cwe_id,
        owasp_category: v.owasp_category,
        suppressed: v.suppressed,
        is_new: v.is_new,
    }).collect())
}

/// Generate a report in the specified format from stored violations and gate results.
///
/// Supported formats: "sarif", "json", "html", "junit", "sonarqube", "console", "github", "gitlab"
#[napi]
pub fn drift_report(format: String) -> napi::Result<String> {
    let rt = runtime::get()?;

    let violations = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::query_all_violations(conn)
    }).map_err(|e| napi::Error::from_reason(format!("[{}] {e}", error_codes::STORAGE_ERROR)))?;

    let gates = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::query_gate_results(conn)
    }).map_err(|e| napi::Error::from_reason(format!("[{}] {e}", error_codes::STORAGE_ERROR)))?;

    // Convert storage rows to enforcement gate results
    let gate_results = storage_to_gate_results(&violations, &gates);

    // Create reporter and generate output
    let reporter = drift_analysis::enforcement::reporters::create_reporter(&format)
        .ok_or_else(|| napi::Error::from_reason(format!(
            "[{}] Unknown report format: '{}'. Supported: sarif, json, html, junit, sonarqube, console, github, gitlab",
            error_codes::INVALID_ARGUMENT, format
        )))?;

    reporter.generate(&gate_results)
        .map_err(|e| napi::Error::from_reason(format!("[{}] Report generation failed: {e}", error_codes::INTERNAL_ERROR)))
}

/// Convert storage rows into enforcement GateResult structs for reporters.
fn storage_to_gate_results(
    violations: &[drift_storage::queries::enforcement::ViolationRow],
    gates: &[drift_storage::queries::enforcement::GateResultRow],
) -> Vec<drift_analysis::enforcement::gates::GateResult> {
    use drift_analysis::enforcement::gates::{GateId, GateResult, GateStatus};
    use drift_analysis::enforcement::rules::types::{Severity, Violation};

    let mut all_violations: Vec<Violation> = violations.iter().map(|v| {
        Violation {
            id: v.id.clone(),
            file: v.file.clone(),
            line: v.line,
            column: v.column,
            end_line: v.end_line,
            end_column: v.end_column,
            severity: match v.severity.as_str() {
                "critical" | "error" => Severity::Error,
                "high" | "warning" => Severity::Warning,
                "medium" | "info" => Severity::Info,
                _ => Severity::Hint,
            },
            pattern_id: v.pattern_id.clone(),
            rule_id: v.rule_id.clone(),
            message: v.message.clone(),
            cwe_id: v.cwe_id,
            owasp_category: v.owasp_category.clone(),
            suppressed: v.suppressed,
            is_new: v.is_new,
            quick_fix: v.quick_fix_strategy.as_ref().and_then(|s| {
                use drift_analysis::enforcement::rules::types::QuickFixStrategy;
                let strategy = match s.as_str() {
                    "add_import" => QuickFixStrategy::AddImport,
                    "rename" => QuickFixStrategy::Rename,
                    "extract_function" => QuickFixStrategy::ExtractFunction,
                    "wrap_in_try_catch" => QuickFixStrategy::WrapInTryCatch,
                    "add_type_annotation" => QuickFixStrategy::AddTypeAnnotation,
                    "add_test" => QuickFixStrategy::AddTest,
                    "add_documentation" => QuickFixStrategy::AddDocumentation,
                    "use_parameterized_query" => QuickFixStrategy::UseParameterizedQuery,
                    _ => return None,
                };
                Some(drift_analysis::enforcement::rules::types::QuickFix {
                    strategy,
                    description: v.quick_fix_description.clone().unwrap_or_default(),
                    replacement: None,
                })
            }),
        }
    }).collect();

    if gates.is_empty() {
        // No gate results stored — create a single synthetic gate
        return vec![GateResult {
            gate_id: GateId::PatternCompliance,
            status: if all_violations.iter().any(|v| matches!(v.severity, Severity::Error)) {
                GateStatus::Failed
            } else {
                GateStatus::Passed
            },
            passed: !all_violations.iter().any(|v| matches!(v.severity, Severity::Error) && !v.suppressed),
            score: 0.0,
            summary: format!("{} violations found", all_violations.len()),
            violations: all_violations,
            warnings: vec![],
            execution_time_ms: 0,
            details: serde_json::Value::Null,
            error: None,
        }];
    }

    let gate_count = gates.len();
    gates.iter().enumerate().map(|(idx, g)| {
        let gate_id = match g.gate_id.as_str() {
            "pattern-compliance" => GateId::PatternCompliance,
            "constraint-verification" => GateId::ConstraintVerification,
            "security-boundaries" => GateId::SecurityBoundaries,
            "test-coverage" => GateId::TestCoverage,
            "error-handling" => GateId::ErrorHandling,
            "regression" => GateId::Regression,
            _ => GateId::PatternCompliance,
        };
        let status = match g.status.as_str() {
            "passed" => GateStatus::Passed,
            "failed" => GateStatus::Failed,
            "skipped" => GateStatus::Skipped,
            _ => GateStatus::Failed,
        };
        let details = g.details.as_ref()
            .and_then(|d| serde_json::from_str(d).ok())
            .unwrap_or(serde_json::Value::Null);

        GateResult {
            gate_id,
            status,
            passed: g.passed,
            score: g.score,
            summary: g.summary.clone(),
            violations: if idx + 1 == gate_count {
                std::mem::take(&mut all_violations)
            } else {
                all_violations.clone()
            },
            warnings: vec![],
            execution_time_ms: g.execution_time_ms,
            details,
            error: g.error.clone(),
        }
    }).collect()
}

/// Query gate results for the project.
#[napi]
pub fn drift_gates(_root: String) -> napi::Result<Vec<JsGateResult>> {
    let rt = runtime::get()?;

    let rows = rt.storage.with_reader(|conn| {
        drift_storage::queries::enforcement::query_gate_results(conn)
    }).map_err(|e| napi::Error::from_reason(format!("[{}] {e}", error_codes::STORAGE_ERROR)))?;

    Ok(rows.into_iter().map(|g| JsGateResult {
        gate_id: g.gate_id,
        status: g.status,
        passed: g.passed,
        score: g.score,
        summary: g.summary,
        violation_count: g.violation_count,
        warning_count: g.warning_count,
        execution_time_ms: g.execution_time_ms as u32,
        details: g.details,
        error: g.error,
    }).collect())
}
