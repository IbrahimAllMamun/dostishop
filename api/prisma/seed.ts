import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ---- Settings (single row) ----
  const existingSetting = await prisma.setting.findFirst();
  if (!existingSetting) {
    await prisma.setting.create({
      data: {
        storeName: 'Boutique BD',
        shippingInsideDhaka: 60,
        shippingOutsideDhaka: 120,
        supportPhone: '01700000000',
        supportEmail: 'support@boutique.test',
      },
    });
  }

  // ---- Super admin ----
  const adminPass = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@boutique.test' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@boutique.test',
      passwordHash: adminPass,
      role: 'SUPER_ADMIN',
    },
  });

  // ---- Categories ----
  const categories = [
    { name: 'Backpacks', slug: 'backpacks' },
    { name: 'Purses', slug: 'purses' },
    { name: 'Imitation Jewelry', slug: 'imitation-jewelry' },
    { name: 'Cosmetics', slug: 'cosmetics' },
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Footwear', slug: 'footwear' },
  ];
  for (const [i, c] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i },
    });
  }
  const bags = await prisma.category.findUnique({ where: { slug: 'backpacks' } });
  const jewelry = await prisma.category.findUnique({ where: { slug: 'imitation-jewelry' } });

  // ---- Vendor + shop ----
  const vendorPass = await bcrypt.hash('Vendor@123', 10);
  const vendor = await prisma.user.upsert({
    where: { email: 'vendor@boutique.test' },
    update: {},
    create: {
      name: 'Rahim Traders',
      email: 'vendor@boutique.test',
      passwordHash: vendorPass,
      role: 'VENDOR',
      shop: {
        create: {
          name: 'Rahim Traders',
          slug: 'rahim-traders',
          status: 'ACTIVE',
          phone: '01800000000',
          description: 'Quality bags & accessories at fair prices.',
          commissionRate: 10,
        },
      },
    },
    include: { shop: true },
  });
  const shopId = vendor.shop!.id;

  // ---- Products ----
  const productCount = await prisma.product.count({ where: { shopId } });
  if (productCount === 0) {
    await prisma.product.create({
      data: {
        shopId,
        categoryId: bags?.id,
        name: 'Urban Travel Backpack',
        slug: 'urban-travel-backpack',
        description: 'Water-resistant 25L backpack with padded laptop sleeve.',
        brand: 'UrbanGo',
        basePrice: 2200,
        salePrice: 1799,
        isFeatured: true,
        images: {
          create: [{ url: 'https://picsum.photos/seed/backpack1/600/600', sortOrder: 0 }],
        },
        variants: {
          create: [
            { color: 'Black', stockQty: 15 },
            { color: 'Navy', stockQty: 8 },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        shopId,
        categoryId: jewelry?.id,
        name: 'Rose Gold Necklace Set',
        slug: 'rose-gold-necklace-set',
        description: 'Elegant imitation rose-gold necklace with matching earrings.',
        brand: 'Shimmer',
        basePrice: 950,
        salePrice: 799,
        isFeatured: true,
        images: {
          create: [{ url: 'https://picsum.photos/seed/necklace1/600/600', sortOrder: 0 }],
        },
        variants: {
          create: [{ stockQty: 30 }],
        },
      },
    });
  }

  // ---- Banner ----
  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    await prisma.banner.create({
      data: {
        imageUrl: 'https://picsum.photos/seed/hero1/1200/400',
        title: 'New Arrivals',
        linkUrl: '/products',
        sortOrder: 0,
      },
    });
  }

  console.log('✅ Seed complete.');
  console.log('   Super Admin  → admin@boutique.test  / Admin@123');
  console.log('   Vendor       → vendor@boutique.test / Vendor@123');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
