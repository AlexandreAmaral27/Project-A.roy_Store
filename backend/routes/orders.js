const express = require("express");
const db = require("../database/database");
const { verificarToken, verificarAdmin } = require("../middleware/auth");

const router = express.Router();


// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function texto(valor) {
    if (valor === undefined || valor === null) {
        return "";
    }

    return String(valor).trim();
}

function validarId(id) {
    const numero = Number(id);

    return Number.isInteger(numero) && numero > 0;
}


// ======================================================
// CRIAR PEDIDO
// POST /api/orders
// ======================================================

router.post("/", async (req, res) => {

    try {

        const {
            customer_name,
            customer_phone,
            delivery_address,
            observation,
            payment_method,
            items
        } = req.body;


        // ----------------------------------------------
        // VALIDAR DADOS DO CLIENTE
        // ----------------------------------------------

        const nome = texto(customer_name);
        const telefone = texto(customer_phone);
        const morada = texto(delivery_address);
        const observacao = texto(observation);

        if (!nome || !telefone || !morada) {

            return res.status(400).json({
                success: false,
                message: "Nome, telefone e morada são obrigatórios."
            });

        }


        // ----------------------------------------------
        // VALIDAR PRODUTOS
        // ----------------------------------------------

        if (!Array.isArray(items) || items.length === 0) {

            return res.status(400).json({
                success: false,
                message: "O pedido precisa ter pelo menos um produto."
            });

        }


        // ----------------------------------------------
        // OBTER UTILIZADOR, SE ESTIVER LOGADO
        // ----------------------------------------------

        let userId = null;

        try {

            if (req.cookies && req.cookies.token) {

                const jwt = require("jsonwebtoken");

                const decoded = jwt.verify(
                    req.cookies.token,
                    process.env.JWT_SECRET
                );

                userId = decoded.id || null;
            }

        } catch (error) {

            // Pedido pode continuar como visitante.
            userId = null;

        }


        // ----------------------------------------------
        // PROCESSAR PRODUTOS
        // ----------------------------------------------

        const produtosProcessados = [];
        let total = 0;


        for (const item of items) {

            const productId = Number(item.product_id);
            const quantidade = Number(item.quantity);


            if (!validarId(productId)) {

                return res.status(400).json({
                    success: false,
                    message: "ID de produto inválido."
                });

            }


            if (
                !Number.isInteger(quantidade) ||
                quantidade <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Quantidade de produto inválida."
                });

            }


            // ------------------------------------------
            // BUSCAR PRODUTO REAL NO BANCO
            // ------------------------------------------

            const produto = db.prepare(`
                SELECT
                    id,
                    name,
                    price,
                    stock
                FROM products
                WHERE id = ?
            `).get(productId);


            if (!produto) {

                return res.status(404).json({
                    success: false,
                    message: `Produto com ID ${productId} não encontrado.`
                });

            }


            // ------------------------------------------
            // VERIFICAR STOCK
            // ------------------------------------------

            if (quantidade > produto.stock) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Stock insuficiente para "${produto.name}". ` +
                        `Disponível: ${produto.stock}.`
                });

            }


            // ------------------------------------------
            // CALCULAR PREÇO PELO BANCO
            // ------------------------------------------

            const preco = Number(produto.price);

            const subtotal = preco * quantidade;

            total += subtotal;


            produtosProcessados.push({
                product_id: produto.id,
                product_name: produto.name,
                unit_price: preco,
                quantity: quantidade,
                subtotal
            });

        }


        // ----------------------------------------------
        // PAGAMENTO
        // ----------------------------------------------

        const metodoPagamento =
            texto(payment_method) || "whatsapp";


        // ----------------------------------------------
        // CRIAR PEDIDO + ITENS + STOCK
        // TUDO DENTRO DE UMA TRANSAÇÃO
        // ----------------------------------------------

        const criarPedido = db.transaction(() => {


            // ------------------------------------------
            // CRIAR PEDIDO
            // ------------------------------------------

            const resultadoPedido = db.prepare(`
                INSERT INTO orders (
                    user_id,
                    customer_name,
                    customer_phone,
                    delivery_address,
                    observation,
                    payment_method,
                    status,
                    total
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                nome,
                telefone,
                morada,
                observacao,
                metodoPagamento,
                "pending",
                total
            );


            const orderId = Number(
                resultadoPedido.lastInsertRowid
            );


            // ------------------------------------------
            // INSERIR ITENS
            // ------------------------------------------

            const inserirItem = db.prepare(`
                INSERT INTO order_items (
                    order_id,
                    product_id,
                    product_name,
                    unit_price,
                    quantity,
                    subtotal
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `);


            // ------------------------------------------
            // ATUALIZAR STOCK
            // ------------------------------------------

            const atualizarStock = db.prepare(`
                UPDATE products
                SET
                    stock = stock - ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);


            for (const item of produtosProcessados) {

                inserirItem.run(
                    orderId,
                    item.product_id,
                    item.product_name,
                    item.unit_price,
                    item.quantity,
                    item.subtotal
                );


                atualizarStock.run(
                    item.quantity,
                    item.product_id
                );

            }


            return orderId;

        });


        const orderId = criarPedido();


        // ----------------------------------------------
        // BUSCAR PEDIDO CRIADO
        // ----------------------------------------------

        const pedido = db.prepare(`
            SELECT *
            FROM orders
            WHERE id = ?
        `).get(orderId);


        const itens = db.prepare(`
            SELECT *
            FROM order_items
            WHERE order_id = ?
            ORDER BY id ASC
        `).all(orderId);


        // ----------------------------------------------
        // RESPOSTA
        // ----------------------------------------------

        return res.status(201).json({

            success: true,

            message: "Pedido criado com sucesso.",

            order: {
                ...pedido,
                items: itens
            }

        });


    } catch (error) {

        console.error(
            "❌ Erro ao criar pedido:",
            error
        );


        return res.status(500).json({

            success: false,

            message: "Erro ao criar pedido."

        });

    }

});


// ======================================================
// LISTAR PEDIDOS — ADMIN
// GET /api/orders
// ======================================================

router.get(
    "/",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {

            const pedidos = db.prepare(`
                SELECT
                    orders.*,
                    users.name AS user_name,
                    users.email AS user_email
                FROM orders

                LEFT JOIN users
                    ON users.id = orders.user_id

                ORDER BY orders.created_at DESC
            `).all();


            return res.json({

                success: true,

                orders: pedidos

            });


        } catch (error) {

            console.error(
                "❌ Erro ao listar pedidos:",
                error
            );


            return res.status(500).json({

                success: false,

                message: "Erro ao carregar pedidos."

            });

        }

    }
);


// ======================================================
// VER PEDIDO — ADMIN
// GET /api/orders/:id
// ======================================================

router.get(
    "/:id",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {

            const { id } = req.params;


            if (!validarId(id)) {

                return res.status(400).json({

                    success: false,

                    message: "ID do pedido inválido."

                });

            }


            const pedido = db.prepare(`
                SELECT
                    orders.*,
                    users.name AS user_name,
                    users.email AS user_email
                FROM orders

                LEFT JOIN users
                    ON users.id = orders.user_id

                WHERE orders.id = ?
            `).get(Number(id));


            if (!pedido) {

                return res.status(404).json({

                    success: false,

                    message: "Pedido não encontrado."

                });

            }


            const itens = db.prepare(`
                SELECT *
                FROM order_items
                WHERE order_id = ?
                ORDER BY id ASC
            `).all(Number(id));


            return res.json({

                success: true,

                order: {
                    ...pedido,
                    items: itens
                }

            });


        } catch (error) {

            console.error(
                "❌ Erro ao carregar pedido:",
                error
            );


            return res.status(500).json({

                success: false,

                message: "Erro ao carregar pedido."

            });

        }

    }
);


// ======================================================
// ALTERAR ESTADO DO PEDIDO — ADMIN
// PUT /api/orders/:id
// ======================================================

router.put(
    "/:id",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {

            const { id } = req.params;
            const { status } = req.body;


            if (!validarId(id)) {

                return res.status(400).json({

                    success: false,

                    message: "ID do pedido inválido."

                });

            }


            const estadosPermitidos = [
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "completed",
                "cancelled"
            ];


            if (!estadosPermitidos.includes(status)) {

                return res.status(400).json({

                    success: false,

                    message: "Estado do pedido inválido."

                });

            }


            const resultado = db.prepare(`
                UPDATE orders

                SET
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = ?
            `).run(
                status,
                Number(id)
            );


            if (resultado.changes === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Pedido não encontrado."

                });

            }


            const pedido = db.prepare(`
                SELECT *
                FROM orders
                WHERE id = ?
            `).get(Number(id));


            return res.json({

                success: true,

                message: "Estado do pedido atualizado.",

                order: pedido

            });


        } catch (error) {

            console.error(
                "❌ Erro ao atualizar pedido:",
                error
            );


            return res.status(500).json({

                success: false,

                message: "Erro ao atualizar pedido."

            });

        }

    }
);


// ======================================================
// APAGAR PEDIDO — ADMIN
// DELETE /api/orders/:id
// ======================================================

router.delete(
    "/:id",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {

            const { id } = req.params;


            if (!validarId(id)) {

                return res.status(400).json({

                    success: false,

                    message: "ID do pedido inválido."

                });

            }


            const resultado = db.prepare(`
                DELETE FROM orders
                WHERE id = ?
            `).run(Number(id));


            if (resultado.changes === 0) {

                return res.status(404).json({

                    success: false,

                    message: "Pedido não encontrado."

                });

            }


            return res.json({

                success: true,

                message: "Pedido eliminado com sucesso."

            });


        } catch (error) {

            console.error(
                "❌ Erro ao eliminar pedido:",
                error
            );


            return res.status(500).json({

                success: false,

                message: "Erro ao eliminar pedido."

            });

        }

    }
);


module.exports = router;