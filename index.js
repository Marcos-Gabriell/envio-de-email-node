const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
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
app.post('/impacto360-email', (req, res) => {
    const { nome, email, phone } = req.body;

    if (!nome || !email || !phone) {
        return res.status(400).send('Nome, e-mail e telefone são obrigatórios');
    }

    const html = `
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

    transport.sendMail({
        from: "Impacto360 <impacto360@email.com>",
        to: email,
        subject: 'Obrigado pelo seu interesse na Impacto360!',
        html,
        attachments: [
            {
                filename: 'logo1.png',
                path: __dirname + '/img/logo1.png',
                cid: 'logo1'
            }
        ]
    })
    .then(() => res.status(200).send('Email enviado com sucesso!'))
    .catch((error) => {
        console.error('Erro ao enviar email:', error);
        res.status(500).send('Erro ao enviar email');
    });
});

// CRON JOB - Envio de e-mail a cada 10 minutos
cron.schedule('*/10 * * * *', async () => {
    console.log('Executando ping automático por e-mail...');

    try {
        await transport.sendMail({
            from: 'Ping Render <ping@impacto360.com>',
            to: process.env.EMAIL_USER,
            subject: 'Ping automático - Servidor ativo',
            text: 'Este é um e-mail automático enviado a cada 10 minutos para manter o servidor ativo.',
        });

        console.log('Ping enviado com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar ping automático:', error.message);
    }
});

// Start
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
