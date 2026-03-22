const jwt = require('jsonwebtoken');
const SEGREDO_JWT = 'segredo-token';

module.exports = (req, res, next) => {
    // Tenta pegar o token do Header OU da URL (query string)
    let token = req.headers['authorization'] || req.query.token;

    if (!token) return res.status(401).json({ erro: "Token não fornecido." });

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    jwt.verify(token, SEGREDO_JWT, (err, decoded) => {
        if (err) return res.status(401).json({ erro: "Token inválido." });
        req.usuario = decoded;
        next();
    });
};