require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const db = require("./database/database");

const authRoutes = require("./routes/auth");
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");

const {
    verificarToken,
    verificarAdmin
} = require("./middleware/auth");


const app = express();


// ======================================================
// CONFIGURAÇÃO
// ======================================================

const PORT = process.env.PORT || 3000;


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(cookieParser());


// ======================================================
// CORS
// ======================================================

const allowedOrigin = process.env.FRONTEND_URL;

if (allowedOrigin) {

    app.use(
        cors({
            origin: allowedOrigin,
            credentials: true
        })
    );

}


// ======================================================
// ARQUIVOS DO SITE
// ======================================================

const pastaPrincipal = path.join(__dirname, "..");

app.use(
    express.static(pastaPrincipal)
);


// ======================================================
// ROTAS DA API
// ======================================================

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/products",
    productsRoutes
);

app.use(
    "/api/orders",
    ordersRoutes
);


// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        status: "online",
        message: "A.roy_Store API funcionando."
    });

});


// ======================================================
// ROTA PRINCIPAL DA API
// ======================================================

app.get("/api", (req, res) => {

    res.json({
        success: true,
        message: "API A.roy_Store funcionando 🚀"
    });

});


// ======================================================
// TESTE DE PRODUTOS
// ======================================================

app.get("/api/products/teste-server", (req, res) => {

    res.json({
        success: true,
        message: "Rota direta do server funcionando!"
    });

});


// ======================================================
// TESTAR AUTENTICAÇÃO
// ======================================================

app.get(
    "/api/protected",
    verificarToken,
    (req, res) => {

        res.json({

            success: true,

            message: "Você está autenticado.",

            user: req.user

        });

    }
);


// ======================================================
// TESTAR ADMIN
// ======================================================

app.get(
    "/api/admin",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        res.json({

            success: true,

            message: "Acesso administrativo autorizado.",

            user: req.user

        });

    }
);


// ======================================================
// TESTE ABSOLUTO
// ======================================================

app.get(
    "/teste-absoluto",
    (req, res) => {

        res.send("SERVIDOR CORRETO");

    }
);


// ======================================================
// TRATAMENTO DE ERROS
// ======================================================

app.use(
    (err, req, res, next) => {

        console.error("Erro no servidor:", err);

        res.status(500).json({
            success: false,
            message: "Erro interno do servidor."
        });

    }
);


// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log("================================");
        console.log("       A.ROY_STORE");
        console.log("================================");
        console.log("");
        console.log(`🚀 Servidor iniciado na porta ${PORT}`);
        console.log(`🔐 API disponível em /api`);
        console.log("");
        console.log("================================");
        console.log("");

    }
);