const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

// Configuração do CORS
const corsOptions = {
    origin: '*',  // Permite qualquer origem
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};
app.use(cors(corsOptions));  // Aplica as opções de CORS

// Adicionando manualmente os headers do CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');  // Permite qualquer origem
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); // Permite esses métodos
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept'); // Permite esses cabeçalhos
    next();
});

// Middleware para interpretar o corpo da requisição
app.use(bodyParser.json());

// Configuração do nodemailer
const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,   // Carrega o e-mail da variável de ambiente
        pass: process.env.EMAIL_PASS,
    }
});

// Rota para enviar o email
app.post('/send-email', (req, res) => {
    const { nome, email, mensagem } = req.body;

    // Verifica se os dados foram enviados
    if (!nome || !email || !mensagem) {
        return res.status(400).send('Nome, email e mensagem são obrigatórios');
    }

    // Envia o email
    transport.sendMail({
        from: "Marcos Gabriel <marcosgabrielemail3@gmail.com>",
        to: email,  // Aqui pode ser para seu email ou qualquer destinatário
        subject: 'Mensagem recebida!',
        html: `
        <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f8f9fa;
                        color: #333;
                        text-align: center;
                        padding: 20px;
                    }
                    .container {
                        background-color: #fff;
                        border-radius: 8px;
                        box-shadow: 0 4px 8px #055e05;
                        padding: 30px;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    h1 {
                        color: #055e05;
                    }
                    p {
                        font-size: 18px;
                        line-height: 1.6;
                    }
                    .footer {
                        margin-top: 30px;
                        font-size: 14px;
                        color: #aaa;
                    }
                    .social-links a {
                        margin: 5px;
                        text-decoration: none;
                        color: #055e05;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Olá, ${nome}!</h1>
                    <p>Recebemos sua mensagem: <strong>"${mensagem}"</strong></p>
                    <p>Em breve, entraremos em contato com você!</p>
                    <p>Para saber mais sobre mim e meu trabalho, veja meus perfis:</p>
                    <p class="social-links">
                        <a href="https://github.com/Marcos-Gabriell" target="_blank">GitHub</a> | 
                        <a href="https://www.linkedin.com/in/marcosgabriel-dev/" target="_blank">LinkedIn</a> 
                    </p>
                    <p class="footer">Obrigado pelo contato!<br>Atenciosamente, <strong>Marcos Gabriel</strong></p>
                </div>
            </body>
        </html>`,
        text: `Olá, ${nome}! Recebemos sua mensagem: "${mensagem}", e em breve entraremos em contato com você.
    
    Para saber mais sobre mim, veja meus perfis:
    - GitHub: https://github.com/Marcos-Gabriell
    - LinkedIn: https://www.linkedin.com/in/marcosgabriel-dev/`
    })
    .then(() => {
        res.status(200).send('Email enviado com sucesso!');
    })
    .catch((error) => {
        console.error('Erro ao enviar email:', error);
        res.status(500).send('Erro ao enviar email');
    });
});

// Inicialização do servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
