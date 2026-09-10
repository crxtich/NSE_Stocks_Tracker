// A small branded HTML page for the two links people click straight from
// their inbox (confirm / unsubscribe) — these are plain browser navigations,
// not fetch() calls, so they need to render something on their own rather
// than return JSON.
export function brandedPage(title: string, message: string, isError = false): Response {
  const accent = isError ? '#E4574C' : '#F0A93A'
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — NSE Market Intelligence</title>
</head>
<body style="margin:0;background:#0B0D10;color:#F5F7FA;font-family:-apple-system,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:420px;padding:32px;text-align:center;">
    <div style="color:${accent};font-size:20px;font-weight:700;margin-bottom:12px;">${title}</div>
    <p style="color:#8B93A1;font-size:15px;line-height:1.6;">${message}</p>
    <a href="https://nse-tracker.is-a.dev/" style="display:inline-block;margin-top:20px;color:#0B0D10;background:${accent};padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Back to the site</a>
  </div>
</body>
</html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
