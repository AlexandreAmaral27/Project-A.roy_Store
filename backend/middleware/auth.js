const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {

    try {

        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Não autenticado."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Sessão inválida ou expirada."
        });

    }

}

function verificarAdmin(req, res, next) {

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Não autenticado."
        });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Acesso reservado ao administrador."
        });
    }

    next();
}

module.exports = {
    verificarToken,
    verificarAdmin
};