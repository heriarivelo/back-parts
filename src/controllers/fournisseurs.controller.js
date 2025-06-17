const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSupplier = async (req, res) => {
  const { name, address, country, phone, email, logo } = req.body;

  try {
    const supplier = await prisma.supplier.create({
      data: { name, address, country, phone, email, logo },
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
