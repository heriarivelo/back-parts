const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Vérifier ou créer un client
const findOrCreateClient = async (req, res) => {
  try {
    const { siret, phone, email, clientData } = req.body;

    // Essayer de trouver le client existant
    let client = await prisma.customer.findFirst({
      where: {
        OR: [{ siret: siret }, { telephone: phone }, { email: email }],
      },
    });

    // Si non trouvé, créer un nouveau client
    if (!client) {
      client = await prisma.customer.create({
        data: {
          nom: clientData.name,
          siret: clientData.siret,
          adresse: clientData.address,
          postalCode: clientData.postalCode,
          city: clientData.city,
          type: clientData.type || "B2B",
          telephone: clientData.phone,
          email: clientData.email,
          metadata: {
            activity: clientData.activity,
            contactName: clientData.contactName,
            contactPosition: clientData.contactPosition,
          },
        },
      });
    }

    res.json({ clientId: client.id, isNew: !client.createdAt });
  } catch (error) {
    console.error("Error in findOrCreateClient:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = {
  findOrCreateClient,
};
