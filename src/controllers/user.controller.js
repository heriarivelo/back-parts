const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
// const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const { updateUserSchema } = require("../utils/validator");
const { registerSchema } = require("../utils/validator");

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const users = await prisma.user.findMany({
      skip: (page - 1) * pageSize,
      take: Number(pageSize),
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const total = await prisma.user.count();

    res.json({
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      users,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user)
      return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: value,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json(user);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    res.status(500).json({ error: "Erreur de mise à jour" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const currentUserId = req.body.userId;

    // Validation de l'ID
    if (isNaN(userId)) {
      return res.status(400).json({ error: "ID utilisateur invalide" });
    }

    // Empêcher un utilisateur de se supprimer lui-même
    if (userId === currentUserId) {
      return res.status(403).json({
        error: "Action interdite",
        message: "Vous ne pouvez pas supprimer votre propre compte",
      });
    }

    // Vérifier si l'utilisateur existe avant suppression
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // Suppression de l'utilisateur
    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(200).json({
      success: true,
      message: "Utilisateur supprimé avec succès",
    });
  } catch (err) {
    console.error("Erreur lors de la suppression:", err);

    if (err.code === "P2025") {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    res.status(500).json({
      error: "Erreur serveur",
      message: "Échec de la suppression de l'utilisateur",
    });
  }
};

const createUser = async (req, res) => {
  const { name, email, password, role } = await registerSchema.validateAsync(
    req.body
  );
  // console.log("data back", data);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Utilisateur déjà existant");

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || "USER" },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
};
