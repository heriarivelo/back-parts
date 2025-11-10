const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class OrderService {
  static async getOrders({
    supplierId,
    search,
    page,
    limit,
    sortField,
    sortDirection,
  }) {
    const where = {};

    if (supplierId) where.supplierId = parseInt(supplierId);
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { supplier: { name: { contains: search } } },
      ];
    }

    const orderBy = sortField
      ? { [sortField]: sortDirection || "asc" }
      : undefined;

    const [orders, total] = await Promise.all([
      prisma.reapprovisionnement.findMany({
        where,
        include: {
          supplier: true,
          items: {
            include: {
              product: {
                // Inclure les détails du produit
                select: {
                  id: true,
                  codeArt: true,
                  libelle: true,
                  referenceCode: true,
                  marque: true,
                  oem: true,
                  autoFinal:true,
                },
              },
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.reapprovisionnement.count({ where }),
    ]);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getOrderStats() {
    const [totalOrders, totalAmount, pendingOrders, supplierCount] =
      await Promise.all([
        prisma.reapprovisionnement.count(),
        prisma.reapprovisionnement.aggregate({ _sum: { totalAmount: true } }),
        prisma.reapprovisionnement.count({ where: { status: "DRAFT" } }),
        prisma.supplier.count(),
      ]);

    return {
      totalOrders,
      totalAmount: totalAmount._sum.totalAmount || 0,
      pendingOrders,
      supplierCount,
    };
  }

  static async getOrderDetails(id) {
    return prisma.reapprovisionnement.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: true,
      },
    });
  }

  static async cancelOrder(id) {
    return prisma.reapprovisionnement.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { supplier: true },
    });
  }

  static async getLowStockProducts(threshold = 5, page = 1, pageSize = 10, search = "") {
  try {
    const skip = (page - 1) * pageSize;

    // Condition de recherche dynamique
    const searchFilter = search
      ? {
          OR: [
            { product: { libelle: { contains: search, mode: "insensitive" } } },
            { product: { marque: { contains: search, mode: "insensitive" } } },
            { product: { referenceCode: { contains: search, mode: "insensitive" } } },
            { product: { codeArt: { contains: search, mode: "insensitive" } } },
            { product: { oem: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};

    // WHERE principal
    const whereCondition = {
      quantite: { lte: threshold },
      status: "DISPONIBLE",
      ...searchFilter,
    };

    // Requête principale avec pagination
    const [results, totalCount] = await Promise.all([
      prisma.stock.findMany({
        where: whereCondition,
        select: {
          id: true,
          quantite: true,
          prixFinal: true,
          product: {
            select: {
              id: true,
              referenceCode: true,
              codeArt: true,
              libelle: true,
              oem: true,
              marque: true,
              importDetails: {
                select: {
                  id: true,
                  poids: true,
                  purchasePrice: true,
                },
              },
            },
          },
        },
        orderBy: { quantite: "asc" },
        skip,
        take: pageSize,
      }),
      prisma.stock.count({ where: whereCondition }),
    ]);

    // Pagination
    const totalPages = Math.ceil(totalCount / pageSize);

    // Formatage final
    const formattedResults = results.map((item) => ({
      ...item,
      productId: item.product?.id,
      referenceCode: item.product?.referenceCode,
      libelle: item.product?.libelle,
      oem: item.product?.oem,
      marque: item.product?.marque,
      quantite: item.quantite,
      prixFinal: item.prixFinal,
    }));

    return {
      data: formattedResults,
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
    console.error("Erreur lors de la récupération des stocks faibles :", error);
    throw error;
  }
}


  static async createReappro(
    items,
    status,
    userId,
    totalValue,
    supplierId = null // Rendre supplierId optionnel à la fin
  ) {
    return await prisma.$transaction(async (tx) => {
      console.log("Données reçues:", {
        items,
        status,
        userId,
        totalValue,
        supplierId,
      });

      // Validation des données
      if (!items || !items.length) {
        throw new Error("Aucun produit sélectionné");
      }

      const reappro = await tx.reapprovisionnement.create({
        data: {
          reference: `REA-${Date.now()}`,
          status: status || "DRAFT", // Valeur par défaut
          userId: parseInt(userId),
          totalAmount: parseFloat(totalValue),
          supplierId: supplierId ? parseInt(supplierId) : null,
          items: {
            create: items.map((item) => ({
              productId: parseInt(item.productId),
              quantity: parseInt(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              weightKg: parseFloat(item.weightKg) || 0,
            })),
          },
        },
        include: {
          items: true,
          supplier: true,
        },
      });

      // Mise à jour du statut du stock
      await tx.stock.updateMany({
        where: { productId: { in: items.map((i) => parseInt(i.productId)) } },
        data: { status: "COMMANDE" },
      });

      return reappro;
    });
  }

  static async updateStatus(id, statut) {
    return prisma.reapprovisionnement.update({
      where: { id },
      data: { status: statut },
      include: { supplier: true },
    })
  }
}

module.exports = OrderService;
