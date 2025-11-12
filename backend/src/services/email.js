import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporterPromise;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;
  if (config.email.sendgridApiKey) {
    // Using SendGrid's SMTP relay is commonly done via SMTP creds; for simplicity use nodemailer SMTP if provided
  }
  if (config.email.smtpUser && config.email.smtpPass) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        service: 'gmail',
        auth: { user: config.email.smtpUser, pass: config.email.smtpPass }
      })
    );
    return transporterPromise;
  }
  // Fallback to Ethereal for dev/testing
  transporterPromise = nodemailer.createTestAccount().then((testAccount) =>
    nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    })
  );
  return transporterPromise;
}

export async function sendEmail({ to, subject, html }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: 'no-reply@campusdating.local',
      to,
      subject,
      html
    });
    // eslint-disable-next-line no-console
    console.log('Email sent:', info.messageId);
    if (nodemailer.getTestMessageUrl) {
      // eslint-disable-next-line no-console
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Email error:', err.message);
  }
}


