// Sends email through Resend (https://resend.com). Without RESEND_API_KEY the
// message is only logged, so local runs and previews never send real email.

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** One-click unsubscribe link (RFC 8058), for anything that isn't a direct reply to an action. */
  unsubscribeUrl?: string;
};

export type SendResult = { ok: true; id: string | null; dryRun: boolean } | { ok: false; error: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function siteUrl(): string {
  const raw = process.env.SITE_URL?.trim() || "https://www.midnry.com";
  return raw.replace(/\/+$/, "");
}

function fromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "Midnry Remind <reminders@midnry.com>";
}

export async function sendEmail(email: Email): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.log(`[email:dry-run] to=${email.to} subject=${JSON.stringify(email.subject)}`);
    return { ok: true, id: null, dryRun: true };
  }
  const headers: Record<string, string> = {};
  if (email.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${email.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to: [email.to], subject: email.subject, html: email.html, text: email.text, headers }),
    });
    const body = (await response.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;
    if (!response.ok) {
      const error = body?.message || `Resend returned ${response.status}`;
      console.error("email send failed:", error);
      return { ok: false, error };
    }
    return { ok: true, id: body?.id ?? null, dryRun: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    console.error("email send failed:", message);
    return { ok: false, error: message };
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A plain, readable email layout that works in every mail app. */
export function layout({ heading, body, button, footer }: { heading: string; body: string; button?: { label: string; url: string }; footer?: string }): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f4f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#102033">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td style="font-size:14px;color:#5c6e84;padding-bottom:12px">Midnry Remind</td></tr>
<tr><td style="font-size:22px;font-weight:600;line-height:1.3;padding-bottom:16px">${escapeHtml(heading)}</td></tr>
<tr><td style="font-size:16px;line-height:1.5">${body}</td></tr>
${button ? `<tr><td style="padding-top:24px"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${escapeHtml(button.label)}</a></td></tr>` : ""}
</table>
${footer ? `<p style="max-width:520px;font-size:12px;line-height:1.5;color:#5c6e84;margin:16px auto 0">${footer}</p>` : ""}
</td></tr></table>
</body></html>`;
}
