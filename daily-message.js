const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const DATA_DIR = path.join(__dirname, 'data');
const MESSAGES_PATH = path.join(DATA_DIR, 'messages.json');
const HISTORY_PATH = path.join(DATA_DIR, 'history.json');

const TO_EMAIL = 'marcosgabriel79355@gmail.com';
const FROM_LABEL = 'Assistente Marcos';

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MESSAGES_PATH)) {
    fs.writeFileSync(MESSAGES_PATH, JSON.stringify({ verses: [], morning: [], midday: [], night: [] }, null, 2));
  }
  if (!fs.existsSync(HISTORY_PATH)) {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify({ months: {} }, null, 2));
  }
}

function readJSONSafe(filePath, fallbackObj) {
  try {
    if (!fs.existsSync(filePath)) return fallbackObj;
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return fallbackObj;
    return JSON.parse(raw);
  } catch {
    fs.writeFileSync(filePath, JSON.stringify(fallbackObj, null, 2));
    return fallbackObj;
  }
}

function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function monthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function pickUnique(list, usedSet) {
  const available = (list || []).filter(x => x?.id && !usedSet.has(x.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function titleByType(type) {
  if (type === 'morning') return '☀️ Bom dia';
  if (type === 'morning2') return '☀️ Bom dia (2)';
  if (type === 'midday') return '🌤️ Checkpoint do dia';
  return '🌙 Boa noite';
}

function buildEmail({ type, verse, msg }) {
  const title = titleByType(type);
  const subject = `${title} — ${FROM_LABEL}`;

  const preview = `${msg?.text || ''}`.slice(0, 90).replace(/\s+/g, ' ').trim();

  const accentByType = {
    morning: '#22c55e',
    morning2: '#22c55e',
    midday: '#f59e0b',
    night: '#60a5fa'
  };

  const accent = accentByType[type] || '#60a5fa';

  const verseBlock = verse
    ? `
      <tr>
        <td style="padding:0 0 14px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;background:#0b0f19;border:1px solid #1f2937;border-radius:16px;">
            <tr>
              <td style="padding:16px 16px 14px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#cbd5e1;">
                      <span style="display:inline-block;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#e5e7eb;padding:6px 10px;border-radius:999px;font-weight:700;">
                        📖 Palavra do dia
                      </span>
                    </td>
                    <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#94a3b8;font-weight:700;">
                      ${escapeHTML(verse.ref || '')}
                    </td>
                  </tr>
                </table>

                <div style="height:12px;line-height:12px;font-size:12px;">&nbsp;</div>

                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#e5e7eb;">
                  ${escapeHTML(verse.text || '')}
                </div>

                <div style="height:14px;line-height:14px;font-size:14px;">&nbsp;</div>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="height:3px;line-height:3px;font-size:3px;background:${accent};border-radius:999px;"></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : '';

  const html = `
  <!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="x-apple-disable-message-reformatting" />
      <meta name="color-scheme" content="light dark" />
      <meta name="supported-color-schemes" content="light dark" />
      <title>${escapeHTML(subject)}</title>
      <style>
        @media (prefers-color-scheme: light){
          body, .bg { background:#f6f7fb !important; }
          .container { background:#ffffff !important; border-color:#e5e7eb !important; }
          .muted { color:#475569 !important; }
          .text { color:#0f172a !important; }
          .card { background:#f8fafc !important; border-color:#e5e7eb !important; }
          .verse { background:#ffffff !important; border-color:#e5e7eb !important; }
          .chip { background:rgba(2,132,199,.10) !important; border-color:rgba(2,132,199,.20) !important; color:#0f172a !important; }
        }
      </style>
    </head>
    <body class="bg" style="margin:0;padding:0;background:#070a12;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${escapeHTML(preview)}&nbsp;&nbsp;— ${escapeHTML(FROM_LABEL)}
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#070a12;">
        <tr>
          <td align="center" style="padding:22px 14px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="border-collapse:separate;border-spacing:0;width:100%;max-width:640px;">

              <tr>
                <td style="padding:0 0 14px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;background:#0b0f19;border:1px solid #111827;border-radius:18px;">
                    <tr>
                      <td style="padding:18px 18px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                          <tr>
                            <td valign="middle">
                              <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:22px;color:#ffffff;font-weight:900;">
                                ${escapeHTML(title)}
                              </div>
                              <div style="height:6px;line-height:6px;font-size:6px;">&nbsp;</div>
                              <div class="muted" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#9ca3af;">
                                ${escapeHTML(FROM_LABEL)}
                              </div>
                            </td>
                            <td align="right" valign="middle" style="width:56px;">
                              <div style="width:42px;height:42px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);display:inline-block;line-height:42px;text-align:center;font-size:18px;">
                                ⭐
                              </div>
                            </td>
                          </tr>
                        </table>

                        <div style="height:14px;line-height:14px;font-size:14px;">&nbsp;</div>
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                          <tr>
                            <td style="height:3px;line-height:3px;font-size:3px;background:${accent};border-radius:999px;"></td>
                          </tr>
                        </table>

                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="container" style="border-collapse:separate;border-spacing:0;background:#0b0f19;border:1px solid #111827;border-radius:18px;">
                    <tr>
                      <td style="padding:20px 18px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;">
                          <tr>
                            <td style="padding:16px 16px;">
                              <div class="text" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#e5e7eb;font-weight:700;">
                                Mensagem
                              </div>
                              <div style="height:10px;line-height:10px;font-size:10px;">&nbsp;</div>
                              <div class="text" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#e5e7eb;">
                                ${escapeHTML(msg.text || '')}
                              </div>
                            </td>
                          </tr>
                        </table>

                        <div style="height:16px;line-height:16px;font-size:16px;">&nbsp;</div>

                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                          ${verseBlock}
                        </table>

                        <div style="height:6px;line-height:6px;font-size:6px;">&nbsp;</div>

                        <div class="muted" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#9ca3af;text-align:center;">
                          Feito pra você, Marcos. Um dia por vez. 💙
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:14px 0 0 0;">
                  <div class="muted" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;color:#6b7280;text-align:center;">
                    — ${escapeHTML(FROM_LABEL)}
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  const text = `${msg.text || ''}\n\n${verse ? `📖 ${verse.text || ''} (${verse.ref || ''})\n` : ''}\n— ${FROM_LABEL}`;
  return { subject, html, text };
}



function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markUsed(history, mKey, bucket, id) {
  history.months[mKey] ||= { verses: [], morning: [], morning2: [], midday: [], night: [] };
  history.months[mKey][bucket] ||= [];
  history.months[mKey][bucket].push(id);
}

async function sendDaily({ transport, type }) {
  ensureFiles();

  const messages = readJSONSafe(MESSAGES_PATH, { verses: [], morning: [], midday: [], night: [] });
  const history = readJSONSafe(HISTORY_PATH, { months: {} });

  const mKey = monthKey();
  history.months[mKey] ||= { verses: [], morning: [], morning2: [], midday: [], night: [] };

  const usedVerses = new Set(history.months[mKey].verses || []);
  const usedMsgs = new Set(history.months[mKey][type] || []);

  const msgList =
    type === 'morning' || type === 'morning2' ? (messages.morning || []) :
    type === 'midday' ? (messages.midday || []) :
    (messages.night || []);

  const verseList =
    (type === 'morning' || type === 'night') ? (messages.verses || []) : null;

  const verse = verseList ? pickUnique(verseList, usedVerses) : null;
  const msg = pickUnique(msgList, usedMsgs);

  if (!msg) {
    console.log(`[DAILY] Sem mensagens disponíveis para "${type}" neste mês. Adicione mais itens em data/messages.json`);
    return;
  }

  const email = buildEmail({ type, verse, msg });

  await transport.sendMail({
    from: `${FROM_LABEL} <${process.env.EMAIL_USER}>`,
    to: TO_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text
  });

  markUsed(history, mKey, type, msg.id);
  if (verse?.id) markUsed(history, mKey, 'verses', verse.id);

  writeJSON(HISTORY_PATH, history);

  console.log(`[DAILY] Enviado (${type}) -> ${TO_EMAIL}: msg=${msg.id}${verse?.id ? ` verse=${verse.id}` : ''}`);
}

function setupDailyMessageCron({ transport }) {
  cron.schedule('0 6 * * *', () => sendDaily({ transport, type: 'morning' }).catch(console.error));
  cron.schedule('0 7 * * *', () => sendDaily({ transport, type: 'morning2' }).catch(console.error));
  cron.schedule('30 11 * * *', () => sendDaily({ transport, type: 'midday' }).catch(console.error));
  cron.schedule('0 22 * * *', () => sendDaily({ transport, type: 'night' }).catch(console.error));
  console.log('[DAILY] Cron diário configurado (06:00, 07:00, 11:30, 22:00).');
}

async function sendTestNow({ transport, type = 'morning' }) {
  return sendDaily({ transport, type });
}

module.exports = { setupDailyMessageCron, sendTestNow };
