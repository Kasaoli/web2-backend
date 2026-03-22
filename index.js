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
            <head><title>API Backend - Painel</title></head>
            <body style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
                <h1>🚀 API Express - Painel de Controle</h1>
                <button onclick="gerarToken()" style="padding: 12px; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px;">
                    🔑 Autenticar e Liberar Rotas
                </button>

                <div id="secaoLinks" style="display: none; margin-top: 30px;">
                    <h3>📂 Rotas Disponíveis (GET):</h3>
                    <ul>
                        <li><a id="linkItens" target="_blank">Listar Todos os Itens</a></li>
                        <li><a id="linkItemUnico" target="_blank">Buscar Item (Código 1)</a></li>
                        <li><a id="linkLogs" target="_blank">Ver Logs de Hoje</a></li>
                        <li><a id="linkPdf" target="_blank" style="color: red; font-weight: bold;">📥 Baixar PDF de Itens</a></li>
                    </ul>
                    <p><strong>Token Gerado:</strong> <small id="tokenDisplay" style="color: #666;"></small></p>
                </div>

                <script>
                    async function gerarToken() {
                        const response = await fetch('/logar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: "pessoa@email.com", senha: "123" })
                        });
                        const data = await response.json();

                        if (data.token) {
                            const t = data.token;
                            const hoje = new Date().toISOString().split('T')[0];

                            // Atualiza os links injetando o token na URL
                            document.getElementById('linkItens').href = '/itens?token=' + t;
                            document.getElementById('linkItemUnico').href = '/itens/1?token=' + t;
                            document.getElementById('linkLogs').href = '/logs/' + hoje + '?token=' + t;
                            document.getElementById('linkPdf').href = '/download/itens?token=' + t;

                            document.getElementById('tokenDisplay').innerText = t;
                            document.getElementById('secaoLinks').style.display = 'block';
                            alert("Sucesso! Rotas liberadas.");
                        } else {
                            alert("Erro ao logar: " + (data.erro || "Verifique o console"));
                        }
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