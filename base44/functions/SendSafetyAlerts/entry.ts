import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Sends a safety alert to emergency contacts by EMAIL only (SMS/Twilio removed).
// Contacts whose "phone" field is an email address receive an automatic email.
// Contacts whose field is a phone number are skipped here (the client offers
// one-tap WhatsApp / call buttons as a manual backup for those).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message = String(body.message || '').slice(0, 1200);
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];
    if (!message || contacts.length === 0) {
      return Response.json({ error: 'message and contacts are required' }, { status: 400 });
    }

    const emailSent = [];
    const emailFailed = [];
    const skipped = [];

    for (const c of contacts) {
      const dest = String(c.phone || '').trim();
      if (!dest) continue;
      if (dest.includes('@')) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: dest,
            subject: 'NaviOra Safety Alert',
            body: message
          });
          emailSent.push(c.name || dest);
        } catch (e) {
          emailFailed.push(c.name || dest);
        }
      } else {
        // Phone-only contact: no SMS gateway. Client shows WhatsApp/call buttons.
        skipped.push(c.name || dest);
      }
    }

    return Response.json({
      channel: 'email',
      email_sent: emailSent,
      email_failed: emailFailed,
      skipped
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}