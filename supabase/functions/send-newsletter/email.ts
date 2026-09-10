// Thin wrapper around the Resend API plus a branded HTML shell every
// newsletter-related email uses, so the confirmation email and the actual
// updates look like they come from the same place as the site.
const SITE_URL = 'https://nse-tracker.is-a.dev/'
const AUTHOR_URL = 'https://www.linkedin.com/in/crotich/'

// Resend's shared sandbox sender — works without verifying a custom domain,
// but for real deliverability set a RESEND_FROM_EMAIL secret once a domain
// is verified in the Resend dashboard.
const DEFAULT_FROM = 'NSE Market Intelligence <onboarding@resend.dev>'

export function wrapEmailHtml(bodyHtml: string, unsubscribeUrl?: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0B0D10;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0D10;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#12151A;border-radius:12px;overflow:hidden;border:1px solid #242A32;max-width:90%;">
          <tr><td style="background:#0B0D10;padding:20px 28px;border-bottom:1px solid #242A32;">
            <span style="color:#F0A93A;font-size:18px;font-weight:700;">NSE Market Intelligence</span>
          </td></tr>
          <tr><td style="padding:28px;color:#F5F7FA;font-size:15px;line-height:1.6;">
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:20px 28px;border-top:1px solid #242A32;color:#8B93A1;font-size:12px;line-height:1.6;">
            Built by <a href="${AUTHOR_URL}" style="color:#F0A93A;text-decoration:none;">Collins Rotich</a>
            &middot; <a href="${SITE_URL}" style="color:#F0A93A;text-decoration:none;">Live site</a>
            ${unsubscribeUrl ? `&middot; <a href="${unsubscribeUrl}" style="color:#8B93A1;">Unsubscribe</a>` : ''}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY must be set as a function secret')
  const from = Deno.env.get('RESEND_FROM_EMAIL') || DEFAULT_FROM

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend send failed (${res.status}): ${text}`)
  }
}
