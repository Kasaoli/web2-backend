const express = require('express');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');

const verificaDiaSemana = require('./middlewares/verificaDiaSemana');
const { registraLog, registrosLogs } = require('./middlewares/registraLog');
const verificaToken = require('./middlewares/verificaToken');

const app = express();
app.use(express.json());

const SEGREDO_JWT = 'segredo-token';

let usuarios = [{ email: "pessoa@email.com", senha: "123" }];
let itens = [
    { codigo: 1, nome: "Notebook", preco: 3500 },
    { codigo: 2, nome: "Mouse", preco: 150 }
];

app.use(verificaDiaSemana);
app.use(registraLog);

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>API Backend - Painel</title></head>
            <body style="font-family: sans-serif; padding: 40px; line-height: 1.6; background-color: #f4f4f9;">
                <div style="max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1>API Express - Painel de Controle</h1>
                    <button id="btnAuth" onclick="gerarToken()" style="padding: 12px; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: bold;">
                        Autenticar e Liberar Rotas
                    </button>

                    <div id="secaoLinks" style="display: none; margin-top: 30px;">
                        <p><strong>Token Gerado:</strong> <small id="tokenDisplay" style="color: #666; word-break: break-all;"></small></p>
                        <hr>
                        
                        <h3>1. Consultas (GET):</h3>
                        <ul>
                            <li><a id="linkItens" target="_blank">Listar Todos os Itens</a></li>
                            <li><a id="linkLogs" target="_blank">Ver Logs de Hoje</a></li>
                            <li><a id="linkPdf" target="_blank" style="color: red; font-weight: bold;">Baixar PDF de Itens</a></li>
                        </ul>

                        <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                            <label><strong>Buscar Item por Código:</strong></label><br>
                            <input type="number" id="buscarCodigo" placeholder="Ex: 1" style="width: 80px; padding: 5px;">
                            <button onclick="executarBusca()" style="background: #2196f3; color: white; border: none; padding: 5px 15px; border-radius: 3px; cursor: pointer;">Visualizar Item</button>
                        </div>

                        <hr>
                        <h3>2. Inserir Item (POST):</h3>
                        <div style="background: #e9ecef; padding: 15px; border-radius: 5px;">
                            <input type="number" id="postCodigo" placeholder="Código" style="width: 80px;">
                            <input type="text" id="postNome" placeholder="Nome do Produto">
                            <input type="number" id="postPreco" placeholder="Preço">
                            <button onclick="executarPost()" style="background: #007bff; color: white; border: none; padding: 5px 15px; border-radius: 3px; cursor: pointer;">Adicionar</button>
                        </div>

                        <hr>
                        <h3>3. Remover Item (DELETE):</h3>
                        <div style="background: #f8d7da; padding: 15px; border-radius: 5px;">
                            <input type="number" id="deleteCodigo" placeholder="Código para excluir">
                            <button onclick="executarDelete()" style="background: #dc3545; color: white; border: none; padding: 5px 15px; border-radius: 3px; cursor: pointer;">Excluir</button>
                        </div>
                    </div>
                </div>

                <script>
                    let tokenAtivo = "";

                    async function gerarToken() {
                        const response = await fetch('/logar', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: "pessoa@email.com", senha: "123" })
                        });
                        const data = await response.json();

                        if (data.token) {
                            tokenAtivo = data.token;
                            const hoje = new Date().toISOString().split('T')[0];

                            document.getElementById('linkItens').href = '/itens?token=' + tokenAtivo;
                            document.getElementById('linkLogs').href = '/logs/' + hoje + '?token=' + tokenAtivo;
                            document.getElementById('linkPdf').href = '/download/itens?token=' + tokenAtivo;

                            document.getElementById('tokenDisplay').innerText = tokenAtivo;
                            document.getElementById('secaoLinks').style.display = 'block';
                            document.getElementById('btnAuth').innerText = "Autenticado";
                        } else {
                            alert("Erro ao logar: " + (data.erro || "Verifique o console"));
                        }
                    }

                    function executarBusca() {
                        const cod = document.getElementById('buscarCodigo').value;
                        if(!cod) return alert("Digite um código");
                        window.open('/itens/' + cod + '?token=' + tokenAtivo, '_blank');
                    }

                    async function executarPost() {
                        const codigo = document.getElementById('postCodigo').value;
                        const nome = document.getElementById('postNome').value;
                        const preco = document.getElementById('postPreco').value;

                        const response = await fetch('/itens?token=' + tokenAtivo, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ codigo: parseInt(codigo), nome, preco: parseFloat(preco) })
                        });

                        const resData = await response.json();
                        alert(resData.mensagem || resData.erro);
                    }

                    async function executarDelete() {
                        const codigo = document.getElementById('deleteCodigo').value;
                        const response = await fetch('/itens/' + codigo + '?token=' + tokenAtivo, {
                            method: 'DELETE'
                        });
                        const resData = await response.json();
                        alert(resData.mensagem || resData.erro);
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

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Local: http://localhost:3000'));
}

module.exports = app;