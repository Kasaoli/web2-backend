const registrosLogs = [];

const registraLog = (req, res, next) => {
    const agora = new Date();
    const dataFormatada = agora.toISOString().split('T')[0]; 
    const horarioFormatado = agora.toTimeString().split(' ')[0];

    registrosLogs.push({
        data: dataFormatada,
        horario: horarioFormatado,
        rota: req.path,
        metodo: req.method
    });
    
    next();
};

module.exports = { registraLog, registrosLogs };