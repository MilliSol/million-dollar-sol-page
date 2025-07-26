// pages/api/contact.js
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { wallet, email, subject, message } = req.body;

  if (!email || !subject || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Bouw de e-mail
  const html = `
    <h3>New contact form submission</h3>
    <p><strong>From email:</strong> ${email}</p>
    ${wallet ? `<p><strong>Wallet:</strong> ${wallet}</p>` : ''}
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
  `;

  // Verzend via SMTP
  // Zet deze variabelen in je .env.local:
  // EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, CONTACT_EMAIL
  let transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT) === 465, // true for 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.CONTACT_EMAIL,     // jouw e-mail, in .env.local
      subject: `[Contact] ${subject}`,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Mail error:', err);
    return res.status(500).json({ error: 'Error sending email' });
  }
}