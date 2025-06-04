const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const { registerSchema, loginSchema } = require('../utils/validator');

exports.register = async (data) => {
  const { name, email, password, role } = await registerSchema.validateAsync(data);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Utilisateur déjà existant');

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || 'USER' },
  });

  return { message: 'Utilisateur enregistré', user: { id: user.id, name: user.name, email: user.email, role: user.role } };
};

exports.login = async ({ email, password }) => {
  const { email: validatedEmail, password: validatedPassword } = await loginSchema.validateAsync({ email, password });

  const user = await prisma.user.findUnique({ where: { email: validatedEmail } });
  if (!user) throw new Error('Utilisateur introuvable');

  const match = await bcrypt.compare(validatedPassword, user.password);
  if (!match) throw new Error('Mot de passe incorrect');

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
};

exports.getMe = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Utilisateur non trouvé');
  return { id: user.id, email: user.email, role: user.role };
};
