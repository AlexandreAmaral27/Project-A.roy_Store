require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const db = require("./database/database");

const authRoutes = require("./routes/auth");

const {
    verificarToken,
    verificarAdmin
} = require("./middleware/auth");


const app = express();

const PORT =
    process.env.PORT || 3000;


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(cookieParser());

app.use(cors({
    origin: true,
    credentials: true
}));


// ======================================================
// ARQUIVOS DO SITE
// ======================================================

const pastaPrincipal =
    path.join(__dirname, "..");

app.use(
    express.static(pastaPrincipal)
);


// ======================================================
// ROTAS
// ======================================================

app.use(
    "/api/auth",
    authRoutes
);


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
// INICIAR SERVIDOR
// ======================================================

app.listen(
    PORT,
    () => {

        console.log("");
        console.log("================================");
        console.log("   A.ROY_STORE BACKEND");
        console.log("================================");
        console.log("");
        console.log(
            `🚀 Servidor: http://localhost:${PORT}`
        );
        console.log("");
        console.log(
            `🛍️ Site: http://localhost:${PORT}`
        );
        console.log("");
        console.log(
            `🔐 API: http://localhost:${PORT}/api`
        );
        console.log("");
        console.log("================================");
        console.log("");

    }
);
        //    a.ROY_STORE

const authRoutes = require("./routes/auth");

app.use("/api/auth", authRoutes);

const cookieParser = require("cookie-parser");

app.use(cookieParser());