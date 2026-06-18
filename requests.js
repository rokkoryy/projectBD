const express = require("express");
const db = require("./connect");

const router = express.Router();

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT a.*, t.type as type_transport 
             FROM applications a
             JOIN transports t ON a.transport_id = t.id
             WHERE a.user_id = $1
             ORDER BY a.start_date DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения заявок:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, transportId, startDate, paymentMethod } = req.body;

    if (!userId || !transportId || !startDate || !paymentMethod) {
      return res.status(400).json({ error: "Заполните все поля" });
    }

    const transportCheck = await db.query(
      "SELECT * FROM transports WHERE id = $1",
      [transportId]
    );

    if (transportCheck.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "Выбран несуществующий вид транспорта" });
    }

    const validPaymentMethods = ["Наличные", "Карта", "Безналичный расчет"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Недопустимый способ оплаты" });
    }

    const userCheck = await db.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);

    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: "Пользователь не найден" });
    }

    const result = await db.query(
      `INSERT INTO applications (user_id, transport_id, start_date, status, payment_type) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
      [userId, transportId, startDate, "Новая", paymentMethod]
    );

    res.status(201).json({
      message: "Заявка создана!",
      request: result.rows[0],
    });
  } catch (error) {
    console.error("Ошибка создания заявки:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/:requestId/feedback", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { feedback, userId } = req.body;

    if (!feedback || feedback.trim() === "") {
      return res
        .status(400)
        .json({ error: "Текст отзыва не может быть пустым" });
    }

    const checkResult = await db.query(
      `SELECT * FROM applications 
             WHERE id = $1 AND user_id = $2`,
      [requestId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Заявка не найдена" });
    }

    const request = checkResult.rows[0];

    if (request.status !== "Обучение завершено") {
      return res.status(400).json({
        error: "Отзыв можно оставить только после завершения обучения",
      });
    }

    await db.query(`UPDATE applications SET feedback = $1 WHERE id = $2`, [
      feedback,
      requestId,
    ]);

    res.json({ message: "Отзыв добавлен!" });
  } catch (error) {
    console.error("Ошибка добавления отзыва:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/transports", async (req, res) => {
  console.log("Запрос на /transports");
  try {
    const result = await db.query("SELECT * FROM transports ORDER BY id");
    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения транспорта:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
