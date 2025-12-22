require('dotenv').config();
const { createTransport } = require('nodemailer');
const { sendTestNow } = require('./daily-message');

const transport = createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

(async () => {
  await sendTestNow({ transport, type: 'midday' });
  console.log('✅ E-mail da tarde enviado');
  process.exit(0);
})();
