import { config } from "../config.js";

// Parses "Name <email@example.com>" or a plain "email@example.com" string
// into the { name, email } shape Brevo's API expects for sender/recipient.
function parseAddress(value) {
  const match = /^(.*)<(.+)>$/.exec(value || "");
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return { name: name || undefined, email: match[2].trim() };
  }
  return { email: (value || "").trim() };
}

export async function sendEmail({ to, subject, html }) {
  if (!config.email.apiKey) {
    if (config.nodeEnv === "development") {
      console.info(
        `[email:dev] To: ${to}\nSubject: ${subject}\n${html}`
      );

      return {
        delivered: false,
        development: true
      };
    }

    throw Object.assign(
      new Error("Email service is not configured"),
      { status: 503 }
    );
  }

  try {
    // Brevo's transactional email API. Works over plain HTTPS (port 443),
    // so it isn't blocked by Render Free's outbound SMTP port restriction.
    // Unlike Resend, Brevo lets you send to real recipients using a single
    // *verified sender email address* (no domain ownership required) —
    // see EMAIL_FROM in .env.example.
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.email.apiKey,
        "Content-Type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        sender: parseAddress(config.email.from),
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });

    // Read Brevo's actual response
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("EMAIL PROVIDER ERROR");
      console.error("HTTP status:", response.status);
      console.error("Response:", data);

      const providerMessage =
        data?.message ||
        data?.code ||
        `Brevo returned HTTP ${response.status}`;

      throw Object.assign(
        new Error(providerMessage),
        {
          status: 502,
          providerStatus: response.status,
          providerResponse: data
        }
      );
    }

    console.log("Email sent successfully:", data?.messageId);

    return {
      delivered: true,
      id: data?.messageId
    };
  } catch (error) {
    console.error("EMAIL SEND ERROR");
    console.error("Message:", error.message);
    console.error("Status:", error.status);
    console.error("Provider status:", error.providerStatus);

    throw error;
  }
}
