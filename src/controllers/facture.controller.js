// src/controllers/facture.controller.ts
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {
  getAllFacturesWithDetails,
  annulerFacture,
} = require("../services/facture.service");

const listFactures = async (req, res) => {
  try {
    const factures = await getAllFacturesWithDetails();
    res.json(factures);
  } catch (error) {
    console.error("Erreur lors de la récupération des factures :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};


const updatePaymentStatus = async (req, res) => {
  try {
    const { invoiId } = req.params;
    const { montant, mode, reference } = req.body;

    const invoiceId = parseInt(invoiId);
    const amountFloat = parseFloat(montant);

    if (isNaN(invoiceId) || isNaN(amountFloat)) {
      return res.status(400).json({ error: "Paramètres invalides." });
    }

    // 1. Récupérer la facture
    const invoice = await prisma.facture.findUnique({
      where: { id: invoiceId },
      include: { commandeVente: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Facture introuvable." });
    }

    // 2. Créer un nouveau paiement
    await prisma.paiement.create({
      data: {
        facture: { connect: { id: invoiceId } },
        montant: amountFloat,
        mode: mode || "CASH",
        reference: reference || `PAY-${Date.now()}`,
        manager: { connect: { id: 2 } }, // à remplacer par req.user.id si disponible
      },
    });

    // 3. Mettre à jour le montant payé et reste à payer
    const updatedInvoice = await prisma.facture.update({
      where: { id: invoiceId },
      data: {
        montantPaye: { increment: amountFloat },
        resteAPayer: { decrement: amountFloat },
        updatedAt: new Date(),
      },
      include: { commandeVente: true },
    });

    // 4. Vérifier le nouveau solde
    let finalStatus = "PARTIELLEMENT_PAYEE";
    let paidAtDate = null;

    if (Math.abs(updatedInvoice.resteAPayer) < 0.01) {
      finalStatus = "PAYEE";
      paidAtDate = new Date();

      // Mettre à jour la commande si la facture est totalement payée
      await prisma.commandeVente.update({
        where: { id: updatedInvoice.commandeId },
        data: { status: "LIVREE" },
      });
    }

    // 5. Mise à jour du statut et paidAt
    await prisma.facture.update({
      where: { id: invoiceId },
      data: {
        status: finalStatus,
        paidAt: paidAtDate,
      },
    });

    // 6. Renvoyer la facture finale
    const finalInvoice = await prisma.facture.findUnique({
      where: { id: invoiceId },
      include: { commandeVente: true },
    });

    res.json(finalInvoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const annulationFacture = async (req, res) => {
  try {
    const { invoiId } = req.params;
    const { raison, userId } = req.body;
    // const userId = 1; // Supposant que l'utilisateur est authentifié

    const id = parseInt(invoiId, 10);

    // Appel du service d'annulation
    const result = await annulerFacture(id, userId, raison);

    // Réponse en cas de succès
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        facture: result.facture,
        montantRembourse: result.montantRembourse,
        details: result.details,
      },
    });
  } catch (error) {
    // Gestion des erreurs
    console.error("Erreur dans le contrôleur annulerFacture:", error);

    const statusCode = error.message.includes("non trouvée")
      ? 404
      : error.message.includes("déjà annulée")
      ? 400
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

module.exports = {
  listFactures,
  updatePaymentStatus,
  annulationFacture,
};
