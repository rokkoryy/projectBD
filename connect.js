const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "roma",
  password: "248613",
  database: "postgres",
});

module.exports = pool;
