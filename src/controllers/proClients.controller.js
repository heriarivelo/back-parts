// controllers/proClientsController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Récupérer tous les clients professionnels
exports.getAllProClients = async (req, res) => {
  try {
    const { search, status } = req.query;

    let whereClause = {
      type: "B2B", // Seulement les clients professionnels
    };

    if (search) {
      whereClause.OR = [
        { nom: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { telephone: { contains: search } },
        { siret: { contains: search } },
      ];
    }

    if (status) {
      if (status === "active") {
        // Logique pour déterminer les clients actifs (par exemple, ceux avec des commandes récentes)
        whereClause.commandes = {
          some: {
            createdAt: {
              gte: new Date(new Date() - 90 * 24 * 60 * 60 * 1000), // Commandes dans les 90 derniers jours
            },
          },
        };
      } else if (status === "overdue") {
        // Clients avec des factures en retard
        whereClause.commandes = {
          some: {
            factures: {
              some: {
                status: "NON_PAYEE",
                createdAt: {
                  lt: new Date(new Date() - 30 * 24 * 60 * 60 * 1000), // Factures de plus de 30 jours
                },
              },
            },
          },
        };
      }
    }

    const clients = await prisma.customer.findMany({
      where: whereClause,
      include: {
        commandes: {
          include: {
            factures: true,
            pieces: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5, // Seulement les 5 dernières commandes
        },
      },
      orderBy: {
        nom: "asc",
      },
    });

    // Calculer les stats pour chaque client
    const enrichedClients = clients.map((client) => {
      const totalRevenue = client.commandes.reduce(
        (sum, cmd) => sum + (cmd.totalAmount || 0),
        0
      );
      const lastOrder = client.commandes[0]?.createdAt || null;
      const overdueAmount = client.commandes.reduce((sum, cmd) => {
        return (
          sum +
          cmd.factures.reduce((fSum, fact) => {
            if (
              fact.status === "NON_PAYEE" ||
              fact.status === "PARTIELLEMENT_PAYEE"
            ) {
              return (
                fSum + (fact.resteAPayer || fact.prixTotal - fact.montantPaye)
              );
            }
            return fSum;
          }, 0)
        );
      }, 0);

      return {
        ...client,
        totalRevenue,
        lastOrder,
        overdueAmount,
        status:
          overdueAmount > 0
            ? "En retard"
            : lastOrder && new Date() - lastOrder < 90 * 24 * 60 * 60 * 1000
            ? "Actif"
            : "Inactif",
      };
    });

    res.json(enrichedClients);
  } catch (error) {
    console.error("Error fetching professional clients:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Récupérer les statistiques globales
exports.getProClientsStats = async (req, res) => {
  try {
    // Nombre total de clients pro
    const totalClients = await prisma.customer.count({
      where: { type: "B2B" },
    });

    // Clients actifs (avec commande dans les 90 derniers jours)
    const activeClients = await prisma.customer.count({
      where: {
        type: "B2B",
        commandes: {
          some: {
            createdAt: {
              gte: new Date(new Date() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    // Croissance trimestrielle
    const prevQuarterCount = await prisma.customer.count({
      where: {
        type: "B2B",
        createdAt: {
          gte: new Date(new Date() - 180 * 24 * 60 * 60 * 1000),
          lt: new Date(new Date() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const growthRate =
      prevQuarterCount > 0
        ? Math.round(
            ((activeClients - prevQuarterCount) / prevQuarterCount) * 100
          )
        : 100;

    // CA moyen
    const revenueData = await prisma.commandeVente.aggregate({
      _avg: {
        totalAmount: true,
      },
      where: {
        customer: {
          type: "B2B",
        },
        createdAt: {
          gte: new Date(new Date() - 365 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Commandes ce mois
    const monthlyOrders = await prisma.commandeVente.count({
      where: {
        customer: {
          type: "B2B",
        },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    // Dettes clients
    const overdueInvoices = await prisma.facture.findMany({
      where: {
        commandeVente: {
          customer: {
            type: "B2B",
          },
        },
        status: {
          in: ["NON_PAYEE", "PARTIELLEMENT_PAYEE"],
        },
      },
      select: {
        resteAPayer: true,
        prixTotal: true,
        montantPaye: true,
      },
    });

    const totalDebt = overdueInvoices.reduce((sum, inv) => {
      return sum + (inv.resteAPayer || inv.prixTotal - inv.montantPaye);
    }, 0);

    res.json({
      activeClients,
      growthRate,
      avgRevenue: revenueData._avg.totalAmount || 0,
      monthlyOrders,
      totalDebt,
    });
  } catch (error) {
    console.error("Error fetching pro clients stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Créer un nouveau client professionnel
exports.createProClient = async (req, res) => {
  try {
    const {
      name,
      siret,
      address,
        city,
      activity,
      contactName,
      contactPosition,
      phone,
      email,
      paymentTerms,
      creditLimit,
    } = req.body;

    console.log("ici", name);
    const fullAddress = [address, city]
      .filter(Boolean)
      .join(', ');

    const newClient = await prisma.customer.create({
      data: {
        nom: name,
        siret,
        adresse: fullAddress,
        // postalCode,
        // city,
        type: "B2B",
        telephone: phone,
        email,
        // metadata: {
        //   activity,
        //   contactName,
        //   contactPosition,
        //   paymentTerms: parseInt(paymentTerms) || 30,
        //   creditLimit: parseFloat(creditLimit) || 0,
        // },
      },
    });

    res.status(201).json(newClient);
  } catch (error) {
    console.error("Error creating professional client:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mettre à jour un client professionnel
// server/controllers/proClientsController.js
exports.updateProClient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      siret,
      address,
      city,
      phone,
      email,
    } = req.body;

    // Construire l'adresse complète
    const fullAddress = [address, city]
      .filter(Boolean)
      .join(', ');

    const updatedClient = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        nom: name,
        siret,
        adresse: fullAddress, // ✅ CORRECTION
        telephone: phone,
        email,
      },
    });

    res.json(updatedClient);
  } catch (error) {
    console.error("Error updating professional client:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Récupérer les détails d'un client
exports.getClientDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        commandes: {
          include: {
            factures: true,
            pieces: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Calculer les stats pour le client
    const totalRevenue = client.commandes.reduce(
      (sum, cmd) => sum + (cmd.totalAmount || 0),
      0
    );
    const orderCount = client.commandes.length;
    const lastOrderDate = client.commandes[0]?.createdAt || null;

    const overdueInvoices = client.commandes.flatMap((cmd) =>
      cmd.factures.filter(
        (f) => f.status === "NON_PAYEE" || f.status === "PARTIELLEMENT_PAYEE"
      )
    );

    const balanceDue = overdueInvoices.reduce(
      (sum, inv) => sum + (inv.resteAPayer || inv.prixTotal - inv.montantPaye),
      0
    );

    const enrichedClient = {
      ...client,
      totalRevenue,
      orderCount,
      lastOrderDate,
      balanceDue,
      status:
        balanceDue > 0
          ? "En retard"
          : lastOrderDate &&
            new Date() - lastOrderDate < 90 * 24 * 60 * 60 * 1000
          ? "Actif"
          : "Inactif",
      lastOrders: client.commandes.map((cmd) => ({
        orderId: cmd.id,
        orderNumber: cmd.reference,
        date: cmd.createdAt,
        amount:
          cmd.totalAmount ||
          cmd.pieces.reduce((sum, p) => sum + p.prixArticle * p.quantite, 0),
        status:
          cmd.factures.length > 0
            ? cmd.factures[0].status === "PAYEE"
              ? "Payé"
              : cmd.factures[0].status === "PARTIELLEMENT_PAYEE"
              ? "En attente"
              : "En retard"
            : "En attente",
      })),
      notes: [], // À implémenter si vous avez un système de notes
    };

    res.json(enrichedClient);
  } catch (error) {
    console.error("Error fetching client details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
