const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  annulerImport,
} = require("../services/importation.service");

exports.getListeImportation = async (req, res) => {
  try {
    const imports = await prisma.reapprovisionnement.findMany({
      where: {
        status: 'SHIPPED', // 👈 filtre uniquement ceux qui sont validés
      },
      select: {
        id: true,
        reference: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(imports);
  } catch (error) {
    console.error("Error fetching import:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.getImportedPart = async (req, res) => {
  try {
    const { importId } = req.params;

    const parts = await prisma.reapproItem.findMany({
      where: { reapproId: Number(importId) },
      include: {
        product: true, // 👈 Inclure les infos produit liées
      },
    });

    const transformedParts = parts.map((item) => ({
      code:
        item.product?.codeArt ||
        `ART-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      marque: item.product?.marque || "",
      reference: item.product?.oem || "",
      autofinal: item.product?.autoFinal || "",
      libelle: item.product?.libelle || "",
      quantite: Number(item.quantity) || 1,
      quantiteArrivee: Number(item.product?.qttArrive) || Number(item.quantity) || 1,
      prixUnitaireEur: Number(item.unitPrice) || 0,
      poidsKg: Number(item.weightKg) || 0,
    }));

    res.json(transformedParts);
  } catch (error) {
    console.error("Error fetching parts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

  exports.annulerImport = async (req, res) => {
    const importId = parseInt(req.params.id);

    if (isNaN(importId)) {
      return res.status(400).json({ success: false, message: "ID invalide" });
    }

    try {
      const result = await annulerImport(importId);
      return res.json(result);
    } catch (error) {
      console.error("Erreur annulation import:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

