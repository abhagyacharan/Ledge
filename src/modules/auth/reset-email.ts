/** Minutes a reset link works for. Matches `resetPasswordTokenExpiresIn` in src/server/auth.ts. */
export const RESET_LINK_MINUTES = 60;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * The reset-password email: plain words, one link, and what to do if it was not you. The HTML part
 * is a single column with inline styles, since mail apps ignore stylesheets.
 */
export function resetPasswordEmail({ name, url }: { name: string; url: string }) {
  const first = name.trim().split(/\s+/)[0] || "there";
  const subject = "Reset your Ledge password";
  const text = [
    `Hi ${first},`,
    "",
    "Someone asked to reset the password for your Ledge account. To choose a new one, open this link:",
    "",
    url,
    "",
    `The link works once and stops working after ${RESET_LINK_MINUTES} minutes.`,
    "If you didn't ask for this, you can ignore this email. Your password stays the same.",
  ].join("\n");
  const safeUrl = escapeHtml(url);
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f2f4f1;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#121514">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
<p style="margin:0 0 16px;font-size:20px;font-weight:600">Reset your password</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Hi ${escapeHtml(first)}, someone asked to reset the password for your Ledge account.</p>
<p style="margin:0 0 20px"><a href="${safeUrl}" style="display:inline-block;background:#1f6b4a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:999px">Choose a new password</a></p>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#4a524e">The link works once and stops working after ${RESET_LINK_MINUTES} minutes. If the button does not work, copy this address into your browser:</p>
<p style="margin:0 0 20px;font-size:13px;word-break:break-all;color:#4a524e">${safeUrl}</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#4a524e">If you didn't ask for this, ignore this email. Your password stays the same.</p>
</div></body></html>`;
  return { subject, text, html };
}
