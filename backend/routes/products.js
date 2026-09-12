const express = require("express");

const db = require("../database/database");

const {
    verificarToken,
    verificarAdmin
} = require("../middleware/auth");

const router = express.Router();


// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function validarId(id) {
    const numero = Number(id);

    return Number.isInteger(numero) && numero > 0;
}


function validarPreco(price) {

    if (
        price === undefined ||
        price === null ||
        price === ""
    ) {
        return false;
    }

    const numero = Number(price);

    return Number.isFinite(numero) && numero >= 0;
}


function validarStock(stock) {

    // Se não foi informado, assumimos 0
    if (
        stock === undefined ||
        stock === null ||
        stock === ""
    ) {
        return 0;
    }

    const numero = Number(stock);

    // Stock deve ser número inteiro e nunca negativo
    if (
        !Number.isInteger(numero) ||
        numero < 0
    ) {
        return null;
    }

    return numero;
}


function texto(valor) {

    if (
        valor === undefined ||
        valor === null
    ) {
        return "";
    }

    return String(valor).trim();
}


// ======================================================
// LISTAR TODOS OS PRODUTOS
// ======================================================

router.get("/", (req, res) => {

    try {

        const products = db.prepare(`
            SELECT *
            FROM products
            ORDER BY id DESC
        `).all();

        return res.json({
            success: true,
            products
        });

    } catch (error) {

        console.error(
            "❌ Erro ao buscar produtos:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erro ao buscar produtos."
        });

    }

});


// ======================================================
// BUSCAR PRODUTO POR ID
// ======================================================

router.get("/:id", (req, res) => {

    try {

        if (!validarId(req.params.id)) {

            return res.status(400).json({
                success: false,
                message: "ID do produto inválido."
            });

        }


        const product = db.prepare(`
            SELECT *
            FROM products
            WHERE id = ?
        `).get(Number(req.params.id));


        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Produto não encontrado."
            });

        }


        return res.json({
            success: true,
            product
        });

    } catch (error) {

        console.error(
            "❌ Erro ao buscar produto:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erro ao buscar produto."
        });

    }

});


// ======================================================
// ADICIONAR PRODUTO
// SOMENTE ADMIN
// ======================================================

router.post(
    "/",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {

            const {
                name,
                description,
                price,
                image,
                category,
                stock,
                storage,
                color,
                battery,
                condition
            } = req.body;


            // ==================================================
            // NOME
            // ==================================================

            const nomeProduto = texto(name);

            if (!nomeProduto) {

                return res.status(400).json({
                    success: false,
                    message: "O nome do produto é obrigatório."
                });

            }


            if (nomeProduto.length > 150) {

                return res.status(400).json({
                    success: false,
                    message: "O nome do produto é muito longo."
                });

            }


            // ==================================================
            // PREÇO
            // ==================================================

            if (!validarPreco(price)) {

                return res.status(400).json({
                    success: false,
                    message: "O preço do produto é inválido."
                });

            }

            const precoNumerico = Number(price);


            // ==================================================
            // STOCK
            // ==================================================

            const estoqueNumerico = validarStock(stock);

            if (estoqueNumerico === null) {

                return res.status(400).json({
                    success: false,
                    message: "O stock deve ser um número inteiro igual ou superior a 0."
                });

            }


            // ==================================================
            // INSERIR PRODUTO
            // ==================================================

            const resultado = db.prepare(`
                INSERT INTO products
                (
                    name,
                    description,
                    price,
                    image,
                    category,
                    stock,
                    storage,
                    color,
                    battery,
                    condition
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(

                nomeProduto,

                texto(description),

                precoNumerico,

                texto(image),

                texto(category),

                estoqueNumerico,

                texto(storage),

                texto(color),

                texto(battery),

                texto(condition)

            );


            // ==================================================
            // BUSCAR PRODUTO CRIADO
            // ==================================================

            const product = db.prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `).get(resultado.lastInsertRowid);


            return res.status(201).json({

                success: true,

                message: "Produto adicionado com sucesso.",

                product

            });

        } catch (error) {

            console.error(
                "❌ Erro ao adicionar produto:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Erro ao adicionar produto."
            });

        }

    }
);


// ======================================================
// EDITAR PRODUTO
// SOMENTE ADMIN
// ======================================================

router.put(
    "/:id",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {

            // ==================================================
            // VALIDAR ID
            // ==================================================

            if (!validarId(req.params.id)) {

                return res.status(400).json({
                    success: false,
                    message: "ID do produto inválido."
                });

            }

            const id = Number(req.params.id);


            // ==================================================
            // VERIFICAR PRODUTO
            // ==================================================

            const produtoExistente = db.prepare(`
                SELECT id
                FROM products
                WHERE id = ?
            `).get(id);


            if (!produtoExistente) {

                return res.status(404).json({
                    success: false,
                    message: "Produto não encontrado."
                });

            }


            // ==================================================
            // DADOS
            // ==================================================

            const {
                name,
                description,
                price,
                image,
                category,
                stock,
                storage,
                color,
                battery,
                condition
            } = req.body;


            // ==================================================
            // NOME
            // ==================================================

            const nomeProduto = texto(name);

            if (!nomeProduto) {

                return res.status(400).json({
                    success: false,
                    message: "O nome do produto é obrigatório."
                });

            }


            if (nomeProduto.length > 150) {

                return res.status(400).json({
                    success: false,
                    message: "O nome do produto é muito longo."
                });

            }


            // ==================================================
            // PREÇO
            // ==================================================

            if (!validarPreco(price)) {

                return res.status(400).json({
                    success: false,
                    message: "O preço do produto é inválido."
                });

            }

            const precoNumerico = Number(price);


            // ==================================================
            // STOCK
            // ==================================================

            const estoqueNumerico = validarStock(stock);

            if (estoqueNumerico === null) {

                return res.status(400).json({
                    success: false,
                    message: "O stock deve ser um número inteiro igual ou superior a 0."
                });

            }


            // ==================================================
            // ATUALIZAR
            // ==================================================

            db.prepare(`
                UPDATE products

                SET

                    name = ?,

                    description = ?,

                    price = ?,

                    image = ?,

                    category = ?,

                    stock = ?,

                    storage = ?,

                    color = ?,

                    battery = ?,

                    condition = ?,

                    updated_at = CURRENT_TIMESTAMP

                WHERE id = ?

            `).run(

                nomeProduto,

                texto(description),

                precoNumerico,

                texto(image),

                texto(category),

                estoqueNumerico,

                texto(storage),

                texto(color),

                texto(battery),

                texto(condition),

                id

            );


            // ==================================================
            // BUSCAR PRODUTO ATUALIZADO
            // ==================================================

            const product = db.prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `).get(id);


            return res.json({

                success: true,

                message: "Produto atualizado com sucesso.",

                product

            });

        } catch (error) {

            console.error(
                "❌ Erro ao atualizar produto:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Erro ao atualizar produto."
            });

        }

    }
);


// ======================================================
// EXCLUIR PRODUTO
// SOMENTE ADMIN
// ======================================================

router.delete(
    "/:id",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {

            // ==================================================
            // VALIDAR ID
            // ==================================================

            if (!validarId(req.params.id)) {

                return res.status(400).json({
                    success: false,
                    message: "ID do produto inválido."
                });

            }

            const id = Number(req.params.id);


            // ==================================================
            // EXCLUIR
            // ==================================================

            const resultado = db.prepare(`
                DELETE FROM products
                WHERE id = ?
            `).run(id);


            if (resultado.changes === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Produto não encontrado."
                });

            }


            return res.json({

                success: true,

                message: "Produto excluído com sucesso."

            });

        } catch (error) {

            console.error(
                "❌ Erro ao excluir produto:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Erro ao excluir produto."
            });

        }

    }
);


// ======================================================
// EXPORTAR ROUTER
// ======================================================

module.exports = router;