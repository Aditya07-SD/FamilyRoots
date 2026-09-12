import dotenv from "dotenv";
dotenv.config();

const required = ["MONGODB_URI", "JWT_SECRET", "EMAIL_API_KEY", "EMAIL_FROM"];
if (process.env.NODE_ENV === "production") {
  for (const key of required) if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
}
export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/familyroots",
  jwtSecret: process.env.JWT_SECRET || "development-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
  google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, callbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback" },
  email: {
    from: process.env.EMAIL_FROM || `FamilyRoots <${process.env.SMTP_USER || "noreply@example.com"}>`,
    apiKey: process.env.EMAIL_API_KEY,
    verificationMode: process.env.EMAIL_VERIFICATION_MODE || "smtp",
    verificationCodeExpiresMinutes: Number(process.env.EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES || 10)
  },
  cloudinary: { cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET }
};
