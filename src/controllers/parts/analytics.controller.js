const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAnalytics = async (req, res) => {
    try {
        // 1. Pièces en stock
        const totalStockItems = await prisma.stock.aggregate({
            _sum: {
                quantite: true
            }
        });

        // 2. Valeur du stock
        const stockValue = await prisma.stock.aggregate({
            _sum: {
                quantite: true,
                prixFinal: true
            }
        });

        // 3. Commandes en cours
        const pendingOrders = await prisma.commandeVente.count({
            where: {
                status: {
                    in: ['EN_ATTENTE', 'TRAITEMENT']
                }
            }
        });

        // 4. Marge moyenne
        const avgMargin = await prisma.importedPart.aggregate({
            _avg: {
                margin: true
            }
        });

        res.json({
            totalStock: totalStockItems._sum.quantite || 0,
            stockValue: stockValue._sum.prixFinal || 0,
            pendingOrders,
            averageMargin: avgMargin._avg.margin ? (avgMargin._avg.margin * 100).toFixed(0) : 0,
            // Pour les tendances, vous pourriez ajouter des comparaisons avec le mois précédent
            trends: {
                stockChange: 12, // À calculer avec des données historiques
                valueChange: -5, // À calculer avec des données historiques
                newOrders: 3 // À calculer avec des données historiques
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};