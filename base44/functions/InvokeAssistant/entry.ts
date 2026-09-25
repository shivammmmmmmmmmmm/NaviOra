import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Routes InvokeLLM through the service role (direct client calls are blocked).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const prompt = String(body.prompt || '');
    if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 });
    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const text = typeof res === 'string' ? res : (res?.text || res?.response || (typeof res === 'object' ? JSON.stringify(res) : ''));
    return Response.json({ text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}