require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const importation = require("./routes/parts/importExcel.route");
const stocksRoute = require("./routes/parts/stocks.route");
const analytics = require("./routes/parts/analytics.route");
const pieces = require("./routes/parts/piece.route");
const userRoutes = require("./routes/user.routes");

const mouvement = require("./routes/stockMouvement.routes");
const manager = require("./routes/manager.routes");
const entrepot = require("./routes/entrepot.routes");
const orderRoutes = require("./routes/commande.routes");
const facture = require("./routes/facture.routes");
const proClientsRoutes = require("./routes/proClients.routes");
const stocks = require("./routes/stock.routes");
const historiqueprix = require("./routes/historiquePrix.routes");
const dashStat = require("./routes/dashboardStat.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/import", importation);
app.use("/api/stock", stocksRoute);
app.use("/api/analytics", analytics);
app.use("/api/pieces", pieces);
app.use("/api/users", userRoutes);

// nouveau conception
app.use("/api/stock-movements", mouvement);
app.use("/api/manager", manager);
app.use("/api/entrepots", entrepot);
app.use("/api/orders", orderRoutes);
app.use("/api/factures", facture);
app.use("/api/pro-clients", proClientsRoutes);
app.use("/api/stocks", stocks);
app.use("/api/produit", historiqueprix);
app.use("/api/dashboard", dashStat);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
