// src/utils/testEmail.js
// Quick diagnostic — run: node src/utils/testEmail.js
// Sends a test email directly so you can verify Gmail SMTP works.

require('dotenv').config()
const nodemailer = require('nodemailer')

const { EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env

console.log('\n📧 Email config loaded:')
console.log('  HOST :', EMAIL_HOST)
console.log('  PORT :', EMAIL_PORT)
console.log('  USER :', EMAIL_USER)
console.log('  PASS :', EMAIL_PASS ? `${EMAIL_PASS.slice(0, 4)}${'*'.repeat(EMAIL_PASS.length - 4)}` : '❌ MISSING')
console.log('  FROM :', EMAIL_FROM)
console.log('')

if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
  console.error('❌ Missing EMAIL_HOST, EMAIL_USER or EMAIL_PASS in .env — aborting.')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: parseInt(EMAIL_PORT, 10) || 587,
  secure: EMAIL_SECURE === 'true',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
})

transporter.verify((err, success) => {
  if (err) {
    console.error('❌ SMTP connection failed:', err.message)
    console.error('\nCommon fixes:')
    console.error('  1. Make sure 2-Step Verification is ON in your Google Account')
    console.error('  2. App Password must be 16 chars with NO spaces and NO extra text')
    console.error('  3. Go to myaccount.google.com → Security → App passwords → create one for LExperts')
    process.exit(1)
  }

  console.log('✅ SMTP connection verified — sending test email to', EMAIL_USER, '...\n')

  transporter.sendMail(
    {
      from: EMAIL_FROM,
      to: EMAIL_USER, // sends to yourself as a quick test
      subject: 'LExperts — Email Test ✅',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:40px auto;padding:32px;background:#fff;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
          <h2 style="color:#0f0e0c;margin:0 0 12px">LExperts Email is Working! 🎉</h2>
          <p style="color:#555;font-size:15px;line-height:1.6">
            This is a test email sent by your LExperts backend.<br/>
            If you can see this, real booking notifications will reach users' inboxes.
          </p>
          <p style="margin-top:24px;font-size:13px;color:#aaa;">Sent at ${new Date().toLocaleString()}</p>
        </div>
      `,
    },
    (err, info) => {
      if (err) {
        console.error('❌ Send failed:', err.message)
        process.exit(1)
      }
      console.log('✅ Test email sent! Message ID:', info.messageId)
      console.log('\nCheck your inbox at:', EMAIL_USER)
      console.log('(If not in inbox, check Spam folder)\n')
    }
  )
})
