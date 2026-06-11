import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionLimit: Number(process.env.DB_POOL_MAX) || 10,
  waitForConnections: true,
  connectTimeout: 10000,
  charset: 'utf8mb4',
});

export default pool;
