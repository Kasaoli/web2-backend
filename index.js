const express = require('express');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

// --- Importando os Middlewares ---
const verificaDiaSemana = require('./middlewares/verificaDiaSemana');
const { registraLog, registrosLogs } = require('./middlewares/registraLog');
const verificaToken = require('./middlewares/verificaToken');

const app = express();
app.use(express.json());

const SEGREDO_JWT = 'segredo-token';

// --- DADOS MOCKADOS ---
let usuarios = [{ email: "pessoa@email.com", senha: "123" }];
let itens = [
    { codigo: 1, nome: "Notebook", preco: 3500 },
    { codigo: 2, nome: "Mouse", preco: 150 }
];

// --- Usando os Middlewares Globais ---
app.use(verificaDiaSemana);
app.use(registraLog);

// --- ROTAS ---

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>API do Aluno</title></head>
            <body style="font-family: sans-serif; padding: 50px;">
                <h1>Painel de Testes da API</h1>
                <p>Use o botão abaixo para gerar um token e liberar os links:</p>
                
                <button onclick="gerarToken()" style="padding: 10px; cursor: pointer;">
                    🔑 Gerar Token de Acesso
                </button>

                <div id="links" style="margin-top: 20px; display: none;">
                    <h3>Rotas Liberadas:</h3>
                    <ul>
                        <li><a id="linkItens" target="_blank">Listar Itens (JSON)</a></li>
                        <li><a id="linkPdf" target="_blank">Baixar Lista em PDF</a></li>
                    </ul>
                    <p><strong>Seu Token:</strong> <code id="tokenValue" style="word-break: break-all;"></code></p>
                </div>

                <script>
                    async function gerarToken() {
                        const response = await fetch('/logar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: "aluno@ifce.edu.br", senha: "123" })
                        });
                        const data = await response.json();
                        const token = data.token;

                        document.getElementById('tokenValue').innerText = token;
                        document.getElementById('linkItens').href = '/itens?token=' + token;
                        document.getElementById('linkPdf').href = '/download/itens?token=' + token;
                        document.getElementById('links').style.display = 'block';
                    }
                </script>
            </body>
        </html>
    `);
});

app.post('/logar', (req, res) => {
    const { email, senha } = req.body;
    const usuarioValido = usuarios.find(u => u.email === email && u.senha === senha);
    
    if (!usuarioValido) return res.status(401).json({ erro: "Email ou senha inválidos." });

    const token = jwt.sign({ email }, SEGREDO_JWT, { expiresIn: '1h' });
    res.json({ mensagem: "Login efetuado com sucesso!", token });
});

app.get('/logs/:data', verificaToken, (req, res) => {
    const { data } = req.params; 
    const logsFiltrados = registrosLogs.filter(log => log.data === data);
    res.json(logsFiltrados);
});

app.get('/download/itens', verificaToken, (req, res) => {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=lista_de_itens.pdf');
    doc.pipe(res);
    doc.fontSize(20).text('Lista de Itens', { align: 'center' }).moveDown();
    itens.forEach(item => {
        doc.fontSize(14).text(`Código: ${item.codigo} | Nome: ${item.nome} | R$ ${item.preco}`).moveDown(0.5);
    });
    doc.end();
});

app.get('/itens', verificaToken, (req, res) => res.json(itens));

app.get('/itens/:codigo', verificaToken, (req, res) => {
    const item = itens.find(i => i.codigo === parseInt(req.params.codigo));
    if (!item) return res.status(404).json({ erro: "Item não encontrado." });
    res.json(item);
});

app.post('/itens', verificaToken, (req, res) => {
    const { codigo, nome, preco } = req.body;
    if (itens.find(i => i.codigo === codigo)) return res.status(400).json({ erro: "Código já existe." });

    const novoItem = { codigo, nome, preco };
    itens.push(novoItem);
    res.status(201).json({ mensagem: "Item adicionado!", item: novoItem });
});

app.delete('/itens/:codigo', verificaToken, (req, res) => {
    const index = itens.findIndex(i => i.codigo === parseInt(req.params.codigo));
    if (index === -1) return res.status(404).json({ erro: "Item não encontrado." });
    
    itens.splice(index, 1);
    res.json({ mensagem: "Item excluído com sucesso!" });
});

// --- INICIALIZANDO O SERVIDOR ---
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Servidor local rodando em http://localhost:${PORT}`);
    });
}

module.exports = app;