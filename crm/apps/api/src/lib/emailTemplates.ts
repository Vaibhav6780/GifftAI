export function welcomeEmail(params: { firstName: string; resetUrl: string }) {
  return {
    subject: "Welcome to GifftAI CRM — set your password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to GifftAI CRM</h2>
        <p>Hi ${params.firstName},</p>
        <p>An account has been created for you. Set your password to get started. This link expires in 30 minutes.</p>
        <p>
          <a href="${params.resetUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
            Set Password
          </a>
        </p>
        <p>If you weren't expecting this, you can safely ignore this email.</p>
      </div>
    `,
  };
}

export function passwordResetEmail(params: { firstName: string; resetUrl: string }) {
  return {
    subject: "Reset your GifftAI CRM password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Hi ${params.firstName},</p>
        <p>We received a request to reset your password. This link expires in 30 minutes.</p>
        <p>
          <a href="${params.resetUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
            Reset Password
          </a>
        </p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };
}
