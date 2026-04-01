import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
await conn.execute(
  "ALTER TABLE `parcelas` MODIFY COLUMN `status` enum('pendente','pago','atrasado','aguardando_confirmacao') NOT NULL DEFAULT 'pendente';"
);
console.log("Migration applied: parcelas.status now includes 'aguardando_confirmacao'");
await conn.end();
