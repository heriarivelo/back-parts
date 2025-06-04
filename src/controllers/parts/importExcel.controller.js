const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  enregistrerImportation,
} = require("../../services/importation.service");

const create_article_importation = async (req, res) => {
  try {
    const {
      description,
      marge,
      fretAvecDD,
      fretSansDD,
      douane,
      tva,
      tauxDeChange,
      fileName,
      importation,
    } = req.body;
    const status = "Importée";

    // Validation des données
    if (!description || marge == null || !Array.isArray(importation)) {
      return res
        .status(400)
        .json({ message: "Champs requis manquants ou invalides." });
    }

    // Démarrer une transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Création de l'import
      const importRecord = await prisma.import.create({
        data: {
          description,
          marge,
          fretAvecDD: fretAvecDD || 0,
          fretSansDD: fretSansDD || 0,
          douane: douane || 0,
          tva: tva || 0,
          tauxDeChange: tauxDeChange || 1,
          fileName: fileName || "",
          status,
          importedAt: new Date(),
        },
      });

      // Traitement de chaque article importé
      for (const item of importation) {
        if (!item.CODE_ART) continue;

        // Création ou mise à jour du produit
        const product = await prisma.product.upsert({
          where: { codeArt: item.CODE_ART },
          update: {
            marque: item.marque || undefined,
            oem: item.oem || undefined,
            autoFinal: item.auto_final || undefined,
            lib: item.LIB1 || undefined,
          },
          create: {
            codeArt: item.CODE_ART,
            marque: item.marque || "",
            oem: item.oem || "",
            autoFinal: item.auto_final || "",
            lib: item.LIB1 || "",
          },
        });

        // Création de la partie importée
        await prisma.importedPart.create({
          data: {
            importId: importRecord.id,
            codeArt: item.CODE_ART,
            marque: item.marque || "",
            oem: item.oem || "",
            autoFinal: item.auto_final || "",
            lib1: item.LIB1 || "",
            quantity: item.Qte || 0,
            qttArrive: item.qte_arv || 0,
            poids: item.POIDS_NET || 0,
            purchasePrice: item.PRIX_UNIT || 0,
            salePrice: item.prix_de_vente || 0,
            margin: marge || 0,
          },
        });

        // Création ou mise à jour du stock
        await prisma.stock.upsert({
          where: { codeArt: item.CODE_ART },
          update: {
            quantite: { increment: item.qte_arv || 0 },
            prixFinal: item.prix_de_vente || undefined,
            lib1: item.LIB1 || undefined,
          },
          create: {
            codeArt: item.CODE_ART,
            lib1: item.LIB1 || "",
            quantite: item.qte_arv || 0,
            quantiteVendu: 0,
            prixFinal: item.prix_de_vente || 0,
            entrepots: 0,
          },
        });
      }

      return { importId: importRecord.id };
    });

    return res.status(200).json({
      message: "Importation insérée avec succès.",
      import_id: result.importId,
    });
  } catch (error) {
    console.error("Erreur lors de l'importation:", error);
    return res.status(500).json({
      message: "Erreur serveur.",
      error: error.message,
    });
  }
};

const importExcel = async (req, res) => {
  try {
    const { importData, importParts } = req.body;

    // Validation minimale des données
    if (!importData || !importParts) {
      return res.status(400).json({
        success: false,
        message: "Les données importData et importParts sont requises",
      });
    }

    const result = await enregistrerImportation(importData, importParts);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        importId: result.importId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Erreur dans le contrôleur:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

// imports.controller.js
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

const getImports = async (req, res) => {
  try {
    const imports = await prisma.import.findMany({
      include: {
        parts: true,
      },
      orderBy: {
        importedAt: "desc",
      },
    });

    res.json(imports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getImportDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const details = await prisma.importedPart.findMany({
      where: { importId: Number(id) },
      select: {
        id: true,
        codeArt: true,
        marque: true,
        oem: true,
        lib1: true,
        quantity: true,
        qttArrive: true,
        purchasePrice: true,
        salePrice: true,
        margin: true,
        poids: true,
      },
    });

    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create_article_importation,
  importExcel,
  getImports,
  getImportDetails,
};
