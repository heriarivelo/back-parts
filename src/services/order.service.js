const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class OrderService {
  async previewInvoice(dto) {
    // Calculer le sous-total
    console.log("preview", dto);
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0);
    const total = subtotal;
    const tax = total * 0.2; // Exemple TVA 20%

    return {
      subtotal,
      total,
      tax,
      items: dto.items.map((item) => ({
        ...item,
        total: item.unitPrice * item.quantity,
      })),
    };
  }

async getAllCommandes({ page = 1, pageSize = 10, search = "" } = {}) {
  try {
    page = Math.max(Number(page) || 1, 1);
    pageSize = Math.min(Math.max(Number(pageSize) || 10, 1), 100);

    const skip = (page - 1) * pageSize;
    const searchTerm = search.trim();

    const where = {
      status: "EN_ATTENTE",
      ...(searchTerm && {
        OR: [
          { reference: { contains: searchTerm } },
          { customer: { nom: { contains: searchTerm } } },
          { customer: { telephone: { contains: searchTerm } } },
          { customer: { email: { contains: searchTerm } } },
        ],
      }),
    };

    const [commandes, totalCount] = await Promise.all([
      prisma.commandeVente.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          reference: true,
          createdAt: true,
          status: true,
          totalAmount: true,
          type: true,
          commandetype: true,

          customer: {
            select: {
              id: true,
              nom: true,
              telephone: true,
              email: true,
            },
          },

          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },

          _count: {
            select: {
              pieces: true,
              factures: true,
            },
          },
        },
      }),

      prisma.commandeVente.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: commandes,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes :", error);
    throw new Error("Impossible de récupérer les commandes");
  }
}


async getClientProCommandeWithDetails(orderId) {
  // Utiliser findUnique au lieu de findMany pour récupérer un seul objet
  const commande = await prisma.commandeVente.findUnique({
    where: { 
      id: orderId 
    },
    include: {
      pieces: {
        include: {
          product: true,
          customProduct: true
        }
      },
      factures: {
        include: {
          remises: true,
          paiements: true,
        },
      },
    }
  });

  if (!commande) {
    return null;
  }

  // Transformer les pièces
  const pieces = (commande.pieces || []).map(piece => {
    const unified = piece.product || piece.customProduct || null;
    return {
      ...piece,
      product: unified
    };
  });

  // Retourner un objet unique, pas un tableau
  return {
    ...commande,
    pieces
  };
}


}

module.exports = new OrderService();
