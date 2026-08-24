const db = require("./database/database");

const email = "amaralalexandre327@gmail.com";

const result = db.prepare(`
    UPDATE users
    SET role = 'admin'
    WHERE email = ?
`).run(email);

if (result.changes === 0) {
    console.log("❌ Nenhum usuário encontrado com esse email.");
} else {
    console.log("✅ Usuário transformado em administrador!");
}