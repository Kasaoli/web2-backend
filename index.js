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
            <head><title>API</title></head>
            <body style="font-family: sans-serif; padding: 50px; background: #f4f4f9;">
                <h1>Painel de Testes da API</h1>
                <p>Status: <strong id="status">Aguardando comando...</strong></p>
                
                <button onclick="gerarToken()" style="padding: 10px 20px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 5px;">
                    🔑 Gerar Token de Acesso
                </button>

                <div id="links" style="margin-top: 20px; display: none; border: 1px solid #ccc; padding: 15px; border-radius: 5px;">
                    <h3>Rotas Liberadas:</h3>
                    <ul>
                        <li><a id="linkItens" target="_blank" style="color: blue; text-decoration: none;">📂 Listar Itens (JSON)</a></li>
                        <li style="margin-top: 10px;"><a id="linkPdf" target="_blank" style="color: red; text-decoration: none;">📕 Baixar Lista em PDF</a></li>
                    </ul>
                    <hr>
                    <p><strong>Seu Token Atual:</strong></p>
                    <code id="tokenValue" style="word-break: break-all; background: #eee; padding: 5px; display: block;"></code>
                </div>

                <script>
                    async function gerarToken() {
                        const statusElement = document.getElementById('status');
                        statusElement.innerText = "Tentando logar...";

                        try {
                            const response = await fetch('/logar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: "pessoa@email.com", senha: "123" })
                            });

                            const data = await response.json();

                            if (data.token) {
                                statusElement.innerText = "✅ Logado com sucesso!";
                                statusElement.style.color = "green";
                                
                                document.getElementById('tokenValue').innerText = data.token;
                                document.getElementById('linkItens').href = '/itens?token=' + data.token;
                                document.getElementById('linkPdf').href = '/download/itens?token=' + data.token;
                                document.getElementById('links').style.display = 'block';
                            } else {
                                // Se cair aqui, é porque a API barrou (ex: final de semana)
                                statusElement.innerText = "❌ Erro: " + (data.erro || "Falha desconhecida");
                                statusElement.style.color = "red";
                                alert("Erro da API: " + (data.erro || "Verifique o console"));
                            }
                        } catch (err) {
                            statusElement.innerText = "❌ Erro de conexão com o servidor.";
                            console.error(err);
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