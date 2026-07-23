// Transactional email via Resend's REST API (no SDK dependency — a plain
// fetch). Degrades gracefully: with no RESEND_API_KEY set it logs and skips,
// so local/dev and the rest of a mutation keep working. Callers should treat
// sending as best-effort and never let it break the underlying action.

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  // Resend's sandbox sender works without domain verification for testing.
  const from = process.env.EMAIL_FROM ?? "Materiaalitukku <onboarding@resend.dev>";

  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set — skipped: "${args.subject}" -> ${args.to}`);
    return { ok: false, skipped: true };
  }
  if (!args.to || !args.to.includes("@")) {
    return { ok: false, error: "invalid recipient" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] send failed ${res.status}: ${body}`);
      return { ok: false, error: `${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] send threw:", e);
    return { ok: false, error: String(e) };
  }
}

// --- Minimal shared template so every notification looks consistent. --------
function layout(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0d1117">
  <h2 style="color:#1450A3;margin:0 0 12px">${title}</h2>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
  <p style="font-size:12px;color:#64748b">materiaalitukku.com — construction material price comparison</p>
</div>`;
}

export const emailTemplates = {
  submissionApproved(productName: string) {
    return {
      subject: `Your product "${productName}" is now live on materiaalitukku.com`,
      html: layout(
        "Product approved ✓",
        `<p>Good news — your submitted product <strong>${productName}</strong> has been approved and is now visible in the price comparison.</p>`
      ),
    };
  },
  submissionRejected(productName: string) {
    return {
      subject: `About your product submission "${productName}"`,
      html: layout(
        "Submission not approved",
        `<p>Thank you for submitting <strong>${productName}</strong>. Unfortunately it wasn't approved for listing this time. You're welcome to submit again with more detail.</p>`
      ),
    };
  },
  priceChangeApproved(newPrice: number) {
    return {
      subject: `Your price update was applied`,
      html: layout(
        "Price updated ✓",
        `<p>Your requested price change to <strong>${newPrice.toFixed(2)} €</strong> has been applied to your listing.</p>`
      ),
    };
  },
  registrationReceived(companyName: string) {
    return {
      subject: `Welcome to materiaalitukku.com, ${companyName}`,
      html: layout(
        "Registration received ✓",
        `<p>Thanks for registering <strong>${companyName}</strong>. Your listing has been activated — you'll appear in the supplier directory.</p>`
      ),
    };
  },
};
