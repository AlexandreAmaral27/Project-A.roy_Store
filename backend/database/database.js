const Database = require("better-sqlite3");
const path = require("path");

// ======================================================
// CONEXÃO COM A BASE DE DADOS
// ======================================================

const dbPath = path.join(__dirname, "..", "database.sqlite");

const db = new Database(dbPath);

// Ativar Foreign Keys
db.pragma("foreign_keys = ON");

console.log("✅ Banco de dados conectado.");


// ======================================================
// FUNÇÃO AUXILIAR
// Verifica se uma coluna já existe
// ======================================================

function colunaExiste(tabela, coluna) {
    const colunas = db
        .prepare(`PRAGMA table_info(${tabela})`)
        .all();

    return colunas.some(
        item => item.name === coluna
    );
}


// ======================================================
// TABELA DE UTILIZADORES
// ======================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS users (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        email TEXT NOT NULL UNIQUE,

        password TEXT NOT NULL,

        role TEXT NOT NULL DEFAULT 'customer',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
`);

console.log("✅ Tabela users verificada.");


// ======================================================
// TABELA DE PRODUTOS
// ======================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS products (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        description TEXT DEFAULT '',

        price REAL NOT NULL DEFAULT 0,

        image TEXT DEFAULT '',

        category TEXT DEFAULT '',

        stock INTEGER NOT NULL DEFAULT 0,

        storage TEXT DEFAULT '',

        color TEXT DEFAULT '',

        battery TEXT DEFAULT '',

        condition TEXT DEFAULT '',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

    )
`);

console.log("✅ Tabela products verificada.");


// ======================================================
// MIGRAÇÕES DA TABELA PRODUCTS
// ======================================================

// STORAGE
if (!colunaExiste("products", "storage")) {

    db.exec(`
        ALTER TABLE products
        ADD COLUMN storage TEXT DEFAULT ''
    `);

    console.log("✅ Coluna storage adicionada.");
}


// COLOR
if (!colunaExiste("products", "color")) {

    db.exec(`
        ALTER TABLE products
        ADD COLUMN color TEXT DEFAULT ''
    `);

    console.log("✅ Coluna color adicionada.");
}


// BATTERY
if (!colunaExiste("products", "battery")) {

    db.exec(`
        ALTER TABLE products
        ADD COLUMN battery TEXT DEFAULT ''
    `);

    console.log("✅ Coluna battery adicionada.");
}


// CONDITION
if (!colunaExiste("products", "condition")) {

    db.exec(`
        ALTER TABLE products
        ADD COLUMN condition TEXT DEFAULT ''
    `);

    console.log("✅ Coluna condition adicionada.");
}


// UPDATED_AT
if (!colunaExiste("products", "updated_at")) {

    db.exec(`
        ALTER TABLE products
        ADD COLUMN updated_at DATETIME
    `);

    console.log("✅ Coluna updated_at adicionada.");
}


// ======================================================
// CORRIGIR VALORES NULL DOS PRODUTOS EXISTENTES
// ======================================================

db.exec(`
    UPDATE products
    SET description = ''
    WHERE description IS NULL
`);

db.exec(`
    UPDATE products
    SET image = ''
    WHERE image IS NULL
`);

db.exec(`
    UPDATE products
    SET category = ''
    WHERE category IS NULL
`);

db.exec(`
    UPDATE products
    SET stock = 0
    WHERE stock IS NULL
`);

db.exec(`
    UPDATE products
    SET storage = ''
    WHERE storage IS NULL
`);

db.exec(`
    UPDATE products
    SET color = ''
    WHERE color IS NULL
`);

db.exec(`
    UPDATE products
    SET battery = ''
    WHERE battery IS NULL
`);

db.exec(`
    UPDATE products
    SET condition = ''
    WHERE condition IS NULL
`);


// ======================================================
// ATUALIZAR UPDATED_AT DOS PRODUTOS ANTIGOS
// ======================================================

db.exec(`
    UPDATE products
    SET updated_at = CURRENT_TIMESTAMP
    WHERE updated_at IS NULL
`);


// ======================================================
// EXPORTAR DATABASE
// ======================================================

// ==========================================
// TABELA DE PEDIDOS
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER,

        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        observation TEXT DEFAULT '',

        payment_method TEXT NOT NULL DEFAULT 'whatsapp',

        status TEXT NOT NULL DEFAULT 'pending',

        total REAL NOT NULL DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE SET NULL
    )
`);

console.log("✅ Tabela orders verificada.");


// ==========================================
// ITENS DOS PEDIDOS
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        order_id INTEGER NOT NULL,

        product_id INTEGER,

        product_name TEXT NOT NULL,

        unit_price REAL NOT NULL,

        quantity INTEGER NOT NULL,

        subtotal REAL NOT NULL,

        FOREIGN KEY (order_id)
            REFERENCES orders(id)
            ON DELETE CASCADE,

        FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON DELETE SET NULL
    )
`);

console.log("✅ Tabela order_items verificada.");


// ==========================================
// ÍNDICES
// ==========================================

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_user_id
    ON orders(user_id)
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_status
    ON orders(status)
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id
    ON order_items(order_id)
`);

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id
    ON order_items(product_id)
`);

console.log("✅ Índices dos pedidos verificados.");

module.exports = db;