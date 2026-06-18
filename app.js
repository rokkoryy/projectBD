const express = require("express");
const cors = require("cors");
const db = require("./connect");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require("./auth");
const requestsRoutes = require("./requests");
const adminRoutes = require("./admin");

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Сервер работает!");
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
