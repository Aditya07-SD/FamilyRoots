# FamilyRoots email OTP

Current development registration sends a 6-digit OTP to the exact email address entered during registration. The user must enter the OTP before an auth cookie is created.

Set these in `server/.env`:

```env
EMAIL_VERIFICATION_MODE=smtp
EMAIL_VERIFICATION_CODE_EXPIRES_MINUTES=10
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-gmail@gmail.com
SMTP_APP_PASSWORD=your-google-app-password
```

`SMTP_APP_PASSWORD` is a Google App Password, not the normal Gmail password.

The existing Resend verification code remains in `server/src/utils/email.js` and the `/auth/verify-email` route. No CSS files were changed.
