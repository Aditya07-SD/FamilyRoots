import { config } from "../config.js";

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
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.email.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: config.email.from,
        to: [to],
        subject,
        html
      })
    });

    // Read Resend's actual response
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("EMAIL PROVIDER ERROR");
      console.error("HTTP status:", response.status);
      console.error("Response:", data);

      const providerMessage =
        data?.message ||
        data?.error ||
        `Resend returned HTTP ${response.status}`;

      throw Object.assign(
        new Error(providerMessage),
        {
          status: 502,
          providerStatus: response.status,
          providerResponse: data
        }
      );
    }

    console.log("Email sent successfully:", data?.id);

    return {
      delivered: true,
      id: data?.id
    };
  } catch (error) {
    console.error("EMAIL SEND ERROR");
    console.error("Message:", error.message);
    console.error("Status:", error.status);
    console.error("Provider status:", error.providerStatus);

    throw error;
  }
}