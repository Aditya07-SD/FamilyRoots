import nodemailer from "nodemailer";

export async function sendSmtpEmail({ to, subject, html, from }) {
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_APP_PASSWORD;

  if (!user || !password) {
    throw new Error(
      "SMTP_USER and SMTP_APP_PASSWORD are required."
    );
  }

  console.log("=================================");
  console.log("FamilyRoots SMTP");
  console.log("From:", user);
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("=================================");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user,
      pass: password
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  });

  try {
    // Verify Gmail SMTP connection/authentication first.
    await transporter.verify();

    console.log("SMTP authentication successful.");

    const result = await transporter.sendMail({
      from: from || user,
      to,
      subject,
      html
    });

    console.log("OTP email accepted by Gmail.");
    console.log("Message ID:", result.messageId);
    console.log("Accepted:", result.accepted);
    console.log("Rejected:", result.rejected);

    return {
      delivered: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error("=================================");
    console.error("SMTP EMAIL FAILED");
    console.error("Code:", error.code);
    console.error("Command:", error.command);
    console.error("Response:", error.response);
    console.error("Message:", error.message);
    console.error("=================================");

    throw error;
  }
}