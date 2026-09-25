import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// NaviVerify — real-time tourist price intelligence.
// Uses InvokeLLM with live web search to retrieve CURRENT, location-specific
// pricing, then returns a structured, source-cited comparison. The model is
// explicitly instructed never to fabricate prices, sources, or dates.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    const scenario = String(body.scenario || '').trim();
    const item = String(body.item || '').trim();
    const price = body.price != null ? Number(body.price) : null;
    const currency = String(body.currency || 'INR').trim();
    const location = String(body.location || '').trim();
    const origin = String(body.origin || '').trim();
    const destination = String(body.destination || '').trim();
    const userLat = body.userLat != null ? Number(body.userLat) : null;
    const userLng = body.userLng != null ? Number(body.userLng) : null;

    if (!scenario && !item) return Response.json({ error: 'Describe the situation or provide an item.' }, { status: 400 });
    if (price == null && !scenario) return Response.json({ error: 'A price is required.' }, { status: 400 });

    const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const coords = (userLat != null && userLng != null) ? `${userLat.toFixed(4)}, ${userLng.toFixed(4)}` : 'unknown';

    const prompt = `You are NaviVerify, a tourist price-intelligence assistant. A traveler is being asked to pay a price and wants to know whether it is reasonable based on CURRENT real-world information at their location.

Today's date: ${today}.
Traveler coordinates: ${coords}.
Traveler-stated location: ${location || 'not specified'}.

REQUEST:
- Free description: ${scenario || '(none)'}
- Item / service: ${item || '(derive from description)'}
- Quoted price: ${price != null ? price + ' ' + currency : '(derive from description)'}
- Origin: ${origin || '—'}
- Destination: ${destination || '—'}

INSTRUCTIONS:
1. Search the live web for CURRENT, location-specific pricing for this exact service/context.
2. Prioritize sources in this order: official (government, tourism, transport/airport authorities, municipal authorities, official attraction websites, official tariff documents), official business (restaurant menu, business website, operator tariff, booking system), reliable structured sources, recent community reports.
3. Compare ONLY genuinely comparable services (same vehicle class, same ticket type, same dish/portion, same room type). Never average incompatible tiers.
4. NEVER invent prices, averages, medians, sources, URLs, or dates. Use only information you can actually find from the web. If a number is not available, leave it null.
5. If you cannot find enough reliable current data to compute a meaningful comparison, set "insufficient" to true and explain what (if anything) you found. Do not present guesses as facts.
6. Classify freshness of the best available data: current / recent / outdated / unknown.
7. Classification must be evidence-based: "within_range", "above_range", "significant_difference", or "insufficient_data". Never accuse any person or business; use hedged language.
8. In "factors", list legitimate reasons the quoted price may differ (tolls, airport fee, night surcharge, vehicle class, visitor type, taxes, service charge, etc.) — only those plausible for this context.
9. In "what_to_do", give practical, safe next steps (view sources, check route, find official option, ask for a receipt, etc.).
10. In "sources", list each source you actually used: name, type (official/business/structured/community), url (real URL or empty string), price, currency, date_published (if known else empty), retrieved (today's date), reliability (high/medium/low), freshness (current/recent/outdated/unknown), note.
11. In "observations", list each comparable price point with a short description, price, currency, source_ref (index into sources), and as_of date.
12. Compute stats (min, max, median, average, count, source_count) from observations ONLY when count >= 3 and the observations are genuinely comparable. Otherwise leave stats fields null and count/source_count as the actual numbers.
13. "comparison_basis" should name the exact context used (e.g. "Delhi Airport → Connaught Place, standard taxi"), not a generic "India average".

Return JSON matching the requested schema. Use hedged phrasing throughout the explanation ("Based on available current information...", "The available official tariff indicates...", "We could not verify this charge from an official source.").`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_8_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          classification: { type: 'string', enum: ['within_range', 'above_range', 'significant_difference', 'insufficient_data'] },
          quoted_price: { type: 'number' },
          currency: { type: 'string' },
          comparison_basis: { type: 'string' },
          freshness: { type: 'string', enum: ['current', 'recent', 'outdated', 'unknown'] },
          insufficient: { type: 'boolean' },
          stats: {
            type: 'object',
            properties: {
              min: { type: 'number' }, max: { type: 'number' }, median: { type: 'number' },
              average: { type: 'number' }, count: { type: 'number' }, source_count: { type: 'number' }
            }
          },
          observations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' }, price: { type: 'number' }, currency: { type: 'string' },
                source_ref: { type: 'number' }, as_of: { type: 'string' }
              }
            }
          },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }, type: { type: 'string' }, url: { type: 'string' },
                price: { type: 'number' }, currency: { type: 'string' }, date_published: { type: 'string' },
                retrieved: { type: 'string' }, reliability: { type: 'string', enum: ['high', 'medium', 'low'] },
                freshness: { type: 'string', enum: ['current', 'recent', 'outdated', 'unknown'] }, note: { type: 'string' }
              }
            }
          },
          factors: { type: 'array', items: { type: 'string' } },
          what_to_do: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
        },
        required: ['classification', 'insufficient', 'explanation', 'confidence', 'freshness']
      }
    });

    const data = (res && typeof res === 'object' && !Array.isArray(res)) ? res : (typeof res === 'string' ? JSON.parse(res) : {});

    // Persist the check (user-scoped via RLS).
    const record = await base44.entities.PriceCheck.create({
      scenario, category: item || 'general', item, entered_price: price, currency,
      location, origin, destination,
      classification: data.classification || 'insufficient_data',
      comparison_basis: data.comparison_basis || '',
      freshness: data.freshness || 'unknown',
      median: data.stats?.median ?? null,
      average: data.stats?.average ?? null,
      min: data.stats?.min ?? null,
      max: data.stats?.max ?? null,
      count: data.stats?.count ?? null,
      source_count: data.stats?.source_count ?? null,
      confidence: data.confidence || 'low',
      insufficient: !!data.insufficient,
      explanation: data.explanation || '',
      factors: data.factors || [],
      what_to_do: data.what_to_do || [],
      sources: data.sources || [],
      observations: data.observations || []
    });

    return Response.json({ ...data, id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}