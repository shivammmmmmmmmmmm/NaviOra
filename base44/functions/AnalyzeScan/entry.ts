import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// NaviScan — scan, understand, act.
// Real image understanding: InvokeLLM with the uploaded image (vision + OCR) and
// live web context for verification. Returns a structured interpretation
// (detected type, original text, translation, plain-language explanation,
// recommended actions, things to avoid, sources, and any extractable prices
// for hand-off to NaviVerify). Never invents information beyond the image.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    const fileUrl = String(body.file_url || '').trim();
    if (!fileUrl) return Response.json({ error: 'file_url required' }, { status: 400 });
    const userLang = String(body.userLang || 'en').trim();
    const userLat = body.userLat != null ? Number(body.userLat) : null;
    const userLng = body.userLng != null ? Number(body.userLng) : null;
    const locationLabel = String(body.location || '').trim();

    const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const coords = (userLat != null && userLng != null) ? `${userLat.toFixed(4)}, ${userLng.toFixed(4)}` : 'unknown';

    const prompt = `You are NaviScan, an intelligent visual-understanding assistant for tourists. Analyze the provided image.

Context:
- Today: ${today}, current time ${nowTime} (traveler timezone).
- Traveler coordinates: ${coords}. Location label: ${locationLabel || 'unknown'}.
- Translate into the traveler's language code: ${userLang}.

Steps:
1. Identify what the image is (signboard, menu, ticket, price board, receipt/bill, traffic sign, government/official notice, tourist instructions, hotel notice, public warning, product label, transport sign, map, entry/exit notice, etc.). Put this in "detected_type".
2. Extract all visible text exactly as shown into "extracted_text" (original). Detect the language into "detected_language".
3. Translate the text into the traveler's language into "translation". Do not alter meaning.
4. In "explanation", explain in simple, plain language what it means for a tourist.
5. In "recommended_actions", list concrete things the traveler should do, supported by the content/context. If a time restriction is present and the current time is known, note how long remains (e.g. "approx. 18 minutes before the stated restriction") — only if the time can be reliably interpreted.
6. In "avoid_actions", list things the traveler should not do, supported by the content. Do not invent warnings.
7. "location_context": any relevant location-derived note (empty if none).
8. "confidence": high/medium/low. "confidence_note": what is uncertain, if anything.
9. "sources": for any information BEYOND the literal image, tag kind as "from_image", "verified" (retrieved from a reliable external source via web search), or "ai_explanation". Provide name/type/url when available. Do not claim authenticity unless verified.
10. If the image shows prices (menu, price board, receipt, ticket), extract each into "price_data": { item, price, currency, quantity, total } so it can be sent to NaviVerify. Only include values actually visible.
11. If the image is a ticket, fill "ticket_summary": { date, time, gate, seat, destination, type, validity, rules[] } with only information actually present.

RULES:
- Never invent text, prices, rules, or sources. If something is unclear or unreadable, say so.
- Distinguish what is literally in the image from what is verified externally from what is your interpretation.
- If you cannot confidently identify the sign/notice, say so in confidence_note and advise relying on the official sign and local authorities.

Return JSON matching the requested schema.`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      add_context_from_internet: true,
      model: 'gemini_3_8_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          detected_type: { type: 'string' },
          detected_language: { type: 'string' },
          extracted_text: { type: 'string' },
          translation: { type: 'string' },
          explanation: { type: 'string' },
          recommended_actions: { type: 'array', items: { type: 'string' } },
          avoid_actions: { type: 'array', items: { type: 'string' } },
          location_context: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          confidence_note: { type: 'string' },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }, type: { type: 'string' }, url: { type: 'string' },
                kind: { type: 'string', enum: ['from_image', 'verified', 'ai_explanation'] }, note: { type: 'string' }
              }
            }
          },
          price_data: {
            type: 'array',
            items: {
              type: 'object',
              properties: { item: { type: 'string' }, price: { type: 'number' }, currency: { type: 'string' }, quantity: { type: 'number' }, total: { type: 'number' } }
            }
          },
          ticket_summary: {
            type: 'object',
            properties: {
              date: { type: 'string' }, time: { type: 'string' }, gate: { type: 'string' },
              seat: { type: 'string' }, destination: { type: 'string' }, type: { type: 'string' },
              validity: { type: 'string' }, rules: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        required: ['detected_type', 'extracted_text', 'translation', 'explanation', 'confidence']
      }
    });

    const data = (res && typeof res === 'object' && !Array.isArray(res)) ? res : (typeof res === 'string' ? JSON.parse(res) : {});

    const record = await base44.entities.ScanResult.create({
      image: fileUrl,
      detected_type: data.detected_type || '',
      extracted_text: data.extracted_text || '',
      detected_language: data.detected_language || '',
      translation: data.translation || '',
      explanation: data.explanation || '',
      recommended_actions: data.recommended_actions || [],
      avoid_actions: data.avoid_actions || [],
      location_context: data.location_context || '',
      confidence: data.confidence || 'low',
      confidence_note: data.confidence_note || '',
      sources: data.sources || [],
      price_data: data.price_data || [],
      ticket_summary: data.ticket_summary || null
    });

    return Response.json({ ...data, id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}