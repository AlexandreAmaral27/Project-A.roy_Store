const express = require("express");
const db = require("../database/database");

const {
    verificarToken,
    verificarAdmin
} = require("../middleware/auth");

const router = express.Router();

console.log("✅ products.js foi carregado");


// ======================================================
// TESTE
// ======================================================

router.get("/teste", (req, res) => {

    res.json({
        success: true,
        message: "Products route funcionando!"
    });

});


// ======================================================
// LISTAR TODOS OS PRODUTOS
// GET /api/products
// ======================================================

router.get("/", (req, res) => {

    try {

        const products = db.prepare(`
            SELECT *
            FROM products
            ORDER BY id DESC
        `).all();

        res.json(products);

    } catch (error) {

        console.error("❌ Erro ao buscar produtos:", error);

        res.status(500).json({
            error: "Erro ao buscar produtos"
        });

    }

});


// ======================================================
// BUSCAR PRODUTO POR ID
// GET /api/products/:id
// ======================================================

router.get("/:id", (req, res) => {

    try {

        const product = db.prepare(`
            SELECT *
            FROM products
            WHERE id = ?
        `).get(req.params.id);

        if (!product) {

            return res.status(404).json({
                error: "Produto não encontrado"
            });

        }

        res.json(product);

    } catch (error) {

        console.error("❌ Erro ao buscar produto:", error);

        res.status(500).json({
            error: "Erro ao buscar produto"
        });

    }

});


// ======================================================
// ADICIONAR PRODUTO
// POST /api/products
// ======================================================

router.post(
    "/",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {

            console.log("📦 DADOS RECEBIDOS DO PAINEL:");
            console.log(req.body);

            const {

                name,
                description,
                price,
                image,
                category,
                stock,

                // inglês
                storage,
                color,
                battery,
                condition,

                // português - caso algum painel antigo envie assim
                armazenamento,
                cor,
                bateria,
                estado

            } = req.body;


            // ==================================================
            // NORMALIZAR OS DADOS
            // ==================================================

            const storageFinal =
                storage ??
                armazenamento ??
                "";

            const colorFinal =
                color ??
                cor ??
                "";

            const batteryFinal =
                battery ??
                bateria ??
                "";

            const conditionFinal =
                condition ??
                estado ??
                "";


            console.log("📱 DETALHES NORMALIZADOS:");

            console.log({
                name,
                price,
                storage: storageFinal,
                color: colorFinal,
                battery: batteryFinal,
                condition: conditionFinal
            });


            // ==================================================
            // VALIDAÇÃO
            // ==================================================

            if (!name || price === undefined) {

                return res.status(400).json({
                    error: "Nome e preço são obrigatórios"
                });

            }


            // ==================================================
            // INSERIR
            // ==================================================

            const result = db.prepare(`
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

                name,

                description || "",

                Number(price),

                image || "",

                category || "",

                Number(stock) || 0,

                storageFinal,

                colorFinal,

                batteryFinal,

                conditionFinal

            );


            // ==================================================
            // BUSCAR PRODUTO CRIADO
            // ==================================================

            const product = db.prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `).get(result.lastInsertRowid);


            console.log("✅ PRODUTO SALVO NO BANCO:");
            console.log(product);


            res.status(201).json(product);


        } catch (error) {

            console.error(
                "❌ Erro ao adicionar produto:",
                error
            );

            res.status(500).json({
                error: "Erro ao adicionar produto"
            });

        }

    }
);


// ======================================================
// EDITAR PRODUTO
// PUT /api/products/:id
// ======================================================

router.put(
    "/:id",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {

            console.log("✏️ DADOS RECEBIDOS PARA EDIÇÃO:");
            console.log(req.body);


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
                condition,

                armazenamento,
                cor,
                bateria,
                estado

            } = req.body;


            const existingProduct = db.prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `).get(req.params.id);


            if (!existingProduct) {

                return res.status(404).json({
                    error: "Produto não encontrado"
                });

            }


            // ==================================================
            // NORMALIZAR
            // ==================================================

            const storageFinal =
                storage ??
                armazenamento ??
                existingProduct.storage ??
                "";

            const colorFinal =
                color ??
                cor ??
                existingProduct.color ??
                "";

            const batteryFinal =
                battery ??
                bateria ??
                existingProduct.battery ??
                "";

            const conditionFinal =
                condition ??
                estado ??
                existingProduct.condition ??
                "";


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

                name ?? existingProduct.name,

                description ??
                    existingProduct.description ??
                    "",

                price ??
                    existingProduct.price,

                image ??
                    existingProduct.image ??
                    "",

                category ??
                    existingProduct.category ??
                    "",

                stock ??
                    existingProduct.stock ??
                    0,

                storageFinal,

                colorFinal,

                batteryFinal,

                conditionFinal,

                req.params.id

            );


            // ==================================================
            // PRODUTO ATUALIZADO
            // ==================================================

            const updatedProduct = db.prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `).get(req.params.id);


            console.log("✅ PRODUTO ATUALIZADO:");
            console.log(updatedProduct);


            res.json(updatedProduct);


        } catch (error) {

            console.error(
                "❌ Erro ao editar produto:",
                error
            );

            res.status(500).json({
                error: "Erro ao editar produto"
            });

        }

    }
);


// ======================================================
// EXCLUIR PRODUTO
// DELETE /api/products/:id
// ======================================================

router.delete(
    "/:id",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {

            const product = db.prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `).get(req.params.id);


            if (!product) {

                return res.status(404).json({
                    error: "Produto não encontrado"
                });

            }


            db.prepare(`
                DELETE FROM products
                WHERE id = ?
            `).run(req.params.id);


            res.json({
                message: "Produto excluído com sucesso"
            });


        } catch (error) {

            console.error(
                "❌ Erro ao excluir produto:",
                error
            );

            res.status(500).json({
                error: "Erro ao excluir produto"
            });

        }

    }
);


module.exports = router;

const express = require("express");
const db = require("../database/database");

const {
    verificarToken,
    verificarAdmin
} = require("../middleware/auth");

const router = express.Router();


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

        res.json(products);

    } catch (error) {

        console.error(
            "Erro ao buscar produtos:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Erro ao buscar produtos."
        });

    }

});


// ======================================================
// EXPORTAR ROUTER
// ======================================================

module.exports = router;