const express = require("express");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("SKQ backend is running");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
