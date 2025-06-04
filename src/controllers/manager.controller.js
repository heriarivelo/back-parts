const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Création d'une commande
// const createOrder = async (req, res) => {
//   try {
//     const { customerId, items, notes } = req.body;
//     const managerId = req.user.id;

//     // Calcul du prix total
//     const orderTotal = items.reduce((total, item) => {
//       return total + item.quantity * item.unitPrice;
//     }, 0);

//     // Création de la commande
//     const order = await prisma.commandeVente.create({
//       data: {
//         reference: `CMD-${Date.now()}`,
//         customerId: customerId || null,
//         managerId,
//         libelle: notes,
//         totalAmount: orderTotal,
//         pieces: {
//           create: items.map((item) => ({
//             productId: item.productId,
//             quantite: item.quantity,
//             prixArticle: item.unitPrice,
//           })),
//         },
//       },
//       include: { pieces: true },
//     });

//     // Mise à jour des stocks
//     await Promise.all(
//       items.map((item) =>
//         prisma.stock.update({
//           where: { productId: item.productId },
//           data: {
//             quantite: { decrement: item.quantity },
//             quantiteReserve: { increment: item.quantity },
//           },
//         })
//       )
//     );

//     res.status(201).json(order);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// Recherche de pièces (avec gestion des codes multiples)
const searchParts = async (req, res) => {
  const { query, oem, marque } = req.query;

  const results = await prisma.product.findMany({
    where: {
      OR: [
        { oem: { contains: oem || "" } },
        { marque: { contains: marque || "" } },
        { referenceCode: { contains: query || "" } },
        { importDetails: { some: { codeArt: { contains: query || "" } } } },
      ],
    },
    include: {
      stocks: true,
      importDetails: {
        orderBy: { createdAt: "desc" }, // <-- Correction ici
        take: 1,
      },
    },
  });

  res.json(
    results.map((product) => ({
      ...product,
      currentStock: product.stocks.reduce(
        (sum, stock) => sum + stock.quantite,
        0
      ),
      lastPurchasePrice: product.importDetails[0]?.purchasePrice,
    }))
  );
};

// // Création de facture
// const createInvoice = async (req, res) => {
//   const { orderId, discounts = [] } = req.body;

//   const order = await prisma.commandeVente.findUnique({
//     where: { id: orderId },
//     include: { pieces: true },
//   });

//   if (!order) {
//     return res.status(404).json({ error: "Commande non trouvée" });
//   }

//   // Calcul des totaux avec remises
//   const invoice = await prisma.facture.create({
//     data: {
//       referenceFacture: `FAC-${Date.now()}`,
//       commandeId: orderId,
//       prixTotal: order.totalAmount,
//       userId: req.user.id,
//       remises: {
//         create: discounts.map((d) => ({
//           description: d.description,
//           taux: d.type === "percentage" ? d.value : null,
//           montant: d.type === "fixed" ? d.value : null,
//           type: d.type === "percentage" ? "POURCENTAGE" : "MONTANT_FIXE",
//         })),
//       },
//     },
//     include: { remises: true },
//   });

//   res.status(201).json(invoice);
// };

// Facture complète avec gestion de paiement
// const generateFullInvoice = async (req, res) => {
//   try {
//     const { orderId, paymentDetails, discounts = [] } = req.body;
//     const userId = req.user.id;

//     // Récupération de la commande
//     const order = await prisma.commandeVente.findUnique({
//       where: { id: orderId },
//       include: { pieces: { include: { product: true } } },
//     });

//     if (!order) {
//       return res.status(404).json({ error: "Commande introuvable" });
//     }

//     // Calcul des totaux
//     const subtotal = order.pieces.reduce(
//       (sum, item) => sum + item.quantite * item.prixArticle,
//       0
//     );

//     // Application des remises
//     const discountAmount = discounts.reduce((total, discount) => {
//       return discount.type === "percentage"
//         ? total + (subtotal * discount.value) / 100
//         : total + discount.value;
//     }, 0);

//     const totalAmount = subtotal - discountAmount;

//     // Création de la facture
//     const invoice = await prisma.facture.create({
//       data: {
//         referenceFacture: `FAC-${Date.now().toString().slice(-6)}`,
//         commandeId: orderId,
//         prixTotal: totalAmount,
//         montantPaye: paymentDetails?.amount || 0,
//         resteAPayer: totalAmount - (paymentDetails?.amount || 0),
//         status:
//           paymentDetails?.amount === totalAmount
//             ? "PAYEE"
//             : paymentDetails?.amount > 0
//             ? "PARTIELLEMENT_PAYEE"
//             : "NON_PAYEE",
//         userId,
//         paidAt: paymentDetails?.amount === totalAmount ? new Date() : null,
//         remises: {
//           create: discounts.map((d) => ({
//             description: d.description,
//             taux: d.type === "percentage" ? d.value : null,
//             montant: d.type === "fixed" ? d.value : null,
//             type: d.type === "percentage" ? "POURCENTAGE" : "MONTANT_FIXE",
//           })),
//         },
//         paiements:
//           paymentDetails?.amount > 0
//             ? {
//                 create: {
//                   montant: paymentDetails.amount,
//                   mode: paymentDetails.method || "ESPECES",
//                   reference: paymentDetails.reference || "",
//                   enregistrePar: userId,
//                 },
//               }
//             : undefined,
//       },
//       include: {
//         remises: true,
//         paiements: true,
//         commandeVente: {
//           include: {
//             pieces: {
//               include: { product: true },
//             },
//           },
//         },
//       },
//     });

//     // Mise à jour du statut de la commande
//     await prisma.commandeVente.update({
//       where: { id: orderId },
//       data: { status: "LIVREE" },
//     });

//     res.status(201).json(invoice);
//   } catch (error) {
//     res.status(500).json({
//       error: "Erreur lors de la génération de la facture",
//       details: error.message,
//     });
//   }
// };

// Récupération des factures avec filtres
const getInvoices = async (req, res) => {
  const { status, startDate, endDate, customerId } = req.query;

  const invoices = await prisma.facture.findMany({
    where: {
      status: status ? { equals: status } : undefined,
      createdAt: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
      commandeVente: {
        customerId: customerId ? parseInt(customerId) : undefined,
      },
    },
    include: {
      remises: true,
      paiements: true,
      commandeVente: {
        include: {
          customer: true,
          pieces: {
            include: { product: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(invoices);
};

// const addPayment = async (req, res) => {
//   const { invoiceId, amount, method, reference } = req.body;
//   const userId = req.user.id;

//   try {
//     const newStatus = await getNewInvoiceStatus(parseInt(invoiceId));

//     const invoice = await prisma.facture.update({
//       where: { id: parseInt(invoiceId) },
//       data: {
//         montantPaye: { increment: parseFloat(amount) },
//         resteAPayer: { decrement: parseFloat(amount) },
//         status: newStatus,
//         paiements: {
//           create: {
//             montant: parseFloat(amount),
//             mode: method,
//             reference,
//             enregistrePar: userId,
//           },
//         },
//       },
//       include: { paiements: true },
//     });

//     res.json(invoice);
//   } catch (error) {
//     console.error("Erreur lors de l’ajout du paiement :", error);
//     res
//       .status(500)
//       .json({ error: "Une erreur est survenue lors de l'ajout du paiement." });
//   }
// };

// Fonction helper pour déterminer le statut
async function getNewInvoiceStatus(invoiceId) {
  const invoice = await prisma.facture.findUnique({
    where: { id: invoiceId },
  });

  if (invoice.montantPaye + amount >= invoice.prixTotal) {
    return "PAYEE";
  } else if (invoice.montantPaye + amount > 0) {
    return "PARTIELLEMENT_PAYEE";
  }
  return "NON_PAYEE";
}

// Ajoutez cette fonction à votre controller
// const getOrderDetails = async (req, res) => {
//   try {
//     const orderId = parseInt(req.params.id);

//     const order = await prisma.commandeVente.findUnique({
//       where: { id: orderId },
//       include: {
//         customer: true,
//         pieces: {
//           include: {
//             product: {
//               include: {
//                 stocks: true,
//                 importDetails: {
//                   orderBy: { createdAt: "desc" },
//                   take: 1,
//                 },
//               },
//             },
//           },
//         },
//         factures: true,
//       },
//     });

//     if (!order) {
//       return res.status(404).json({ error: "Commande non trouvée" });
//     }

//     // Calcul des totaux pour la commande
//     const totals = {
//       subtotal: order.pieces.reduce(
//         (sum, item) => sum + item.quantite * item.prixArticle,
//         0
//       ),
//       itemsCount: order.pieces.length,
//       alreadyInvoiced: order.factures.reduce(
//         (sum, facture) => sum + facture.prixTotal,
//         0
//       ),
//     };

//     res.json({
//       ...order,
//       totals,
//     });
//   } catch (error) {
//     res.status(500).json({
//       error: "Erreur lors de la récupération de la commande",
//       details: error.message,
//     });
//   }
// };

// Récupération des produits avec filtres
const getProducts = async (req, res) => {
  try {
    const { search, marque, oem, inStock } = req.query;

    const products = await prisma.product.findMany({
      where: {
        AND: [
          {
            OR: [
              { referenceCode: { contains: search || "" } },
              { oem: { contains: oem || "" } },
              { libelle: { contains: search || "" } },
            ],
          },
          { marque: marque ? { equals: marque } : undefined },
          inStock === "true"
            ? {
                stocks: { some: { quantite: { gt: 0 } } },
              }
            : {},
        ],
      },
      include: {
        stocks: true,
        importDetails: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      take: 50,
    });

    res.json(
      products.map((p) => ({
        ...p,
        totalStock: p.stocks.reduce((sum, s) => sum + s.quantite, 0),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// // Mise à jour du statut de paiement
// const updatePaymentStatus = async (req, res) => {
//   try {
//     const { invoiceId } = req.params;
//     const { status, amountPaid } = req.body;

//     const invoice = await prisma.b2BInvoice.update({
//       where: { id: parseInt(invoiceId) },
//       data: {
//         status,
//         paidAt: status === "PAID" ? new Date() : null,
//         payments:
//           status === "PAID"
//             ? {
//                 create: {
//                   amount: parseFloat(amountPaid),
//                   method: "ESPECES", // À adapter
//                   reference: `PAY-${Date.now()}`,
//                   userId: req.user.id,
//                 },
//               }
//             : undefined,
//       },
//       include: { order: true },
//     });

//     // Mise à jour du statut de la commande si complètement payée
//     if (status === "PAID") {
//       await prisma.b2BOrder.update({
//         where: { id: invoice.orderId },
//         data: { status: "COMPLETED" },
//       });
//     }

//     res.json(invoice);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// Gestion des clients
const getCustomers = async (req, res) => {
  try {
    const { type, search } = req.query;

    const customers = await prisma.customer.findMany({
      where: {
        type: type ? { equals: type } : undefined,
        OR: [
          { name: { contains: search || "" } },
          { phone: { contains: search || "" } },
          { email: { contains: search || "" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, type } = req.body;

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        type: type || "RETAIL",
        createdAt: new Date(),
      },
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Génération de facture PDF
const printInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.b2BInvoice.findUnique({
      where: { id: parseInt(invoiceId) },
      include: {
        order: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
        account: true,
      },
    });

    // Configuration PDF (utilisez pdfkit ou autre librairie)
    const doc = new PDFDocument();
    let filename = `facture_${invoice.reference}.pdf`;
    filename = encodeURIComponent(filename);

    res.setHeader("Content-disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-type", "application/pdf");

    // Génération du contenu PDF
    doc.fontSize(25).text("Facture", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Client: ${invoice.account.companyName}`);
    // ... ajoutez le reste des détails

    doc.pipe(res);
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  // getOrderDetails,
  // addPayment,
  // createOrder,
  searchParts,
  // createInvoice,
  // generateFullInvoice,
  getInvoices,
  getProducts,
  printInvoice,
  createCustomer,
  getCustomers,
  // updatePaymentStatus,
};
