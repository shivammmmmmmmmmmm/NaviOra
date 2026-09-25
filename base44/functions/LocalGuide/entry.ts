import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Local Guide — location- and context-specific local rules, etiquette, do's & don'ts.
// Uses InvokeLLM with live web search so the guidance reflects the ACTUAL place the
// traveler is at (e.g. a Gurudwara requires head covering; a mosque has prayer times
// and entry rules). The model is told to use verifiable local/customary rules only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    const query = String(body.query || '').trim();
    const location = String(body.location || '').trim();
    const userLat = body.userLat != null ? Number(body.userLat) : null;
    const userLng = body.userLng != null ? Number(body.userLng) : null;
    const userLang = String(body.userLang || 'en').trim();

    if (!location && !query) return Response.json({ error: 'Share your location or describe where you are going.' }, { status: 400 });

    const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const coords = (userLat != null && userLng != null) ? `${userLat.toFixed(4)}, ${userLng.toFixed(4)}` : 'unknown';

    const prompt = `You are NaviOra Local Guide, a cultural and etiquette advisor for travelers. A traveler wants to know the local rules, customs and etiquette for the place they are at or about to visit, so they act respectfully, stay safe, and avoid offending locals.

Today's date: ${today}.
Traveler coordinates: ${coords}.
Traveler-stated location: ${location || 'not specified'}.
Respond in this language code (BCP-47): ${userLang}. If you cannot write in that language, fall back to English.

TRAVELER'S CONTEXT / QUESTION:
${query || '(no description — infer the most relevant local rules from the location)'}

INSTRUCTIONS:
1. Use live web search to ground your guidance in the REAL customs, rules and etiquette of THIS specific place or place-type (e.g. a Sikh Gurudwara, a Hindu temple, a mosque, a Buddhist monastery, a Japanese onsen, a market, a national park, a border area). Search for the actual place if named.
2. Distinguish clearly between "do" (expected, respectful, required, recommended behavior) and "dont" (prohibited, offensive, unsafe, or illegal). Be specific and actionable — e.g. "Cover your head with a scarf or turban before entering" rather than "dress modestly".
3. Include religious/cultural rules (head covering, footwear removal, dress code, photography restrictions, entry timing, gender rules), safety/legal rules, and practical etiquette (tipping, greetings, bargaining, queuing, eating with hands, public behavior, alcohol, smoking, displays of affection).
4. In "essential_info" put hard facts the traveler must know: entry fee, opening hours, prohibited items, photography policy, required documents, emergency contacts, dress-code specifics.
5. In "tips" add a few practical insider tips (best time to visit, what to carry, common tourist traps to avoid, local phrases).
6. NEVER invent rules that do not apply to this place. If a rule is uncertain or varies, say so honestly in confidence_note rather than stating it as fact.
7. In "sources", list each real source you used (official site, tourism board, reputable guide, community thread): name, type (official/tourism/community), url (real URL or empty string), note.
8. "place_type" should classify the place (e.g. "Sikh Gurudwara", "Hindu temple", "market", "national park"). "context" should be one short paragraph framing the guidance. "place_name" the specific place or area.

Return JSON matching the schema. Be precise, concrete and complete. Prefer many specific rules over a few vague ones.`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          place_name: { type: 'string' },
          place_type: { type: 'string' },
          context: { type: 'string' },
          do_list: { type: 'array', items: { type: 'string' } },
          dont_list: { type: 'array', items: { type: 'string' } },
          tips: { type: 'array', items: { type: 'string' } },
          essential_info: { type: 'array', items: { type: 'string' } },
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }, type: { type: 'string' }, url: { type: 'string' }, note: { type: 'string' }
              }
            }
          },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          confidence_note: { type: 'string' }
        },
        required: ['place_name', 'place_type', 'do_list', 'dont_list', 'confidence']
      }
    });

    const data = (res && typeof res === 'object' && !Array.isArray(res)) ? res : (typeof res === 'string' ? JSON.parse(res) : {});

    const record = await base44.entities.LocalGuide.create({
      query,
      place_name: data.place_name || location || 'Unknown place',
      place_type: data.place_type || '',
      lat: userLat, lng: userLng,
      context: data.context || '',
      do_list: data.do_list || [],
      dont_list: data.dont_list || [],
      tips: data.tips || [],
      essential_info: data.essential_info || [],
      sources: data.sources || [],
      confidence: data.confidence || 'medium',
      confidence_note: data.confidence_note || ''
    });

    return Response.json({ ...data, id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}