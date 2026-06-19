const express = require("express");
const db = require("./connect");

const router = express.Router();

router.post("/login", (req, res) => {
  try {
    const { login, password } = req.body;

    if (login === "Admin26" && password === "Demo20") {
      return res.json({
        success: true,
        message: "Вход в админ-панель",
      });
    }

    return res
      .status(401)
      .json({ error: "Неверный логин или пароль администратора" });
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/requests", async (req, res) => {
  try {
    const { status, sort, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

    let sql = `
            SELECT a.*, 
                   u.name, u.surname, u.email, u.phone,
                   t.type as type_transport
            FROM applications a
            JOIN users u ON a.user_id = u.id
            JOIN transports t ON a.transport_id = t.id
            WHERE 1=1
        `;
    const params = [];

    if (status && status !== "все") {
      sql += ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }

    const sortMap = {
      date_asc: "a.start_date ASC",
      date_desc: "a.start_date DESC",
      status_asc: "a.status ASC",
      status_desc: "a.status DESC",
    };
    const sortClause = sortMap[sort] || "a.start_date DESC";
    sql += ` ORDER BY ${sortClause}`;

    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    console.log("SQL:", sql);
    console.log("Params:", params);

    const result = await db.query(sql, params);

    let countSql = `SELECT COUNT(*) FROM applications WHERE 1=1`;
    const countParams = [];
    if (status && status !== "все") {
      countSql += ` AND status = $${countParams.length + 1}`;
      countParams.push(status);
    }
    const countResult = await db.query(countSql, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      requests: result.rows,
      total: total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Ошибка получения заявок:", error);
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

router.put("/requests/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Новая", "Идет обучение", "Обучение завершено"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Недопустимый статус" });
    }

    const checkResult = await db.query(
      "SELECT * FROM applications WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Заявка не найдена" });
    }

    await db.query("UPDATE applications SET status = $1 WHERE id = $2", [
      status,
      id,
    ]);

    res.json({
      success: true,
      message: `Статус изменён на "${status}"`,
    });
  } catch (error) {
    console.error("Ошибка изменения статуса:", error);
    res.status(500).json({ error: "Ошибка сервера", details: error.message });
  }
});

module.exports = router;
