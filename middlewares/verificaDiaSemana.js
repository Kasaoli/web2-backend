module.exports = (req, res, next) => {
    const diaDaSemana = new Date().getDay(); // 0 = Domingo, 6 = Sábado
    /*if (diaDaSemana === 0 || diaDaSemana === 6) {
        return res.status(403).json({ erro: "A API só funciona de segunda a sexta-feira." });
    }
    next();*/
};