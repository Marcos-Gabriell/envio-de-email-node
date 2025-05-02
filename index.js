const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
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

// Servir imagens locais (pasta "img")
app.use('/img', express.static(path.join(__dirname, 'img')));

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

// NOVA ROTA IMPACTO360 COM MELHORIAS
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
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #0d0d0d;
            color: #ffffff;
            padding: 20px;
          }
          .container {
            background-color: #1a1a1a;
            border-radius: 12px;
            padding: 30px;
            max-width: 600px;
            margin: 0 auto;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.05);
          }
          .logo {
            text-align: center;
            margin-bottom: 30px;
          }
          h1 {
            font-size: 26px;
            color: #ffffff;
            text-align: center;
          }
          p {
            font-size: 16px;
            line-height: 1.6;
            margin: 16px 0;
          }
          .emoji {
            font-size: 20px;
            margin-right: 5px;
          }
          .assinatura {
            font-weight: bold;
            color: #00cfff;
            margin-top: 20px;
          }
          .telefone {
            color: #00aaff;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            font-size: 13px;
            color: #bbbbbb;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="cid:logo" alt="Impacto360" width="100" />
          </div>
          <h1>Que bom ter você por aqui! 💡</h1>
          <p><span class="emoji">👋</span>Olá, ${nome}!</p>
          <p>
            Muito obrigado por demonstrar interesse nos serviços da <strong>Impacto360</strong>.
            É um prazer saber que você se conectou com o que fazemos.
          </p>
          <p>
            <span class="emoji">🚀</span>Somos uma empresa movida por criatividade, estratégia e inovação.
            Nossa missão é gerar valor real para marcas que querem se destacar e impactar de verdade.
          </p>
            <p>
                Em breve, alguém da nossa equipe entrará em contato com você.
                Estamos ansiosos para entender como podemos contribuir com o seu projeto.
             </p>

          <p class="assinatura">
            Com atitude e propósito,<br>
            Equipe Impacto360
          </p>
           <div class="footer">© Impacto360 - Todos os direitos reservados</div>
        </div>
      </body>
    </html>`;

    transport.sendMail({
        from: "Impacto360 <impacto360@email.com>",
        to: email,
        subject: 'Obrigado pelo seu interesse na Impacto360!',
        html,
        attachments: [
            {
                filename: 'logo.png',
                path: path.join(__dirname, 'img/logo1.png'),
                cid: 'logo'
            }
        ]
    })
    .then(() => res.status(200).send('Email enviado com sucesso!'))
    .catch((error) => {
        console.error('Erro ao enviar email:', error);
        res.status(500).send('Erro ao enviar email');
    });
});


// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
