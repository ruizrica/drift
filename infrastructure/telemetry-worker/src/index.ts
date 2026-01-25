/**
 * Drift Telemetry Worker - Cloudflare Worker for collecting anonymized telemetry
 *
 * Endpoints:
 * - POST /v1/events - Submit telemetry events
 * - GET /v1/health - Health check
 * - GET /v1/stats - Public aggregate stats (optional)
 */

export interface Env {
  // D1 Database binding
  DB: D1Database;
  // Optional: API key for admin endpoints
  ADMIN_API_KEY?: string;
}

// ============================================================================
// Types
// ============================================================================

interface TelemetryEvent {
  type: string;
  timestamp: string;
  installationId: string;
  driftVersion: string;
  [key: string]: unknown;
}

interface EventBatch {
  events: TelemetryEvent[];
}

// ============================================================================
// CORS Headers
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// ============================================================================
// Event Handlers
// ============================================================================

async function handleEvents(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as EventBatch;

    if (!body.events || !Array.isArray(body.events)) {
      return jsonResponse({ error: 'Invalid request: events array required' }, 400);
    }

    if (body.events.length === 0) {
      return jsonResponse({ success: true, eventsProcessed: 0 });
    }

    if (body.events.length > 100) {
      return jsonResponse({ error: 'Too many events: max 100 per batch' }, 400);
    }

    // Insert events into D1
    const stmt = env.DB.prepare(`
      INSERT INTO events (
        type, timestamp, installation_id, drift_version, payload, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    const batch = body.events.map(event => {
      const { type, timestamp, installationId, driftVersion, ...payload } = event;
      return stmt.bind(
        type,
        timestamp,
        installationId,
        driftVersion,
        JSON.stringify(payload)
      );
    });

    await env.DB.batch(batch);

    // Update aggregate stats
    await updateAggregateStats(env, body.events);

    return jsonResponse({
      success: true,
      eventsProcessed: body.events.length,
    });
  } catch (error) {
    console.error('Error processing events:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

async function updateAggregateStats(env: Env, events: TelemetryEvent[]): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Count events by type
  const typeCounts: Record<string, number> = {};
  const languageCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  for (const event of events) {
    typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;

    if (event.type === 'pattern_signature') {
      const lang = (event as { language?: string }).language;
      const cat = (event as { category?: string }).category;
      if (lang) languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  // Upsert daily stats
  const upsertStmt = env.DB.prepare(`
    INSERT INTO daily_stats (date, metric, value)
    VALUES (?, ?, ?)
    ON CONFLICT(date, metric) DO UPDATE SET value = value + excluded.value
  `);

  const statsBatch = [];

  // Event type counts
  for (const [type, count] of Object.entries(typeCounts)) {
    statsBatch.push(upsertStmt.bind(today, `events:${type}`, count));
  }

  // Language counts
  for (const [lang, count] of Object.entries(languageCounts)) {
    statsBatch.push(upsertStmt.bind(today, `language:${lang}`, count));
  }

  // Category counts
  for (const [cat, count] of Object.entries(categoryCounts)) {
    statsBatch.push(upsertStmt.bind(today, `category:${cat}`, count));
  }

  // Unique installations (approximate via daily count)
  const uniqueInstallations = new Set(events.map(e => e.installationId)).size;
  statsBatch.push(upsertStmt.bind(today, 'unique_installations', uniqueInstallations));

  if (statsBatch.length > 0) {
    await env.DB.batch(statsBatch);
  }
}

async function handleHealth(): Promise<Response> {
  return jsonResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

async function handleStats(env: Env): Promise<Response> {
  try {
    // Get last 30 days of stats
    const result = await env.DB.prepare(`
      SELECT metric, SUM(value) as total
      FROM daily_stats
      WHERE date >= date('now', '-30 days')
      GROUP BY metric
      ORDER BY total DESC
    `).all();

    const stats: Record<string, number> = {};
    for (const row of result.results as { metric: string; total: number }[]) {
      stats[row.metric] = row.total;
    }

    // Get total event count
    const eventCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM events
      WHERE created_at >= datetime('now', '-30 days')
    `).first<{ count: number }>();

    return jsonResponse({
      period: 'last_30_days',
      totalEvents: eventCount?.count ?? 0,
      metrics: stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

// ============================================================================
// Main Handler
// ============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route requests
    if (path === '/v1/events' && request.method === 'POST') {
      return handleEvents(request, env);
    }

    if (path === '/v1/health' && request.method === 'GET') {
      return handleHealth();
    }

    if (path === '/v1/stats' && request.method === 'GET') {
      return handleStats(env);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};
