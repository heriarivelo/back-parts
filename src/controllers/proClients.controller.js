// controllers/proClientsController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Récupérer tous les clients professionnels
exports.getAllProClients = async (req, res) => {
  try {
    const { search, status } = req.query;

    // let whereClause = {
    //   type: "B2B" || "RETAIL", // Seulement les clients professionnels
    // };

    if (search) {
      OR = [
        { nom: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { telephone: { contains: search } },
        { siret: { contains: search } },
      ];
    }

    if (status) {
      if (status === "active") {
        // Logique pour déterminer les clients actifs (par exemple, ceux avec des commandes récentes)
        commandes = {
          some: {
            createdAt: {
              gte: new Date(new Date() - 90 * 24 * 60 * 60 * 1000), // Commandes dans les 90 derniers jours
            },
          },
        };
      } else if (status === "overdue") {
        // Clients avec des factures en retard
        commandes = {
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
      // where: whereClause,
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
      const lastOrderDate = client.commandes[0]?.createdAt || null;
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
        lastOrderDate,
        overdueAmount,
        status:
          overdueAmount > 0
            ? "En retard"
            : lastOrderDate && new Date() - lastOrderDate < 90 * 24 * 60 * 60 * 1000
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

exports.getAllClients = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      search = "",
      type = "",
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
    const skip = (currentPage - 1) * limit;
    const searchTerm = search.trim();

    const where = {
      ...(type && { type }),
      ...(searchTerm && {
        OR: [
          { nom: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
          { telephone: { contains: searchTerm } },
          { siret: { contains: searchTerm, mode: "insensitive" } },
          { adresse: { contains: searchTerm, mode: "insensitive" } },
        ],
      }),
    };

    const [clients, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          nom: true,
          type: true,
          telephone: true,
          email: true,
          adresse: true,
          siret: true,
          createdAt: true,
          _count: {
            select: {
              commandes: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      data: clients,
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
    console.error("Erreur liste clients:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Récupérer les statistiques globales
exports.getProClientsStats = async (req, res) => {
  try {
    // Nombre total de clients pro
    const totalClients = await prisma.customer.count();

    // Clients actifs (avec commande dans les 90 derniers jours)
    const activeClients = await prisma.customer.count({
      where: {
        // type: "B2B",
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
        // type: "B2B",
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
        // customer: {
        //   type: "B2B",
        // },
        createdAt: {
          gte: new Date(new Date() - 365 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Commandes ce mois
    const monthlyOrders = await prisma.commandeVente.count({
      where: {
        // customer: {
        //   type: "B2B",
        // },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    // Dettes clients
    const overdueInvoices = await prisma.facture.findMany({
      where: {
        // commandeVente: {
        //   customer: {
        //     type: "B2B",
        //   },
        // },
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

// Créer un nouveau client
exports.createClient = async (req, res) => {
  try {
    const {
      nom,
      type = "RETAIL",
      telephone,
      email,
      adresse,
      siret,
    } = req.body;

    if (!nom?.trim()) {
      return res.status(400).json({ error: "Le nom est obligatoire" });
    }

    if (!telephone?.trim()) {
      return res.status(400).json({ error: "Le téléphone est obligatoire" });
    }

    const client = await prisma.customer.create({
      data: {
        nom: nom.trim(),
        type,
        telephone: telephone.trim(),
        email: email?.trim() || null,
        adresse: adresse?.trim() || null,
        siret: siret?.trim() || null,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.error("Erreur création client:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Mettre à jour un client
exports.updateClient = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      nom,
      type,
      telephone,
      email,
      adresse,
      siret,
    } = req.body;

    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: "ID client invalide" });
    }

    if (!nom?.trim()) {
      return res.status(400).json({ error: "Le nom est obligatoire" });
    }

    if (!telephone?.trim()) {
      return res.status(400).json({ error: "Le téléphone est obligatoire" });
    }

    const client = await prisma.customer.update({
      where: { id },
      data: {
        nom: nom.trim(),
        type,
        telephone: telephone.trim(),
        email: email?.trim() || null,
        adresse: adresse?.trim() || null,
        siret: siret?.trim() || null,
      },
    });

    res.json(client);
  } catch (error) {
    console.error("Erreur modification client:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Récupérer les détails d'un client
exports.getClientDetails = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: "ID client invalide" });
    }

    const client = await prisma.customer.findUnique({
      where: { id },
      include: {
        commandes: {
          include: {
            factures: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: "Client introuvable" });
    }

    const totalRevenue = client.commandes.reduce(
      (sum, cmd) => sum + Number(cmd.totalAmount || 0),
      0
    );

    const balanceDue = client.commandes.reduce((sum, cmd) => {
      return sum + cmd.factures.reduce((fSum, facture) => {
        if (["NON_PAYEE", "PARTIELLEMENT_PAYEE"].includes(facture.status)) {
          return fSum + Number(facture.resteAPayer || 0);
        }
        return fSum;
      }, 0);
    }, 0);

    const lastOrderDate = client.commandes[0]?.createdAt || null;

    res.json({
      ...client,
      totalRevenue,
      orderCount: client.commandes.length,
      lastOrderDate,
      balanceDue,
      lastOrders: client.commandes.map((cmd) => ({
        orderId: cmd.id,
        orderNumber: cmd.reference,
        date: cmd.createdAt,
        amount: cmd.totalAmount,
        status: cmd.status,
      })),
    });
  } catch (error) {
    console.error("Erreur détail client:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

exports.getClientsForExport = async (req, res) => {
  try {
    const clients = await prisma.customer.findMany({
      orderBy: { nom: "asc" },
      select: {
        nom: true,
        telephone: true,
        email: true,
        adresse: true,
        type: true,
      },
    });

    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: "Erreur export clients" });
  }
};

exports.findCustomerByContact = async (req, res) => {
  try {
    const { telephone, email } = req.query;

    if (!telephone && !email) {
      return res.json(null);
    }

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          ...(telephone ? [{ telephone: String(telephone).trim() }] : []),
          ...(email ? [{ email: String(email).trim().toLowerCase() }] : []),
        ],
      },
      select: {
        id: true,
        nom: true,
        type: true,
        telephone: true,
        email: true,
        adresse: true,
        siret: true,
      },
    });

    res.json(customer || null);
  } catch (error) {
    console.error("Erreur recherche client:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
