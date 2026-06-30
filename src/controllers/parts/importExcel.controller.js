const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  enregistrerImportation,
} = require("../../services/importation.service");
const { buildDateFilter } = require("../../utils/dateFilter");

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
    const {
      page = 1,
      pageSize = 10,
      search = "",
      startDate,
      endDate,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
    const skip = (currentPage - 1) * limit;

    const searchTerm = search.trim();

    const where = {
      ...(searchTerm && {
        OR: [
          {
            fileName: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          // {
          //   status: {
          //     contains: searchTerm,
          //     mode: "insensitive",
          //   },
          // },
        ],
      }),

      ...((startDate || endDate) && {
        importedAt: buildDateFilter(startDate, endDate),
      }),
    };

    const [imports, total] = await Promise.all([
      prisma.import.findMany({
        where,
        orderBy: {
          importedAt: "desc",
        },
        skip,
        take: limit,
        select: {
          id: true,
          fileName: true,
          status: true,
          importedAt: true,
          fretAvecDD: true,
          douane: true,
          tva: true,

          _count: {
            select: {
              parts: true,
            },
          },
        },
      }),

      prisma.import.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      data: imports,
      pagination: {
        total,
        currentPage,
        pageSize: limit,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("Erreur récupération imports:", error);
    res.status(500).json({ error: error.message });
  }
};

const getImportDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      page = 1,
      pageSize = 20,
      search = "",
    } = req.query;

    const importId = Number(id);

    if (!importId || Number.isNaN(importId)) {
      return res.status(400).json({ error: "ID import invalide" });
    }

    const currentPage = Math.max(Number(page) || 1, 1);
    const limit = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const skip = (currentPage - 1) * limit;

    const searchTerm = search.trim();

    const where = {
      importId,

      ...(searchTerm && {
        OR: [
          {
            codeArt: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            marque: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            oem: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            lib1: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      }),
    };

    const [details, total] = await Promise.all([
      prisma.importedPart.findMany({
        where,
        orderBy: {
          id: "asc",
        },
        skip,
        take: limit,
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
      }),

      prisma.importedPart.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      data: details,
      pagination: {
        total,
        currentPage,
        pageSize: limit,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("Erreur détail import:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  create_article_importation,
  importExcel,
  getImports,
  getImportDetails,
};
