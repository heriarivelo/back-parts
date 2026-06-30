const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
// const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const { updateUserSchema } = require("../utils/validator");
const { registerSchema } = require("../utils/validator");

const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      search = "",
      role = "",
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
    const skip = (currentPage - 1) * limit;

    const searchTerm = search.trim();

const where = {
  ...(role && {
    role: role,
  }),

  ...(searchTerm && {
    OR: [
      {
        name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
    ],
  }),
};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),

      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      data: users,
      pagination: {
        total,
        currentPage,
        pageSize: limit,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrevious: currentPage > 1,
      },
    });
  } catch (err) {
    console.error("Erreur récupération utilisateurs:", err);
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
  try {
    const { name, email, password, role } = await registerSchema.validateAsync(
      req.body
    );

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Utilisateur déjà existant" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || "USER" },
    });

    // ✅ Correction : Utiliser res.json() pour envoyer la réponse
    res.json({
      message: "Utilisateur enregistré",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    console.error("Erreur création utilisateur:", error);
    
    // ✅ Toujours renvoyer une réponse même en cas d'erreur
    if (error.isJoi) {
      return res.status(400).json({ error: error.details[0].message });
    }
    
    res.status(500).json({ error: "Erreur serveur lors de la création d'utilisateur" });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    return res.json(user);
  } catch (err) {
    console.error("Erreur profil:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Nom et email obligatoires" });
    }

    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        NOT: {
          id: userId,
        },
      },
    });

    if (existingEmail) {
      return res.status(400).json({ error: "Cet email est déjà utilisé" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.json({
      message: "Profil mis à jour avec succès",
      user,
    });
  } catch (err) {
    console.error("Erreur update profil:", err);
    return res.status(500).json({ error: "Erreur de mise à jour du profil" });
  }
};

const changeMyPassword = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Les nouveaux mots de passe ne correspondent pas" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(400).json({ error: "Mot de passe actuel incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return res.json({
      message: "Mot de passe modifié avec succès",
    });
  } catch (err) {
    console.error("Erreur changement mot de passe:", err);
    return res.status(500).json({ error: "Erreur lors du changement de mot de passe" });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
};
