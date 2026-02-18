const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/search", (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: "Query não informada" });
    }

    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    res.json({ redirectUrl: googleUrl });
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
