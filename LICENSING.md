# Drift Licensing

Drift uses an **Open Core** licensing model. This means:

- **Core functionality is fully open source** (Apache 2.0)
- **Enterprise features are source-available** (BSL 1.1)

## What This Means For You

### Individual Developers & Small Teams ✅

**You can use Drift completely free**, including:
- Full pattern detection and scanning
- All 6 language support (TypeScript, Python, Java, C#, PHP, Go)
- MCP integration with Cursor, Claude, and other AI tools
- VSCode extension
- CLI tools (`drift scan`, `drift check`, `drift status`, etc.)
- Call graph analysis and data flow tracking
- Pattern approval/ignore workflow
- **CI integration with all output formats** (JSON, GitHub, GitLab, SARIF)
- Basic thresholds and fail conditions
- Local dashboard

This covers everything a solo developer or small team needs. **We believe individual developers should never hit a paywall.**

### Enterprise & Large Organizations 💼

Enterprise features require a commercial license. These are specifically for **managing patterns at scale across teams**:

**Team Tier:**
- Policy Engine (multiple policies, branch/path scoping)
- Regression detection across time
- Custom rules engine
- Historical trend analysis
- Report exports

**Enterprise Tier:**
- Multi-repo pattern governance
- Team analytics and dashboards  
- Impact simulation
- Security boundary analysis
- Audit trails for compliance
- Jira/Slack/Webhook integrations
- Self-hosted model support
- REST API access

**[Get Enterprise License →](Coming soon)**

## License Details

### Apache 2.0 (Open Source)

The following packages are licensed under Apache 2.0:

| Package | Description |
|---------|-------------|
| `driftdetect-core` | Core pattern detection engine |
| `driftdetect` (CLI) | Command-line interface |
| `driftdetect-mcp` | MCP server for AI integration |
| `driftdetect-detectors` | Pattern detectors |
| `driftdetect-vscode` | VSCode extension |
| `driftdetect-dashboard` | Local web dashboard |
| `driftdetect-lsp` | Language server protocol |
| `driftdetect-galaxy` | Data visualization |

You can:
- Use these packages for any purpose
- Modify and distribute them
- Use them in commercial products
- No attribution required (but appreciated!)

### BSL 1.1 (Source Available)

Enterprise features within the codebase are licensed under BSL 1.1:

**What you CAN do:**
- Read and learn from the code
- Use for non-production purposes
- Modify for internal use
- Contribute improvements back

**What requires a license:**
- Production use of enterprise features
- Offering enterprise features as a hosted service
- Embedding enterprise features in competing products

**Change Date:** After 4 years, enterprise code converts to Apache 2.0.

## How to Identify License

Each file indicates its license in the header:

```typescript
// Apache 2.0 licensed file
/**
 * @license Apache-2.0
 */

// BSL 1.1 licensed file  
/**
 * @license BSL-1.1
 * Change Date: 2030-01-25
 */
```

Enterprise features are also gated at runtime - you'll see a clear message if you try to use an unlicensed feature:

```
⚠️  Enterprise Feature Required

Feature: gate:policy-engine
Required: team tier
Current:  community tier

Upgrade at: https://driftscan.dev/pricing
```

## FAQ

### Can I use Drift at my company for free?

**Yes!** If you're using the core features (scanning, pattern detection, MCP integration), you can use Drift completely free, even commercially.

### What if I'm a startup?

Core features are free. If you grow to need enterprise features (multi-repo governance, compliance audit trails), reach out - we have startup-friendly pricing.

### Can I contribute to enterprise features?

Yes! Contributions to any part of the codebase are welcome. By contributing, you agree that your contributions will be licensed under the same license as the file you're modifying.

### Why not fully open source everything?

Building and maintaining enterprise-grade software requires sustainable funding. The Open Core model lets us:
1. Keep core features free for everyone
2. Fund continued development
3. Provide enterprise support and features

This is the same model used by GitLab, Sentry, PostHog, and many other successful open source companies.

## Contact

- **Enterprise Sales:** 
- **General Questions:** hello@driftscan.dev
- **GitHub Issues:** [github.com/drift/drift/issues](https://github.com/drift/drift/issues)
