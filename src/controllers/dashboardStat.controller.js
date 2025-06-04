const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getDashboardStats = async (req, res) => {
  try {
    // 1. Ventes totales (Prisma aggregate retourne un Decimal, pas de problème)
    const totalSales = await prisma.facture.aggregate({
      _sum: { prixTotal: true },
      where: {
        status: "PAYEE",
        createdAt: {
          gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        },
      },
    });

    // 2. Ventes mensuelles (Raw query peut retourner BigInt)
    const monthlySales = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        SUM(prix_total)::TEXT as amount 
      FROM "Facture"
      WHERE "status" = 'PAYEE'
      GROUP BY month
      ORDER BY month
      LIMIT 12
    `;

    // 3. Produits les plus vendus
    const topProducts = await prisma.$queryRaw`
      SELECT 
        p."libelle" as productName,
        SUM(pc."quantite")::TEXT as sales 
      FROM "PiecesCommande" pc
      JOIN "Product" p ON pc.product_id = p.id
      JOIN "CommandeVente" cv ON pc.commande_id = cv.id
      JOIN "Facture" f ON cv.id = f.commande_id
      WHERE f."status" = 'PAYEE'
      GROUP BY p."libelle"
      ORDER BY sales DESC
      LIMIT 5
    `;

    // 4. Alertes de stock (Pas de BigInt ici)
    const stockAlerts = await prisma.product.findMany({
      where: { stocks: { some: { quantite: { lt: 5 } } } },
      select: { libelle: true, stocks: { select: { quantite: true } } },
      take: 5,
    });

    // 5. Tendance du chiffre d'affaires
    const revenueTrend = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        SUM("prix_total")::TEXT as amount 
      FROM "Facture"
      WHERE "status" = 'PAYEE' AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date
    `;

    // 6. Croissance clientèle
    const customerGrowth = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*)::TEXT as count 
      FROM "Customer"
      GROUP BY month
      ORDER BY month
      LIMIT 12
    `;

    // Fonction de sérialisation pour les cas non couverts
    const serializeBigInt = (data) => {
      return JSON.parse(
        JSON.stringify(data, (_, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );
    };

    res.json(
      serializeBigInt({
        totalSales: totalSales._sum.prixTotal || 0,
        monthlySales,
        topProducts,
        stockAlerts: stockAlerts.map((item) => ({
          productName: item.libelle,
          remaining: item.stocks.reduce(
            (sum, stock) => sum + stock.quantite,
            0
          ),
        })),
        revenueTrend,
        customerGrowth,
      })
    );
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 🔧 Fonction récursive pour convertir les BigInt
function convertBigIntToNumber(obj) {
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  } else if (obj !== null && typeof obj === "object") {
    const converted = {};
    for (const key in obj) {
      const value = obj[key];
      converted[key] =
        typeof value === "bigint"
          ? Number(value)
          : convertBigIntToNumber(value);
    }
    return converted;
  }
  return obj;
}

const getDashboardStatistique = async (req, res) => {
  try {
    // 1. Ventes totales sur l'année
    const totalSales = await prisma.facture.aggregate({
      _sum: { prixTotal: true },
      where: {
        status: "PAYEE",
        createdAt: {
          gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        },
      },
    });

    // 2. Ventes du mois actuel et du mois précédent
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthSales = await prisma.facture.aggregate({
      _sum: { prixTotal: true },
      where: {
        status: "PAYEE",
        createdAt: {
          gte: currentMonthStart,
        },
      },
    });

    const previousMonthSales = await prisma.facture.aggregate({
      _sum: { prixTotal: true },
      where: {
        status: "PAYEE",
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    });

    const growth =
      Number(currentMonthSales._sum.prixTotal || 0) -
      Number(previousMonthSales._sum.prixTotal || 0);

    // 3. Ventes mensuelles
    const monthlySales = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        SUM(prix_total)::FLOAT as amount
      FROM "Facture"
      WHERE "status" = 'PAYEE'
      GROUP BY month
      ORDER BY month
      LIMIT 12
    `;

    // 4. Produits les plus vendus
    const topProducts = await prisma.$queryRaw`
      SELECT 
        p."libelle" as productName,
        SUM(pc."quantite")::INT as sales
      FROM "PiecesCommande" pc
      JOIN "Product" p ON pc.product_id = p.id
      JOIN "CommandeVente" cv ON pc.commande_id = cv.id
      JOIN "Facture" f ON cv.id = f.commande_id
      WHERE f."status" = 'PAYEE'
      GROUP BY p."libelle"
      ORDER BY sales DESC
      LIMIT 5
    `;

    // 5. Alertes de stock
    const stockAlerts = await prisma.product.findMany({
      where: {
        stocks: {
          some: {
            quantite: { lt: 5 },
          },
        },
      },
      select: {
        libelle: true,
        stocks: {
          select: {
            quantite: true,
          },
        },
      },
      take: 5,
    });

    // 6. Tendance des revenus sur 30 jours
    const revenueTrend = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        SUM("prix_total")::FLOAT as amount
      FROM "Facture"
      WHERE "status" = 'PAYEE'
        AND "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date
    `;

    // 7. Croissance clients
    const customerGrowth = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*)::INT as count
      FROM "Customer"
      GROUP BY month
      ORDER BY month
      LIMIT 12
    `;

    // ✅ Réponse JSON finale avec conversion BigInt
    const data = {
      totalSales: Number(totalSales._sum.prixTotal || 0),
      monthlySales,
      topProducts,
      stockAlerts: stockAlerts.map((item) => ({
        productName: item.libelle,
        remaining: item.stocks.reduce((sum, stock) => sum + stock.quantite, 0),
      })),
      revenueTrend,
      customerGrowth,
      currentMonthSales: Number(currentMonthSales._sum.prixTotal || 0),
      previousMonthSales: Number(previousMonthSales._sum.prixTotal || 0),
      growthDifference: growth,
    };

    res.status(200).json(convertBigIntToNumber(data));
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// module.exports = { getDashboardStats };

module.exports = {
  getDashboardStats,
  getDashboardStatistique,
};
