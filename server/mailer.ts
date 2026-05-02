import { Resend } from 'resend';
import nodemailer from "nodemailer";

let connectionSettings: any;
let smtpTransport: nodemailer.Transporter | null = null;

async function getCredentials() {
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM || process.env.SMTP_FROM || 'onboarding@resend.dev',
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    console.warn('⚠️ Resend: X_REPLIT_TOKEN not found');
    return null;
  }

  try {
    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    if (!connectionSettings || !connectionSettings.settings?.api_key) {
      console.warn('⚠️ Resend not connected or API key missing');
      return null;
    }
    return {
      apiKey: connectionSettings.settings.api_key,
      fromEmail: connectionSettings.settings.from_email || 'onboarding@resend.dev'
    };
  } catch (error: any) {
    console.error('❌ Error getting Resend credentials:', error.message);
    return null;
  }
}

async function getResendClient() {
  const credentials = await getCredentials();
  if (!credentials) return null;

  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail
  };
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) return null;

  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return smtpTransport;
}

function formatFromAddress(address: string, displayName = "Classify Security") {
  // Keep pre-formatted sender values intact (e.g., "Name <mail@domain>").
  if (address.includes("<") && address.includes(">")) return address;
  return `${displayName} <${address}>`;
}

export async function sendOtpEmail(to: string, code: string, purpose = "Verification", expiryMinutes = 5) {
  const subject =
    purpose === "Login"
      ? "Classify Security | Login verification"
      : purpose === "Password Reset"
        ? "Classify Security | Password reset verification"
        : "Classify Security | Account verification";
  const purposeLabel =
    purpose === "Login"
      ? "تسجيل الدخول / Sign in"
      : purpose === "Password Reset"
        ? "إعادة تعيين كلمة المرور / Password reset"
        : "التحقق من الهوية / Verification";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 16px; background: #f4f7ff;">
      <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); border-radius: 18px; padding: 28px 24px; text-align: center; color: #fff;">
        <h1 style="margin: 0 0 6px 0; font-size: 30px; letter-spacing: 0.5px;">Classify</h1>
        <p style="margin: 0; font-size: 15px; opacity: 0.95;">Parenting made smarter | تربية ذكية بثقة</p>
      </div>

      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 18px; padding: 30px 24px; margin-top: 16px; box-shadow: 0 8px 30px rgba(37, 99, 235, 0.12);">
        <p style="margin: 0 0 12px 0; text-align: center; color: #4b5563; font-size: 14px;">${purposeLabel}</p>
        <h2 style="color: #111827; text-align: center; margin: 0 0 14px 0; font-size: 24px;">رمز التحقق الخاص بك | Your verification code</h2>
        <p style="color: #6b7280; text-align: center; margin: 0 0 22px 0; line-height: 1.7;">
          أدخل الرمز التالي لإكمال العملية بأمان.<br />
          Enter the code below to securely complete your request.
        </p>

        <div style="background: #eef2ff; border: 1px dashed #818cf8; border-radius: 14px; padding: 20px; text-align: center; margin: 0 0 22px 0;">
          <span style="font-size: 38px; font-weight: 700; letter-spacing: 10px; color: #3730a3; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${code}</span>
        </div>

        <p style="color: #6b7280; text-align: center; font-size: 14px; margin: 0; line-height: 1.7;">
          صالح لمدة ${expiryMinutes} دقائق فقط.<br />
          Valid for ${expiryMinutes} minutes only.
        </p>
      </div>

      <div style="background: #fff; border: 1px solid #f3f4f6; border-radius: 14px; padding: 16px; margin-top: 14px;">
        <p style="margin: 0; color: #6b7280; text-align: center; font-size: 12px; line-height: 1.8;">
          لا تشارك هذا الرمز مع أي شخص. فريق Classify لن يطلب منك هذا الرمز.<br />
          Never share this code with anyone. Classify support will never ask for it.
        </p>
      </div>

      <p style="color: #9ca3af; text-align: center; font-size: 12px; margin: 18px 0 0 0;">
        إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة. | If this wasn't you, you can safely ignore this message.
      </p>
    </div>
  `;

  const text = [
    "Classify Security",
    "Secure verification message | رسالة تحقق آمنة",
    "",
    `Request type / نوع العملية: ${purposeLabel}`,
    `Your verification code / رمز التحقق الخاص بك: ${code}`,
    `This code expires in ${expiryMinutes} minutes / تنتهي صلاحية الرمز خلال ${expiryMinutes} دقائق.`,
    "",
    "For your safety, do not share this code with anyone.",
    "لحمايتك، لا تشارك هذا الرمز مع أي شخص.",
    "",
    "If this request wasn't made by you, you can safely ignore this message.",
    "إذا لم يكن هذا الطلب منك، يمكنك تجاهل هذه الرسالة بأمان.",
  ].join("\n");

  return sendMail({ to, subject, html, text });
}

export async function sendMail(opts: { to: string; subject: string; text?: string; html?: string }) {
  const resend = await getResendClient();
  if (resend) {
    try {
      const { data, error } = await resend.client.emails.send({
        from: formatFromAddress(resend.fromEmail),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html || opts.text || '',
        text: opts.text,
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ Email sent via Resend to ${opts.to}:`, data?.id);
      return data;
    } catch (err: any) {
      console.error(`❌ Resend failed for ${opts.to}:`, err.message);
      // Fall through to SMTP if configured
    }
  }

  const transport = getSmtpTransport();
  if (!transport) {
    if (process.env.OTP_DEV_MODE === "true" || process.env.NODE_ENV === "development") {
      console.warn(`✉️ Email service not configured; skipping send in dev mode for ${opts.to}`);
      return { messageId: "dev-skip" } as any;
    }
    throw new Error('Email service not configured');
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@classify.app";
    const info = await transport.sendMail({
      from: formatFromAddress(from),
      to: opts.to,
      subject: opts.subject,
      html: opts.html || opts.text || '',
      text: opts.text,
    });
    console.log(`✅ Email sent via SMTP to ${opts.to}:`, info.messageId);
    return info;
  } catch (err: any) {
    console.error(`❌ SMTP failed for ${opts.to}:`, err.message);
    throw err;
  }
}

export async function sendNotificationEmail(to: string, title: string, message: string) {
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 16px; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); border-radius: 18px; padding: 24px; text-align: center; color: #fff;">
        <h1 style="margin: 0 0 6px 0; font-size: 24px;">🔔 ${title}</h1>
        <p style="margin: 0; opacity: 0.95; font-size: 14px;">Classify Notifications</p>
      </div>

      <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 24px; margin-top: 16px; box-shadow: 0 8px 24px rgba(14, 165, 233, 0.12);">
        <p style="color: #1f2937; font-size: 16px; line-height: 1.8; margin: 0;">${message}</p>
      </div>

      <p style="color: #94a3b8; text-align: center; font-size: 12px; margin-top: 16px;">
        Classify | Parenting made smarter
      </p>
    </div>
  `;

  const text = [
    `Classify Notification: ${title}`,
    "",
    message,
    "",
    "Classify | Parenting made smarter",
  ].join("\n");

  return sendMail({ to, subject: `Classify - ${title}`, html, text });
}

export default { sendOtpEmail, sendMail, sendNotificationEmail };
