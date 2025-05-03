const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = 3001;

// CORS Config
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(bodyParser.json());

// Configurar o transporte
const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

const verifyRecaptcha = async (token) => {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const response = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify`,
        null,
        {
            params: {
                secret: secret,
                response: token,
            },
        }
    );
    return response.data.success;
};


// ROTA ORIGINAL
app.post('/send-email', (req, res) => {
    const { nome, email, mensagem } = req.body;

    if (!nome || !email || !mensagem) {
        return res.status(400).send('Nome, email e mensagem são obrigatórios');
    }

    const mensagemFormatada = mensagem.replace(/\n/g, "<br>");

    transport.sendMail({
        from: "Marcos Gabriel <marcosgabrielemail3@gmail.com>",
        to: email,
        subject: 'Mensagem recebida!',
        html: `
            <html>
                <body>
                    <div style="font-family: Arial; padding: 20px;">
                        <h2>Olá, ${nome}!</h2>
                        <p>Recebemos sua mensagem: <strong>"${mensagemFormatada}"</strong></p>
                        <p>Em breve entraremos em contato com você.</p>
                        <p>
                            <a href="https://github.com/Marcos-Gabriell">GitHub</a> |
                            <a href="https://www.linkedin.com/in/marcosgabriel-dev/">LinkedIn</a>
                        </p>
                        <p>Obrigado!<br><strong>Marcos Gabriel</strong></p>
                    </div>
                </body>
            </html>`,
        text: `Olá, ${nome}!\n\nRecebemos sua mensagem:\n"${mensagem}"\n\nEm breve entraremos em contato com você.`
    })
    .then(() => res.status(200).send('Email enviado com sucesso!'))
    .catch((error) => {
        console.error('Erro ao enviar email:', error);
        res.status(500).send('Erro ao enviar email');
    });
});

// NOVA ROTA IMPACTO360
app.post('/impacto360-email', async (req, res) => {
    const { nome, email, phone, token } = req.body;

    if (!nome || !email || !phone || !token) {
        return res.status(400).send('Nome, e-mail, telefone e token do reCAPTCHA são obrigatórios.');
    }

    const captchaValido = await verifyRecaptcha(token);
    if (!captchaValido) {
        return res.status(403).send('Falha na verificação do reCAPTCHA.');
    }


    const htmlUsuario = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Impacto360</title>
      </head>
      <body style="margin:0; padding:0; background-color:#0d0d0d;">
        <table align="center" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d0d; font-family:Arial, sans-serif;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a; border-radius:12px; padding:30px; color:#ffffff;">
                <tr>
                  <td align="center" style="padding-bottom:30px;">
                    <img src="cid:logo1" alt="Impacto360" width="100" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size:32px; font-weight:bold; color:#00C2FF; padding-bottom: 20px;">
                    Que bom ter você por aqui! 💡
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:20px; font-size:16px;">
                    👋 Olá, <strong>${nome}</strong>!
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:20px; font-size:16px; line-height:1.6;">
                    Muito obrigado por demonstrar interesse nos serviços da <strong>Impacto360</strong>. É um prazer saber que você se conectou com o que fazemos.
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:20px; font-size:16px; line-height:1.6;">
                    🚀 Somos uma empresa movida por criatividade, estratégia e inovação. Nossa missão é gerar valor real para marcas que querem se destacar e impactar de verdade.
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:20px; font-size:16px; line-height:1.6;">
                    Em breve, alguém da nossa equipe entrará em contato com você. Estamos ansiosos para entender como podemos somar ao seu projeto.
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:30px; font-weight:bold; color:#00C2FF; font-size:16px;">
                    Com atitude e propósito,<br>Equipe Impacto360
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:40px; font-size:14px; color:#cccccc; text-align:center;">
                    © 2025 Impacto360 - Todos os direitos reservados
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;

    const htmlAdmin = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>📩 Novo interesse recebido no site</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefone:</strong> ${phone}</p>
        <p style="margin-top: 20px; color: #555;">Esse é um e-mail automático gerado pelo site Impacto360.</p>
      </body>
    </html>`;

    // Envia para o usuário
    const envioUsuario = transport.sendMail({
        from: "Impacto360 <impacto360@email.com>",
        to: email,
        subject: 'Obrigado pelo seu interesse na Impacto360!',
        html: htmlUsuario,
        attachments: [
            {
                filename: 'logo1.png',
                path: __dirname + '/img/logo1.png',
                cid: 'logo1'
            }
        ]
    });

    // Envia para o admin
    const envioAdmin = transport.sendMail({
        from: "Impacto360 <impacto360@email.com>",
        to: process.env.EMAIL_USER, // Seu e-mail de admin
        subject: '📢 Novo interesse no site Impacto360',
        html: htmlAdmin
    });

    Promise.all([envioUsuario, envioAdmin])
        .then(() => res.status(200).send('Email enviado com sucesso!'))
        .catch((error) => {
            console.error('Erro ao enviar email:', error);
            res.status(500).send('Erro ao enviar email');
        });
});


// NOVA ROTA FEEDBACK
app.post('/feedback-email', (req, res) => {
  const {nome, email, mensagem } = req.body;

  if (!nome || !email || !mensagem) {
      return res.status(400).send('Nome, Email e mensagem são obrigatórios');
  }

  const mensagemFormatada = mensagem.replace(/\n/g, '<br>');

  // HTML para o usuário
  const htmlUsuario = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
      <meta charset="UTF-8" />
      <title>Feedback Recebido - Impacto360</title>
  </head>
  <body style="margin:0; padding:0; background-color:#0d0d0d;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d0d; font-family:Arial, sans-serif;">
          <tr>
              <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a; border-radius:12px; padding:30px; color:#ffffff;">
                      <tr>
                          <td align="center" style="padding-bottom:30px;">
                              <img src="cid:logo1" alt="Impacto360" width="100" />
                          </td>
                      </tr>
                      <tr>
                          <td align="center" style="font-size:28px; font-weight:bold; color:#00C2FF; padding-bottom: 20px;">
                              Agradecemos pelo seu feedback! 🙌
                          </td>
                      </tr>
                      <tr>
                          <td style="font-size:16px; line-height:1.6;">👋 Olá, <strong>${nome}</strong>!</td>
                      </tr>
                      <tr>
                          <td style="font-size:16px; line-height:1.6; padding-top:10px;">
                              Sua opinião é muito importante para nós. Veja abaixo a mensagem que recebemos:
                          </td>
                      </tr>
                      <tr>
                          <td style="background-color:#2a2a2a; margin-top:20px; padding:20px; border-radius:8px; font-size:15px; line-height:1.6; color:#e0e0e0; margin-bottom:20px;">
                              ${mensagemFormatada}
                          </td>
                      </tr>
                      <tr>
                          <td style="font-size:16px; line-height:1.6; padding-top:20px;">
                              💡 Estamos em constante evolução e sua contribuição nos ajuda a melhorar nossos serviços e experiências.
                          </td>
                      </tr>
                      <tr>
                          <td style="font-size:16px; line-height:1.6; padding-top:20px;">
                              Obrigado por fazer parte da jornada da <strong>Impacto360</strong>.
                          </td>
                      </tr>
                      <tr>
                          <td style="padding-top:30px; font-weight:bold; color:#00C2FF; font-size:16px;">
                              Com atitude e propósito,<br>Equipe Impacto360
                          </td>
                      </tr>
                      <tr>
                          <td style="padding-top:40px; font-size:14px; color:#cccccc; text-align:center;">
                              © 2025 Impacto360 - Todos os direitos reservados
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>
  </body>
  </html>`;

  // HTML para o admin
  const htmlAdmin = `
  <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>📥 Novo feedback recebido no site</h2>
      <p><strong>Nome do usuário:</strong> ${nome}</p>
      <p><strong>Email do usuário:</strong> ${email}</p>
      <p><strong>Mensagem:</strong></p>
      <div style="background-color: #f0f0f0; padding: 15px; border-left: 4px solid #00C2FF; border-radius: 6px;">
        ${mensagemFormatada}
      </div>
      <p style="margin-top: 20px; color: #555;">Esse é um e-mail automático gerado pelo site Impacto360.</p>
    </body>
  </html>`;


  // E-mail para o usuário
  const emailParaUsuario = transport.sendMail({
      from: 'Impacto360 <impacto360@email.com>',
      to: email,
      subject: 'Feedback recebido com sucesso!',
      html: htmlUsuario,
      attachments: [
          {
              filename: 'logo1.png',
              path: __dirname + '/img/logo1.png',
              cid: 'logo1'
          }
      ]
  });

  // E-mail para o admin
  const emailParaAdmin = transport.sendMail({
      from: 'Impacto360 <impacto360@email.com>',
      to: process.env.EMAIL_USER, // Substitua pelo e-mail real do admin
      subject: '📢 Novo feedback recebido no site',
      html: htmlAdmin
  });

  // Envia ambos e responde
  Promise.all([emailParaUsuario, emailParaAdmin])
      .then(() => res.status(200).send('Feedback enviado com sucesso!'))
      .catch((error) => {
          console.error('Erro ao enviar email de feedback:', error);
          res.status(500).send('Erro ao enviar email de feedback');
      });
});


// Rota de ping
app.get('/ping', (req, res) => {
    res.status(200).send('Pong!');
});

// CRON JOB - Mantém o servidor "vivo" com ping automático a cada 10 minutos
cron.schedule('*/10 * * * *', async () => {
  try {
    await axios.get('https://envio-de-email-portifolio.onrender.com/ping');
      console.log('[CRON] Ping enviado com sucesso.');
  } catch (error) {
      console.error('[CRON] Erro ao enviar ping:', error.message);
  }
});

// Start
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
