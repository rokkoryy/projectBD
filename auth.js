const express = require("express");
const bcrypt = require("bcrypt");
const db = require("./connect");

const router = express.Router();

// Регистрация
router.post("/register", async (req, res) => {
  try {
    const { login, password, name, lastName, middleName, email, phone } =
      req.body;

    console.log("Получены данные:", {
      login,
      name,
      lastName,
      middleName,
      email,
      phone,
    });

    if (!login || !password || !name || !lastName || !email || !phone) {
      return res
        .status(400)
        .json({ error: "Все поля обязательны для заполнения" });
    }

    if (login.length < 6) {
      return res
        .status(400)
        .json({ error: "Логин должен быть минимум 6 символов" });
    }
    if (!/^[a-zA-Z0-9]+$/.test(login)) {
      return res.status(400).json({
        error: "Логин может содержать только латинские буквы и цифры",
      });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Пароль должен быть минимум 8 символов" });
    }

    if (!email.includes("@")) {
      return res.status(400).json({ error: "Введите корректный email" });
    }

    if (phone.length < 10) {
      return res
        .status(400)
        .json({ error: "Введите корректный номер телефона" });
    }

    // Проверяем не занят ли логин
    const checkUser = await db.query(
      "SELECT * FROM users_creds WHERE login = $1",
      [login]
    );

    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: "Этот логин уже занят" });
    }

    // Проверяем не занят ли email
    const checkEmail = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: "Этот email уже зарегистрирован" });
    }

    // Шифруем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Сохраняем пользователя в таблицу users с ролью 3 (Пользователь)
    const userResult = await db.query(
      `INSERT INTO users (name, middlename, surname, email, phone, user_role_id) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
      [name, middleName || "", lastName, email, phone, 3]
    );

    const userId = userResult.rows[0].id;

    // Сохраняем логин и пароль в users_creds
    await db.query(
      `INSERT INTO users_creds (user_id, login, pass) 
             VALUES ($1, $2, $3)`,
      [userId, login, hashedPassword]
    );

    res.status(201).json({
      userId: userId,
    });
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      details: error.message,
    });
  }
});

// Вход
router.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body;

    console.log("Попытка входа:", { login });

    if (!login || !password) {
      return res.status(400).json({ error: "Введите логин и пароль" });
    }

    const result = await db.query(
      `SELECT uc.*, u.name, u.middlename, u.surname, u.email, u.phone, u.user_role_id 
             FROM users_creds uc
             JOIN users u ON uc.user_id = u.id
             WHERE uc.login = $1`,
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.pass);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    res.json({
      success: true,
      userId: user.user_id,
      roleId: user.user_role_id,
    });
  } catch (error) {
    console.error("Ошибка входа:", error);
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      details: error.message,
    });
  }
});

module.exports = router;
