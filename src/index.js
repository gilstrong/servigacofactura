const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const publicDir = path.join(__dirname, "..", "..", "public");

app.use(express.json());
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "calculadora_general.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
