const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
import { parse } from 'csv-parse';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export const createImport = async (req, res) => {
  try {
    const { file } = req;
    const userId = req.user.id;
    
    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    // 1. Lecture du fichier CSV
    const fileContent = await readFile(file.path, 'utf8');
    
    // 2. Parsing du CSV
    const parser = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const records = await new Promise((resolve, reject) => {
      const data = [];
      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          data.push(record);
        }
      });
      parser.on('error', reject);
      parser.on('end', () => resolve(data));
    });

    // 3. Validation des données requises
    const requiredFields = ['code_art', 'oem', 'marque', 'quantite', 'prix_achat'];
    for (const record of records) {
      for (const field of requiredFields) {
        if (!record[field]) {
          return res.status(400).json({ 
            error: `Champ manquant: ${field}`,
            record
          });
        }
      }
    }

    // 4. Création de l'import
    const importData = {
      reference: `IMP-${Date.now().toString(36).toUpperCase()}`,
      description: `Import du ${new Date().toLocaleDateString()}`,
      tauxDeChange: new Prisma.Decimal(req.body.tauxDeChange || 1),
      fretAvecDD: new Prisma.Decimal(req.body.fretAvecDD || 0),
      fretSansDD: new Prisma.Decimal(req.body.fretSansDD || 0),
      douane: new Prisma.Decimal(req.body.douane || 0),
      tva: new Prisma.Decimal(req.body.tva || 0),
      marge: new Prisma.Decimal(req.body.marge || 0.3), // Marge par défaut 30%
      fileName: file.originalname,
      userId,
      parts: {
        create: records.map(record => ({
          codeArt: record.code_art,
          oem: record.oem,
          marque: record.marque,
          autoFinal: record.auto_final || '',
          libelle: record.libelle || `${record.marque} ${record.oem}`,
          quantity: parseInt(record.quantite),
          qttArrive: parseInt(record.qtt_arrive || record.quantite),
          poids: parseFloat(record.poids || 0),
          purchasePrice: new Prisma.Decimal(record.prix_achat),
          salePrice: new Prisma.Decimal(0), // Calculé plus tard
          margin: new Prisma.Decimal(0) // Calculé plus tard
        }))
      }
    };

    // 5. Calcul des prix de vente
    const calculatedImport = await calculatePrices(importData);

    // 6. Enregistrement en base
    const newImport = await prisma.import.create({
      data: calculatedImport,
      include: { parts: true }
    });

    // 7. Mise à jour des stocks
    await updateStockFromImport(newImport);

    res.status(201).json(newImport);

  } catch (error) {
    console.error('Erreur lors de l\'import:', error);
    res.status(500).json({ 
      error: 'Erreur lors du traitement de l\'import',
      details: error.message 
    });
  }
};

// Helper function pour calculer les prix
async function calculatePrices(importData) {
  const exchangeRate = importData.tauxDeChange.toNumber();
  const tvaRate = importData.tva.toNumber();
  const marginRate = importData.marge.toNumber();

  return {
    ...importData,
    parts: {
      create: importData.parts.create.map(part => {
        const purchasePrice = part.purchasePrice.toNumber() * exchangeRate;
        const costPrice = purchasePrice + 
                         (purchasePrice * importData.douane.toNumber()) + 
                         (purchasePrice * tvaRate);
        const salePrice = costPrice * (1 + marginRate);

        return {
          ...part,
          purchasePrice: new Prisma.Decimal(purchasePrice),
          salePrice: new Prisma.Decimal(salePrice.toFixed(2)),
          margin: new Prisma.Decimal(marginRate)
        };
      })
    }
  };
}

// Helper function pour mettre à jour les stocks
async function updateStockFromImport(importData) {
  for (const part of importData.parts) {
    // Trouver ou créer le produit correspondant
    let product = await prisma.product.findFirst({
      where: { oem: part.oem, marque: part.marque }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          referenceCode: `PROD-${part.oem}-${part.marque}`,
          oem: part.oem,
          marque: part.marque,
          libelle: part.libelle,
          category: 'AUTO'
        }
      });
    }

    // Mettre à jour le stock
    await prisma.stock.upsert({
      where: { productId: product.id },
      update: { 
        quantite: { increment: part.qttArrive },
        status: part.qttArrive > 0 ? 'DISPONIBLE' : 'RUPTURE'
      },
      create: {
        productId: product.id,
        quantite: part.qttArrive,
        status: 'DISPONIBLE'
      }
    });

    // Lier la pièce importée au produit
    await prisma.importedPart.update({
      where: { id: part.id },
      data: { productId: product.id }
    });
  }
}