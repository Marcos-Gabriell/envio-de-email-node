const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { setupDailyMessageCron, sendTestNow } = require('./daily-message');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
app.set('trust proxy', true);

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  const ip =
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    (xff && xff.split(',')[0].trim()) ||
    req.ip ||
    req.socket?.remoteAddress ||
    '';
  return ip.replace(/^::ffff:/, '');
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getClientIp,
  message: { error: 'Muitas tentativas de envio. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'Marcosgabriel79355@gmail.com';
const CONTACT_WHATSAPP_E164 = process.env.CONTACT_WHATSAPP_E164 || '5574988319037';
const CONTACT_WHATSAPP_HUMAN = process.env.CONTACT_WHATSAPP_HUMAN || '(74) 98831-9037';
const FROM_NAME = process.env.FROM_NAME || 'Marcos Gabriel';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || CONTACT_EMAIL;

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT || 465),
  secure: String(process.env.EMAIL_SECURE ?? 'true') === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
});

const clampStr = (v) => (typeof v === 'string' ? v.trim() : '');
const isEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v || '');
const brToHTML = (v) => clampStr(v).replace(/\n/g, '<br>');
const escapeHTML = (str) =>
  clampStr(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
const sanitizePhone = (v) => clampStr(v).replace(/\D/g, '');

const baseHead = `
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<meta name="color-scheme" content="light dark" />
<style>
:root {
  --bg:#f6f9fc; --card:#ffffff; --text:#111827; --muted:#6b7280;
  --brand1:#0038A8; --brand2:#00C2FF; --chip:#f8fbff;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:#111827; --card:#1f2937; --text:#f9fafb; --muted:#9ca3af; --chip:#374151;
  }
}
.container{max-width:640px;margin:auto;background:var(--card);border-radius:12px;box-shadow:0 4px 18px rgba(0,0,0,.08);overflow:hidden;}
.header{background:linear-gradient(90deg,var(--brand1),var(--brand2));padding:22px;text-align:center;color:#fff;font:700 18px 'Segoe UI',Arial;}
.body{padding:28px;color:var(--text);font:400 15px/1.6 'Segoe UI',Arial;}
.blockquote{border-left:4px solid var(--brand2);background:var(--chip);padding:12px 16px;border-radius:8px;margin:18px 0;color:var(--text);}
.footer{background:#0d0d0d;color:#aaa;text-align:center;padding:14px;font-size:12px;}
.small{font:400 13px/1.6 'Segoe UI',Arial;color:var(--muted);}
a{color:var(--brand1);text-decoration:none}
@media (prefers-color-scheme: dark) {
  a{color:var(--brand2);}
}
</style>
`;

function emailAdminHTML({ title = 'Nova Mensagem', nome, email, phone = '', mensagemHTML }) {
  const safeNome = escapeHTML(nome);
  const safeEmail = escapeHTML(email);
  const safePhone = escapeHTML(phone);

  return `<!doctype html><html lang="pt-BR"><head>${baseHead}</head>
<body style="margin:0; background-color: var(--bg, #f6f9fc); font-family: 'Segoe UI', Arial, sans-serif;">
  <table class="container" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:auto; background-color: var(--card, #ffffff); border-radius:12px; box-shadow:0 4px 18px rgba(0,0,0,.08); overflow:hidden;">
    <tr><td class="header" style="background: #0038A8; background: linear-gradient(90deg, #0038A8, #00C2FF); padding: 22px; text-align: center; color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 700;">${title}</td></tr>
    <tr><td class="body" style="padding: 28px; color: var(--text, #111827); font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      <h3 style="margin:0 0 10px; color: var(--text, #111827);">Olá, Marcos! 👋</h3>
      <p style="margin: 1em 0; color: var(--text, #111827);">Você recebeu um novo envio pelo portfólio.</p>
      <table style="width:100%; border-collapse:collapse; margin:12px 0; color: var(--text, #111827);">
        <tr><td style="padding:6px 0;width:120px;color: var(--brand1, #0038A8);font-weight:600;">🧑 Nome:</td><td style="padding:6px 0;">${safeNome}</td></tr>
        <tr><td style="padding:6px 0;color: var(--brand1, #0038A8);font-weight:600;">📧 E-mail:</td><td style="padding:6px 0;">${safeEmail}</td></tr>
        ${safePhone ? `<tr><td style="padding:6px 0;color: var(--brand1, #0038A8);font-weight:600;">📱 Telefone:</td><td style="padding:6px 0;">${safePhone}</td></tr>` : ''}
      </table>
      <div class="blockquote" style="border-left:4px solid var(--brand2, #00C2FF); background-color: var(--chip, #f8fbff); padding:12px 16px; border-radius:8px; margin:18px 0; color: var(--text, #111827);">${mensagemHTML}</div>
      <p class="small" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.6; color: var(--muted, #6b7280);">⚡ Lembrete: responda rápido (WhatsApp ou e-mail). Cliente/recrutador pode estar aguardando.</p>
      <p class="small" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.6; color: var(--muted, #6b7280);">Abrir WhatsApp: <a href="https://wa.me/${CONTACT_WHATSAPP_E164}" style="color: var(--brand1, #0038A8); text-decoration:none;">${CONTACT_WHATSAPP_HUMAN}</a></p>
    </td></tr>
    <tr><td class="footer" style="background-color: #0d0d0d; color: #aaa; text-align:center; padding:14px; font-size:12px; font-family: 'Segoe UI', Arial, sans-serif;">
      © ${new Date().getFullYear()} Portfólio Marcos Gabriel — Bot
    </td></tr>
  </table>
</body></html>`;
}

app.post('/send-email', apiLimiter, async (req, res) => {
  try {
    const nome = clampStr(req.body.nome);
    const email = clampStr(req.body.email);
    const phone = clampStr(req.body.phone);
    const mensagem = clampStr(req.body.mensagem);

    const phoneSanitized = sanitizePhone(phone);

    if (nome.length < 3 || nome.length > 50) return res.status(400).json({ error: 'O nome deve conter entre 3 e 50 caracteres.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'E-mail inválido.' });
    if (phoneSanitized.length < 10 || phoneSanitized.length > 15) return res.status(400).json({ error: 'O telefone deve conter 10 ou 11 dígitos (incluindo DDD).' });
    if (mensagem.length < 10 || mensagem.length > 1000) return res.status(400).json({ error: 'A mensagem deve conter entre 10 e 1000 caracteres.' });

    const mensagemHTML = brToHTML(mensagem);
    const safeNome = escapeHTML(nome);

    const htmlUser = `<!doctype html><html lang="pt-BR"><head>${baseHead}</head>
<body style="margin:0; background-color: var(--bg, #f6f9fc); font-family: 'Segoe UI', Arial, sans-serif;">
  <table class="container" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:auto; background-color: var(--card, #ffffff); border-radius:12px; box-shadow:0 4px 18px rgba(0,0,0,.08); overflow:hidden;">
    <tr><td class="header" style="background: #0038A8; background: linear-gradient(90deg, #0038A8, #00C2FF); padding: 22px; text-align: center; color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 700;">${FROM_NAME} — Desenvolvedor Full Stack</td></tr>
    <tr><td class="body" style="padding: 28px; color: var(--text, #111827); font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      <h3 style="margin:0 0 10px; color: var(--brand1, #0038A8);">Olá, ${safeNome}! 👋</h3>
      <p style="margin: 1em 0; color: var(--text, #111827);">Obrigado por entrar em contato! Recebi sua mensagem e <strong>vou te responder o quanto antes</strong> — pelo seu WhatsApp ou e-mail.</p>
      <p style="margin: 1em 0; color: var(--text, #111827);">Resumo do que você enviou:</p>
      <div class="blockquote" style="border-left:4px solid var(--brand2, #00C2FF); background-color: var(--chip, #f8fbff); padding:12px 16px; border-radius:8px; margin:18px 0; color: var(--text, #111827);">${mensagemHTML}</div>
      <p class="small" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.6; color: var(--muted, #6b7280);">Se precisar, meus contatos diretos:<br/>
        ✉️ <a href="mailto:${CONTACT_EMAIL}" style="color: var(--brand1, #0038A8); text-decoration:none;">${CONTACT_EMAIL}</a> •
        📱 <a href="https://wa.me/${CONTACT_WHATSAPP_E164}" style="color: var(--brand1, #0038A8); text-decoration:none;">WhatsApp ${CONTACT_WHATSAPP_HUMAN}</a>
      </p>
      <p class="small" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.6; color: var(--muted, #6b7280);">⚠️ <strong>Não responda este e-mail</strong> — é automático.</p>
    </td></tr>
    <tr><td class="footer" style="background-color: #0d0d0d; color: #aaa; text-align:center; padding:14px; font-size:12px; font-family: 'Segoe UI', Arial, sans-serif;">
      © ${new Date().getFullYear()} Marcos Gabriel — Todos os direitos reservados.
    </td></tr>
  </table>
</body></html>`;

    const htmlAdmin = emailAdminHTML({
      title: 'Nova Mensagem de Contato',
      nome, email, phone,
      mensagemHTML,
    });

    await Promise.all([
      transport.sendMail({
        from: `Marcos | Portfólio <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '📬 Mensagem recebida — já vou te retornar!',
        headers: { 'X-Auto-Response-Suppress': 'OOF, AutoReply' },
        html: htmlUser,
        text: `Olá, ${nome}!\n\nRecebi sua mensagem e vou te responder em breve pelo WhatsApp ou e-mail.\n\n"${mensagem}"\n\nContatos: ${CONTACT_EMAIL} • https://wa.me/${CONTACT_WHATSAPP_E164}\n\n— Marcos Gabriel`,
      }),
      transport.sendMail({
        from: `Portfólio | Bot Feedback <${process.env.EMAIL_USER}>`,
        to: ADMIN_EMAIL,
        subject: '📨 Nova mensagem — Portfólio',
        html: htmlAdmin,
      }),
    ]);

    console.log(`[MAIL] E-mail de contato enviado com sucesso (de ${email}).`);
    return res.status(200).json({ message: 'E-mails enviados com sucesso!' });
  } catch (error) {
    console.error('Erro em /send-email:', error.message);
    return res.status(500).json({ error: 'Erro interno ao enviar os e-mails. Tente novamente.' });
  }
});

app.post('/send-feedback', apiLimiter, async (req, res) => {
  try {
    const nome = clampStr(req.body.nome);
    const email = clampStr(req.body.email);
    const mensagem = clampStr(req.body.mensagem);

    if (nome.length < 3 || nome.length > 50) return res.status(400).json({ error: 'O nome deve ter entre 3 e 50 caracteres.' });
    if (!isEmail(email)) return res.status(400).json({ error: 'E-mail inválido.' });
    if (mensagem.length < 5 || mensagem.length > 500) return res.status(400).json({ error: 'A mensagem deve conter entre 5 e 500 caracteres.' });

    const mensagemHTML = brToHTML(mensagem);
    const safeNome = escapeHTML(nome);

    const htmlUser = `<!doctype html><html lang="pt-BR"><head>${baseHead}</head>
<body style="margin:0; background-color: var(--bg, #f6f9fc); font-family: 'Segoe UI', Arial, sans-serif;">
  <table class="container" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:auto; background-color: var(--card, #ffffff); border-radius:12px; box-shadow:0 4px 18px rgba(0,0,0,.08); overflow:hidden;">
    <tr><td class="header" style="background: #0038A8; background: linear-gradient(90deg, #0038A8, #00C2FF); padding: 22px; text-align: center; color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 700;">Feedback Recebido</td></tr>
    <tr><td class="body" style="padding: 28px; color: var(--text, #111827); font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; line-height: 1.6;">
      <h3 style="margin:0 0 10px; color: var(--brand1, #0038A8);">Olá, ${safeNome}!</h3>
      <p style="margin: 1em 0; color: var(--text, #111827);">Seu feedback foi recebido com sucesso. Muito obrigado por dedicar seu tempo para compartilhar sua opinião!</p>
      <p style="margin: 1em 0; color: var(--text, #111827);">Essas informações são valiosas e ajudam a melhorar continuamente a experiência do portfólio.</p>
      <p style="margin: 1em 0 0.5em 0; color: var(--text, #111827);">Seu feedback:</p>
      <div class="blockquote" style="border-left:4px solid var(--brand2, #00C2FF); background-color: var(--chip, #f8fbff); padding:12px 16px; border-radius:8px; margin:18px 0; color: var(--text, #111827);">${mensagemHTML}</div>
      <p class="small" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.6; color: var(--muted, #6b7280);">⚠️ <strong>Não responda este e-mail</strong> — ele é automático.</p>
      <p class="small" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 1.6; color: var(--muted, #6b7280);">Se quiser falar comigo futuramente:
        <br/>
        ✉️ <a href="mailto:${CONTACT_EMAIL}" style="color: var(--brand1, #0038A8); text-decoration:none;">${CONTACT_EMAIL}</a> •
        📱 <a href="https://wa.me/${CONTACT_WHATSAPP_E164}" style="color: var(--brand1, #0038A8); text-decoration:none;">WhatsApp ${CONTACT_WHATSAPP_HUMAN}</a>
      </p>
    </td></tr>
    <tr><td class="footer" style="background-color: #0d0d0d; color: #aaa; text-align:center; padding:14px; font-size:12px; font-family: 'Segoe UI', Arial, sans-serif;">
      © ${new Date().getFullYear()} Marcos Gabriel — Desenvolvedor Full Stack
    </td></tr>
  </table>
</body></html>`;

    const htmlAdmin = emailAdminHTML({
      title: 'Novo Feedback Recebido',
      nome, email, phone: '',
      mensagemHTML,
    });

    await Promise.all([
      transport.sendMail({
        from: `Marcos | Portfólio <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '💙 Obrigado pelo seu feedback!',
        html: htmlUser,
      }),
      transport.sendMail({
        from: `Portfólio | Bot Feedback <${process.env.EMAIL_USER}>`,
        to: ADMIN_EMAIL,
        subject: '📨 Novo feedback — Portfólio',
        html: htmlAdmin,
      }),
    ]);

    console.log(`[MAIL] E-mail de feedback enviado com sucesso (de ${email}).`);
    return res.status(200).json({ message: 'Feedback enviado com sucesso!' });
  } catch (error) {
    console.error('Erro em /send-feedback:', error.message);
    return res.status(500).json({ error: 'Erro ao enviar feedback. Tente novamente.' });
  }
});

app.get('/ping', (_req, res) => res.status(200).send('Pong! 🏓'));

if (process.env.PING_URL) {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const response = await axios.get(process.env.PING_URL);
      console.log(`[CRON] Ping enviado com sucesso. Status: ${response.status}`);
    } catch (error) {
      console.error('[CRON] Erro ao enviar ping:', error.message);
    }
  });
} else {
  console.log('[CRON] PING_URL não definida. O serviço de "keep-alive" está desativado.');
}

transport.verify()
  .then(() => {
    console.log('[MAIL] Transportador SMTP verificado e pronto.');
  })
  .catch(err => console.error('[MAIL] Falha ao verificar transportador:', err.message));
