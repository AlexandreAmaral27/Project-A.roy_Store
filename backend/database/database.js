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

module.exports = db;