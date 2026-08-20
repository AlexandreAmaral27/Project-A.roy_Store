const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../database/database");

const router = express.Router();


// ======================================================
// REGISTAR USUÁRIO
// ======================================================

router.post("/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;

        // Verificar campos
        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "Preencha todos os campos."
            });

        }

        // Verificar tamanho da senha
        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message: "A palavra-passe deve ter pelo menos 6 caracteres."
            });

        }

        const emailNormalizado =
            email.trim().toLowerCase();

        // Verificar se email já existe
        const usuarioExistente = db.prepare(`
            SELECT id
            FROM users
            WHERE email = ?
        `).get(emailNormalizado);

        if (usuarioExistente) {

            return res.status(409).json({
                success: false,
                message: "Este email já está registado."
            });

        }

        // Criar hash da senha
        const passwordHash =
            await bcrypt.hash(password, 12);

        // Inserir usuário
        const resultado = db.prepare(`
            INSERT INTO users
            (name, email, password, role)
            VALUES (?, ?, ?, ?)
        `).run(
            name.trim(),
            emailNormalizado,
            passwordHash,
            "customer"
        );

        return res.status(201).json({
            success: true,
            message: "Conta criada com sucesso.",
            user: {
                id: resultado.lastInsertRowid,
                name: name.trim(),
                email: emailNormalizado,
                role: "customer"
            }
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Erro ao criar conta."
        });

    }

});


// ======================================================
// LOGIN
// ======================================================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Digite o email e a palavra-passe."
            });

        }

        const emailNormalizado =
            email.trim().toLowerCase();

        // Procurar usuário
        const user = db.prepare(`
            SELECT *
            FROM users
            WHERE email = ?
        `).get(emailNormalizado);

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "Email ou palavra-passe incorretos."
            });

        }

        // Comparar senha
        const senhaCorreta =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!senhaCorreta) {

            return res.status(401).json({
                success: false,
                message: "Email ou palavra-passe incorretos."
            });

        }

        // Criar token
        const token = jwt.sign(
            {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        // Guardar token em cookie
        res.cookie(
            "token",
            token,
            {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000
            }
        );

        return res.json({

            success: true,

            message: "Login realizado com sucesso.",

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Erro ao realizar login."
        });

    }

});


// ======================================================
// LOGOUT
// ======================================================

router.post("/logout", (req, res) => {

    res.clearCookie("token");

    res.json({
        success: true,
        message: "Sessão terminada."
    });

});


// ======================================================
// VERIFICAR USUÁRIO LOGADO
// ======================================================

router.get("/me", (req, res) => {

    try {

        const token = req.cookies.token;

        if (!token) {

            return res.json({
                success: false,
                loggedIn: false
            });

        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        const user = db.prepare(`
            SELECT
                id,
                name,
                email,
                role,
                created_at
            FROM users
            WHERE id = ?
        `).get(decoded.id);

        if (!user) {

            return res.json({
                success: false,
                loggedIn: false
            });

        }

        return res.json({

            success: true,
            loggedIn: true,
            user

        });

    } catch (error) {

        return res.json({
            success: false,
            loggedIn: false
        });

    }

});


module.exports = router;