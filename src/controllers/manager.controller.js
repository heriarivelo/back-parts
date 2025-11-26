const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const searchParts = async (req, res) => {
  const { query, oem, marque } = req.query;

  const conditions = [];

  // Recherche large sur "query"
  if (query) {
    conditions.push(
      { referenceCode: { contains: query, mode: "insensitive" } },
      { libelle: { contains: query, mode: "insensitive" } },
      { autoFinal: { contains: query, mode: "insensitive" } },
      {
        importDetails: {
          some: { codeArt: { contains: query, mode: "insensitive" } },
        },
      }
    );
  }

  // Recherche spécifique par OEM
  if (oem) {
    conditions.push({ oem: { contains: oem, mode: "insensitive" } });
  }

  // Recherche spécifique par marque
  if (marque) {
    conditions.push({ marque: { contains: marque, mode: "insensitive" } });
  }

  const results = await prisma.product.findMany({
    where: {
      OR: conditions,
    },
    include: {
      stocks: true,
      importDetails: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const response = results.map((product) => ({
    ...product,
    currentStock: product.stocks.reduce(
      (sum, stock) => sum + stock.quantite,
      0
    ),
    lastPurchasePrice: product.importDetails[0]?.purchasePrice ?? null,
    finalPrice: product.stocks?.[0]?.prixFinal
      ? Number(product.stocks[0].prixFinal)
      : null,
  }));

  res.json(response);
};

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
  searchParts,
  getInvoices,
  getProducts,
  printInvoice,
  createCustomer,
  getCustomers,
};
