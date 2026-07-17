import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { slugify } from '../utils/helpers';
import { env } from '../config/env';

const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  shop?: unknown;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    shop: user.shop ?? null,
  };
}

export const registerVendor = asyncHandler(async (req, res) => {
  const { name, email, password, shopName, phone } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  let slug = slugify(shopName);
  if (await prisma.shop.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'VENDOR',
      shop: { create: { name: shopName, slug, phone, status: 'PENDING' } },
    },
    include: { shop: true },
  });

  res.status(201).json({
    message: 'Registration successful. Your shop is pending admin approval.',
    user: publicUser(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email }, include: { shop: true } });
  if (!user) throw new ApiError(401, 'Invalid credentials');
  if (user.status === 'SUSPENDED') throw new ApiError(403, 'Account suspended');

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid credentials');

  const token = signToken({ sub: user.id, role: user.role, shopId: user.shop?.id ?? null });
  res.cookie('token', token, cookieOptions);
  res.json({ token, user: publicUser(user) });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { shop: true },
  });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user: publicUser(user) });
});
