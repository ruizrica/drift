# Drift Telemetry Worker

Cloudflare Worker for collecting anonymized telemetry from Drift installations.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

### 3. Create the D1 Database

```bash
npm run db:create
```

This will output a database ID. Copy it and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "drift-telemetry"
database_id = "YOUR_DATABASE_ID_HERE"  # <-- Paste here
```

### 4. Run Database Migrations

```bash
# For local development
npm run db:migrate:local

# For production
npm run db:migrate
```

### 5. Deploy

```bash
# Development (uses wrangler dev)
npm run dev

# Staging
npm run deploy:staging

# Production
npm run deploy:production
```

## Endpoints

### POST /v1/events

Submit telemetry events.

```bash
curl -X POST https://drift-telemetry.YOUR_SUBDOMAIN.workers.dev/v1/events \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "type": "pattern_signature",
        "timestamp": "2026-01-25T12:00:00.000Z",
        "installationId": "abc123",
        "driftVersion": "0.7.1",
        "signatureHash": "a1b2c3d4",
        "category": "api",
        "confidence": 0.92,
        "locationCount": 15,
        "outlierCount": 2,
        "detectionMethod": "hybrid",
        "language": "typescript"
      }
    ]
  }'
```

### GET /v1/health

Health check endpoint.

```bash
curl https://drift-telemetry.YOUR_SUBDOMAIN.workers.dev/v1/health
```

### GET /v1/stats

Public aggregate statistics (last 30 days).

```bash
curl https://drift-telemetry.YOUR_SUBDOMAIN.workers.dev/v1/stats
```

## Custom Domain (Optional)

To use `telemetry.drift.dev`:

1. Add the domain to your Cloudflare account
2. Uncomment the routes section in `wrangler.toml`:

```toml
routes = [
  { pattern = "telemetry.drift.dev", custom_domain = true }
]
```

3. Deploy again

## Cost Estimate

With Cloudflare's free tier:
- **Workers**: 100,000 requests/day free
- **D1**: 5GB storage, 5M rows read/day free

For a project with ~1000 active users sending ~50 events/day:
- ~50,000 requests/day = **Free tier**
- ~1.5M events/month = **Free tier**

If you exceed free tier, costs are minimal (~$5/month for 10x the traffic).

## Data Retention

Raw events are kept for 90 days. Aggregated stats are kept indefinitely.

To manually clean old events:

```bash
npm run db:query -- "DELETE FROM events WHERE created_at < datetime('now', '-90 days')"
```

## Privacy

- No source code is ever stored
- Installation IDs are anonymous UUIDs
- Pattern signatures are SHA-256 hashes (irreversible)
- All data is aggregated for ML training
