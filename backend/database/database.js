const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "database.sqlite");

const db = new Database(dbPath);

// Ativar foreign keys
db.pragma("foreign_keys = ON");

// ======================================================
// TABELA DE USUÁRIOS
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

console.log("✅ Banco de dados conectado.");


// ======================================================
// TABELA DE PRODUTOS
// ======================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image TEXT,
        category TEXT,
        stock INTEGER DEFAULT 0,

        storage TEXT,
        color TEXT,
        battery TEXT,
        condition TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);


// ======================================================
// MIGRAÇÃO AUTOMÁTICA
// Adiciona colunas caso o banco antigo não tenha
// ======================================================

const columns = db
    .prepare(`PRAGMA table_info(products)`)
    .all();

const existingColumns =
    columns.map(column => column.name);


// STORAGE
if (!existingColumns.includes("storage")) {

    db.exec(`
        ALTER TABLE products
        ADD COLUMN storage TEXT
    `);

    console.log("✅ Coluna storage adicionada.");
}


// COLOR
if (!existingColumns.includes("color")) {

    db.exec(`
        ALTER TABLE products
        ADD COLUMN color TEXT
    `);

    console.log("✅ Coluna color adicionada.");
}


// BATTERY
if (!existingColumns.includes("battery")) {

    db.exec(`
        ALTER TABLE products
        ADD COLUMN battery TEXT
    `);

    console.log("✅ Coluna battery adicionada.");
}


// CONDITION
if (!existingColumns.includes("condition")) {

    db.exec(`
        ALTER TABLE products
        ADD COLUMN condition TEXT
    `);

    console.log("✅ Coluna condition adicionada.");
}


// UPDATED_AT
if (!existingColumns.includes("updated_at")) {

    db.exec(`
        ALTER TABLE products
        ADD COLUMN updated_at DATETIME
    `);

    console.log("✅ Coluna updated_at adicionada.");
}


module.exports = db;