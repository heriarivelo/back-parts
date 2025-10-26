const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const orderService = require("../services/order.service");

const getCommandesHistorique = async (req, res) => {
  try {
    // Récupération des paramètres de pagination depuis la requête
    const page = parseInt(req.query.page) || 1; // Page par défaut : 1
    const pageSize = parseInt(req.query.pageSize) || 10; // Taille par défaut : 10 éléments

    // Calcul du nombre d'éléments à sauter
    const skip = (page - 1) * pageSize;

    // Requête avec pagination
    const [commandes, totalCount] = await Promise.all([
      prisma.commandeVente.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          manager: true,
          pieces: {
            include: {
              product: true,
            },
          },
          factures: {
            include: {
              remises: true,
              paiements: true,
            },
          },
        },
        skip: skip,
        take: pageSize,
      }),
      prisma.commandeVente.count(), // Compte total pour calculer le nombre de pages
    ]);

    // Calcul des métadonnées de pagination
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    res.json({
      data: commandes,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
        hasNext,
        hasPrevious,
      },
    });
  } catch (error) {
    console.error("Erreur historique commande:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const previewInvoice = async (req, res) => {
  try {
    const preview = await orderService.previewInvoice(req.body);
    res.json(preview);
  } catch (error) {
    console.error("Error previewing invoice:", error);
    res.status(500).json({ error: "Erreur lors de la prévisualisation" });
  }
};

const getAllCommandes = async (req, res) => {
  try {
    const commandes = await orderService.getAllCommandes();
    res.status(200).json(commandes);
  } catch (error) {
    console.error("Erreur dans getAllCommandes:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des commandes.",
      error: error.message,
    });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const order = await prisma.commandeVente.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        pieces: {
          include: {
            product: {
              include: {
                stocks: true,
                importDetails: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
        factures: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    // Calcul des totaux pour la commande
    const totals = {
      subtotal: order.pieces.reduce(
        (sum, item) => sum + item.quantite * item.prixArticle,
        0
      ),
      itemsCount: order.pieces.length,
      alreadyInvoiced: order.factures.reduce(
        (sum, facture) => sum + facture.prixTotal,
        0
      ),
    };

    res.json({
      ...order,
      totals,
    });
  } catch (error) {
    res.status(500).json({
      error: "Erreur lors de la récupération de la commande",
      details: error.message,
    });
  }
};

const createOrders = async (req, res) => {
  console.log(
    "Début createOrders - Body reçu:",
    JSON.stringify(req.body, null, 2)
  ); // Debug 1

  try {
    const {
      customerType = "B2B",
      customerId = null,
      managerId,
      items,
      info = {},
    } = req.body;

    // Debug 2 - Vérification des données
    console.log("Données extraites:", {
      customerType,
      customerId,
      managerId,
      itemsCount: items?.length,
      info,
    });

    // 1. Validation renforcée
    if (!managerId) {
      console.error("Erreur: managerId manquant");
      return res.status(400).json({ error: "managerId est obligatoire" });
    }

    if (!items?.length) {
      console.error("Erreur: aucun article fourni");
      return res
        .status(400)
        .json({ error: "Au moins un article est obligatoire" });
    }

    // 2. Calcul du total
    const totalAmount = items.reduce(
      (sum, item) =>
        sum + (parseFloat(item.unitPrice) || 0) * (item.quantity || 1),
      0
    );

    // 3. Transaction
    const order = await prisma.$transaction(async (tx) => {
      let finalCustomerId = customerId;
      console.log("customerId initial:", finalCustomerId); // Debug 3

      // Gestion du client si customerId non fourni
      if (!finalCustomerId) {
        console.log("Recherche/création client..."); // Debug 4

        const tel = info.contact?.trim();
        const email = info.email?.trim().toLowerCase();
        const nom = info.nom?.trim();

        console.log("Infos client normalisées:", { tel, email, nom }); // Debug 5

        // Recherche client existant
        if (tel || email) {
          const whereClause = { OR: [] };
          if (tel) whereClause.OR.push({ telephone: tel });
          if (email) whereClause.OR.push({ email });

          console.log(
            "Requête findFirst:",
            JSON.stringify(whereClause, null, 2)
          ); // Debug 6

          const existingClient = await tx.customer.findFirst({
            where: whereClause,
          });

          if (existingClient) {
            finalCustomerId = existingClient.id;
            console.log("Client existant trouvé:", existingClient); // Debug 7
          }
        }

        // Création nouveau client
        if (!finalCustomerId && nom && (tel || email)) {
          console.log("Création nouveau client..."); // Debug 8

          const clientData = {
            nom,
            type: customerType,
            telephone: tel || null,
            email: email || null,
            siret: info.nif?.trim() || null,
            adresse: info.adresse?.trim() || null,
          };

          console.log("Data client:", clientData); // Debug 9

          try {
            const newClient = await tx.customer.create({
              data: clientData,
            });
            finalCustomerId = newClient.id;
            console.log("Nouveau client créé:", newClient); // Debug 10
          } catch (e) {
            console.error("Erreur création client:", e); // Debug 11
          }
        }
      }

      console.log("finalCustomerId avant création commande:", finalCustomerId); // Debug 12

      // Création commande
      const newOrder = await tx.commandeVente.create({
        data: {
          reference: `CMD-${Date.now()}`,
          customerId: finalCustomerId,
          managerId,
          totalAmount,
          type: customerType,
          status: "EN_ATTENTE",
          libelle:
            info.nom && !finalCustomerId
              ? `Client occasionnel: ${info.nom}`
              : null,
          pieces: {
            create: items.map((item) => ({
              productId: item.productId,
              quantite: item.quantity,
              prixArticle: parseFloat(item.unitPrice) || 0,
            })),
          },
        },
        include: { pieces: true },
      });

      console.log("Commande créée:", newOrder); // Debug 13

      // Réservation stock
      await tx.stockMovement.createMany({
        data: items.map((item) => ({
          productId: item.productId,
          quantity: -item.quantity,
          type: "COMMANDE",
          source: `Commande: ${newOrder.reference}`,
          reason: info.vehicule ? `Véhicule: ${info.vehicule}` : null,
        })),
      });

      return newOrder;
    });

    // Réponse
    res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Erreur complète:", error); // Debug 14
    res.status(500).json({
      success: false,
      error: "Échec de la création",
      details: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};


const validateOrder = async (req, res) => {
  console.log("\n=== DEBUT validateOrder ===");
  // console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  try {
    const { orderId } = req.params;
    const { paymentDetails, discounts, pieces } = req.body;

    // Validation renforcée
    if (!paymentDetails?.managerId) {
      throw new Error("Manager ID est requis");
    }

    // Récupération de la commande
    const order = await prisma.commandeVente.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        pieces: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Commande ${orderId} non trouvée`);
    }

    // Vérification des pièces
    if (!pieces?.length || pieces.length !== order.pieces.length) {
      throw new Error("Configuration des pièces invalide");
    }

    // Calcul des totaux
    const total = order.totalAmount || 0;
    const discountAmount =
      discounts?.reduce(
        (sum, d) =>
          d.type === "percentage"
            ? sum + (total * d.value) / 100
            : sum + d.value,
        0
      ) || 0;

    const finalAmount = total - discountAmount;
    const paidAmount = paymentDetails.amount || 0;

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Création facture
      const invoice = await tx.facture.create({
        data: {
          referenceFacture: req.body.referenceFacture || `FAC-${Date.now()}`,
          commandeVente: { connect: { id: order.id } },
          prixTotal: finalAmount,
          montantPaye: paidAmount,
          resteAPayer: finalAmount - paidAmount,
          status:
            paidAmount >= finalAmount
              ? "PAYEE"
              : paidAmount > 0
              ? "PARTIELLEMENT_PAYEE"
              : "NON_PAYEE",
          paidAt: paidAmount >= finalAmount ? new Date() : null,
          remises: discounts?.length
            ? {
                create: discounts.map((d) => ({
                  description: d.description,
                  taux: d.type === "percentage" ? d.value : null,
                  montant: d.type === "fixed" ? d.value : null,
                  type:
                    d.type === "percentage" ? "POURCENTAGE" : "MONTANT_FIXE",
                })),
              }
            : undefined,
          createdBy: { connect: { id: paymentDetails.managerId } },
        },
      });

      // Paiement
      if (paidAmount > 0) {
        await tx.paiement.create({
          data: {
            facture: { connect: { id: invoice.id } },
            montant: paidAmount,
            mode: paymentDetails.method,
            reference: paymentDetails.reference,
            manager: { connect: { id: paymentDetails.managerId } },
          },
        });
      }

      // Gestion des stocks
      for (const piece of pieces) {
        await processStock(tx, piece, invoice);
      }

      // Mise à jour commande
      await tx.commandeVente.update({
        where: { id: order.id },
        data: { status: paidAmount >= finalAmount ? "LIVREE" : "TRAITEMENT" },
      });

      return { success: true, invoice };
    });

    console.log("=== TRANSACTION REUSSIE ===");
    res.status(201).json(result);
  } catch (error) {
    console.error("ERREUR:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
    res.status(500).json({
      error: error.message.includes("Stock") ? error.message : "Erreur serveur",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

async function processStock(tx, piece, invoice) {
  try {
    console.log(
      `Traitement du produit ${piece.productId} dans l'entrepôt ${
        piece.entrepotId || "aucun"
      }`
    );

    // 1. Trouver le stock global du produit
    const globalStock = await tx.stock.findFirst({
      where: {
        productId: piece.productId,
        quantite: { gte: piece.quantite },
      },
    });

    if (!globalStock) {
      throw new Error(
        `Stock global insuffisant pour le produit ${piece.productId}`
      );
    }

    // 2. Mise à jour du stock global
    await tx.stock.update({
      where: { id: globalStock.id },
      data: {
        quantite: { decrement: piece.quantite },
        quantiteVendu: { increment: piece.quantite },
      },
    });

    // 3. Si un entrepôt est spécifié
    if (piece.entrepotId) {
      // Trouver le stock spécifique à l'entrepôt
      const stockEntrepot = await tx.stockEntrepot.findFirst({
        where: {
          stockId: globalStock.id, // Utilisez stockId au lieu de productId
          entrepotId: piece.entrepotId,
          quantite: { gte: piece.quantite },
        },
      });

      if (!stockEntrepot) {
        throw new Error(
          `Stock insuffisant dans l'entrepôt ${piece.entrepotId} pour le produit ${piece.productId}`
        );
      }

      // Mise à jour du stock de l'entrepôt
      await tx.stockEntrepot.update({
        where: { id: stockEntrepot.id },
        data: { quantite: { decrement: piece.quantite } },
      });
    }

    // 4. Enregistrer le mouvement de stock
    await tx.stockMovement.create({
      data: {
        productId: piece.productId,
        type: "SALE",
        quantity: -piece.quantite,
        source: piece.entrepotId
          ? `FACTURE:${invoice.id}|ENTREPOT:${piece.entrepotId}`
          : `FACTURE:${invoice.id}`,
        reason: `Vente ${invoice.referenceFacture}`,
      },
    });
  } catch (error) {
    console.error(
      `Erreur lors du traitement du stock pour le produit ${piece.productId}:`,
      error
    );
    throw error; // Important: propager l'erreur pour annuler la transaction
  }
}

module.exports = {
  getCommandesHistorique,
  createOrders,
  // createOrder,
  previewInvoice,
  // createCommande,
  getAllCommandes,
  getOrderDetails,
  validateOrder,
};
