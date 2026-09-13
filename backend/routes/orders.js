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


            // ------------------------------------------
            // VALIDAR ID
            // ------------------------------------------

            if (!validarId(productId)) {

                return res.status(400).json({
                    success: false,
                    message: "ID de produto inválido."
                });

            }


            // ------------------------------------------
            // VALIDAR QUANTIDADE
            // ------------------------------------------

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
            // BUSCAR PRODUTO NO BANCO
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
                    message:
                        `Produto com ID ${productId} não encontrado.`
                });

            }


            // ------------------------------------------
            // VERIFICAR STOCK
            // ------------------------------------------

            if (quantidade > Number(produto.stock)) {

                return res.status(400).json({
                    success: false,
                    message:
                        `Stock insuficiente para "${produto.name}". ` +
                        `Disponível: ${produto.stock}.`
                });

            }


            // ------------------------------------------
            // CALCULAR PREÇO REAL
            // ------------------------------------------

            const preco = Number(produto.price);

            const subtotal = preco * quantidade;

            total += subtotal;


            produtosProcessados.push({
                product_id: produto.id,
                product_name: produto.name,
                unit_price: preco,
                quantity: quantidade,
                subtotal: subtotal
            });

        }


        // ----------------------------------------------
        // MÉTODO DE PAGAMENTO
        // ----------------------------------------------

        const metodoPagamento =
            texto(payment_method) || "whatsapp";


        // ----------------------------------------------
        // CRIAR PEDIDO
        // ITENS + STOCK
        // TUDO EM UMA TRANSAÇÃO
        // ----------------------------------------------

        const criarPedido = db.transaction(() => {


            // ------------------------------------------
            // INSERIR PEDIDO
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
                  AND stock >= ?
            `);


            for (const item of produtosProcessados) {


                // Inserir item
                inserirItem.run(
                    orderId,
                    item.product_id,
                    item.product_name,
                    item.unit_price,
                    item.quantity,
                    item.subtotal
                );


                // Retirar stock
                const resultadoStock = atualizarStock.run(
                    item.quantity,
                    item.product_id,
                    item.quantity
                );


                // Segurança contra stock insuficiente
                if (resultadoStock.changes === 0) {

                    throw new Error(
                        `Stock insuficiente para o produto ${item.product_id}.`
                    );

                }

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
// ESTATÍSTICAS
// IMPORTANTE:
// ESTA ROTA TEM QUE FICAR ANTES DE /:id
//
// GET /api/orders/stats
// ======================================================

router.get(
    "/stats",
    verificarToken,
    verificarAdmin,
    (req, res) => {

        try {


            // ------------------------------------------
            // TOTAL DE PEDIDOS
            // ------------------------------------------

            const totalPedidos = db.prepare(`
                SELECT COUNT(*) AS total
                FROM orders
            `).get().total;


            // ------------------------------------------
            // PEDIDOS PENDENTES
            // ------------------------------------------

            const pedidosPendentes = db.prepare(`
                SELECT COUNT(*) AS total
                FROM orders
                WHERE status = 'pending'
            `).get().total;


            // ------------------------------------------
            // PEDIDOS CONCLUÍDOS
            // ------------------------------------------

            const pedidosConcluidos = db.prepare(`
                SELECT COUNT(*) AS total
                FROM orders
                WHERE status = 'completed'
            `).get().total;


            // ------------------------------------------
            // PRODUTOS VENDIDOS
            // SOMENTE PEDIDOS CONCLUÍDOS
            // ------------------------------------------

            const produtosVendidos = db.prepare(`
                SELECT COALESCE(SUM(oi.quantity), 0) AS total
                FROM order_items oi

                INNER JOIN orders o
                    ON o.id = oi.order_id

                WHERE o.status = 'completed'
            `).get().total;


            // ------------------------------------------
            // FATURAMENTO
            // SOMENTE PEDIDOS CONCLUÍDOS
            // ------------------------------------------

            const faturamento = db.prepare(`
                SELECT COALESCE(SUM(total), 0) AS total
                FROM orders
                WHERE status = 'completed'
            `).get().total;


            // ------------------------------------------
            // VALOR DOS PEDIDOS ATIVOS
            // ------------------------------------------

            const valorPendente = db.prepare(`
                SELECT COALESCE(SUM(total), 0) AS total
                FROM orders

                WHERE status IN (
                    'pending',
                    'confirmed',
                    'processing',
                    'shipped'
                )
            `).get().total;


            // ------------------------------------------
            // RESPOSTA
            // ------------------------------------------

            return res.json({

                success: true,

                stats: {

                    totalPedidos,

                    pedidosPendentes,

                    pedidosConcluidos,

                    produtosVendidos,

                    faturamento,

                    valorPendente

                }

            });


        } catch (error) {

            console.error(
                "❌ Erro ao carregar estatísticas:",
                error
            );


            return res.status(500).json({

                success: false,

                message: "Erro ao carregar estatísticas."

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


            const orderId = Number(id);


            // ------------------------------------------
            // BUSCAR PEDIDO
            // ------------------------------------------

            const pedido = db.prepare(`
                SELECT
                    orders.*,
                    users.name AS user_name,
                    users.email AS user_email
                FROM orders

                LEFT JOIN users
                    ON users.id = orders.user_id

                WHERE orders.id = ?
            `).get(orderId);


            if (!pedido) {

                return res.status(404).json({

                    success: false,

                    message: "Pedido não encontrado."

                });

            }


            // ------------------------------------------
            // BUSCAR ITENS
            // ------------------------------------------

            const itens = db.prepare(`
                SELECT *
                FROM order_items

                WHERE order_id = ?

                ORDER BY id ASC
            `).all(orderId);


            // ------------------------------------------
            // RESPOSTA
            // ------------------------------------------

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


            // ------------------------------------------
            // VALIDAR ID
            // ------------------------------------------

            if (!validarId(id)) {

                return res.status(400).json({

                    success: false,

                    message: "ID do pedido inválido."

                });

            }


            // ------------------------------------------
            // ESTADOS PERMITIDOS
            // ------------------------------------------

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


            const orderId = Number(id);


            // ------------------------------------------
            // TRANSAÇÃO
            // ------------------------------------------

            const alterarEstado = db.transaction(() => {


                // --------------------------------------
                // PEDIDO ATUAL
                // --------------------------------------

                const pedidoAtual = db.prepare(`
                    SELECT *
                    FROM orders
                    WHERE id = ?
                `).get(orderId);


                if (!pedidoAtual) {

                    return {
                        encontrado: false
                    };

                }


                const estadoAnterior =
                    pedidoAtual.status;


                // --------------------------------------
                // MESMO ESTADO
                // --------------------------------------

                if (estadoAnterior === status) {

                    return {

                        encontrado: true,

                        alterado: false

                    };

                }


                // --------------------------------------
                // ITENS DO PEDIDO
                // --------------------------------------

                const itens = db.prepare(`
                    SELECT
                        product_id,
                        quantity
                    FROM order_items

                    WHERE order_id = ?
                `).all(orderId);


                // --------------------------------------
                // ATIVO → CANCELADO
                //
                // DEVOLVER STOCK
                // --------------------------------------

                if (
                    estadoAnterior !== "cancelled" &&
                    status === "cancelled"
                ) {

                    const devolverStock = db.prepare(`
                        UPDATE products

                        SET
                            stock = stock + ?,
                            updated_at = CURRENT_TIMESTAMP

                        WHERE id = ?
                    `);


                    for (const item of itens) {

                        if (item.product_id === null) {
                            continue;
                        }


                        devolverStock.run(
                            item.quantity,
                            item.product_id
                        );

                    }

                }


                // --------------------------------------
                // CANCELADO → ATIVO
                //
                // RESERVAR STOCK NOVAMENTE
                // --------------------------------------

                if (
                    estadoAnterior === "cancelled" &&
                    status !== "cancelled"
                ) {

                    const reservarStock = db.prepare(`
                        UPDATE products

                        SET
                            stock = stock - ?,
                            updated_at = CURRENT_TIMESTAMP

                        WHERE id = ?
                          AND stock >= ?
                    `);


                    for (const item of itens) {

                        if (item.product_id === null) {
                            continue;
                        }


                        const resultadoStock =
                            reservarStock.run(
                                item.quantity,
                                item.product_id,
                                item.quantity
                            );


                        if (resultadoStock.changes === 0) {

                            throw new Error(
                                `Stock insuficiente para reativar o produto ${item.product_id}.`
                            );

                        }

                    }

                }


                // --------------------------------------
                // ATUALIZAR PEDIDO
                // --------------------------------------

                db.prepare(`
                    UPDATE orders

                    SET
                        status = ?,
                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = ?
                `).run(
                    status,
                    orderId
                );


                return {

                    encontrado: true,

                    alterado: true

                };

            })();


            // ------------------------------------------
            // PEDIDO NÃO ENCONTRADO
            // ------------------------------------------

            if (!alterarEstado.encontrado) {

                return res.status(404).json({

                    success: false,

                    message: "Pedido não encontrado."

                });

            }


            // ------------------------------------------
            // BUSCAR PEDIDO ATUALIZADO
            // ------------------------------------------

            const pedido = db.prepare(`
                SELECT *
                FROM orders
                WHERE id = ?
            `).get(orderId);


            // ------------------------------------------
            // RESPOSTA
            // ------------------------------------------

            return res.json({

                success: true,

                message: alterarEstado.alterado

                    ? "Estado do pedido atualizado."

                    : "O pedido já estava nesse estado.",

                order: pedido

            });


        } catch (error) {

            console.error(
                "❌ Erro ao atualizar pedido:",
                error
            );


            return res.status(400).json({

                success: false,

                message:
                    error.message ||
                    "Erro ao atualizar pedido."

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


            // ------------------------------------------
            // VALIDAR ID
            // ------------------------------------------

            if (!validarId(id)) {

                return res.status(400).json({

                    success: false,

                    message: "ID do pedido inválido."

                });

            }


            const orderId = Number(id);


            // ------------------------------------------
            // TRANSAÇÃO
            // ------------------------------------------

            const apagarPedido = db.transaction(() => {


                // --------------------------------------
                // BUSCAR PEDIDO
                // --------------------------------------

                const pedido = db.prepare(`
                    SELECT
                        id,
                        status

                    FROM orders

                    WHERE id = ?
                `).get(orderId);


                if (!pedido) {

                    return false;

                }


                // --------------------------------------
                // SE O PEDIDO NÃO ESTÁ CANCELADO,
                // DEVOLVER STOCK
                // --------------------------------------

                if (pedido.status !== "cancelled") {

                    const itens = db.prepare(`
                        SELECT
                            product_id,
                            quantity

                        FROM order_items

                        WHERE order_id = ?
                    `).all(orderId);


                    const devolverStock = db.prepare(`
                        UPDATE products

                        SET
                            stock = stock + ?,
                            updated_at = CURRENT_TIMESTAMP

                        WHERE id = ?
                    `);


                    for (const item of itens) {

                        if (item.product_id === null) {
                            continue;
                        }


                        devolverStock.run(
                            item.quantity,
                            item.product_id
                        );

                    }

                }


                // --------------------------------------
                // APAGAR PEDIDO
                // order_items será apagado
                // automaticamente por CASCADE
                // --------------------------------------

                db.prepare(`
                    DELETE FROM orders
                    WHERE id = ?
                `).run(orderId);


                return true;

            })();


            // ------------------------------------------
            // PEDIDO NÃO ENCONTRADO
            // ------------------------------------------

            if (!apagarPedido) {

                return res.status(404).json({

                    success: false,

                    message: "Pedido não encontrado."

                });

            }


            // ------------------------------------------
            // RESPOSTA
            // ------------------------------------------

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


// ======================================================
// EXPORTAR
// ======================================================

module.exports = router;