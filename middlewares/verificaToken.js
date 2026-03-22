const jwt = require('jsonwebtoken');
const SEGREDO_JWT = 'segredo-token';

module.exports = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ erro: "Token não fornecido." });

    jwt.verify(token, SEGREDO_JWT, (err, decoded) => {
        if (err) return res.status(401).json({ erro: "Token inválido." });
        req.usuario = decoded;
        next();
    });
};