const { clearDatabaseExceptUsers } = require("../services/suppression.service");

const cleanDb = async (req, res) => {
  try {
    await clearDatabaseExceptUsers();
    res.json({
      success: true,
      message: "Base de données nettoyée (sauf table User)",
    });
  } catch (error) {
    console.error("Erreur :", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { cleanDb };
