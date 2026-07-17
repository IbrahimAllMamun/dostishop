import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedProduct {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  brand: string;
  basePrice: number;
  salePrice: number;
  featured?: boolean;
  imageSeed: string;
  variants: Array<{ size?: string; color?: string; stockQty: number }>;
}

interface SeedStore {
  ownerName: string;
  email: string;
  shopName: string;
  slug: string;
  phone: string;
  description: string;
  products: SeedProduct[];
}

const STORES: SeedStore[] = [
  {
    ownerName: 'Dhaka Leather Co.',
    email: 'dhakaleather@boutique.test',
    shopName: 'Dhaka Leather Co.',
    slug: 'dhaka-leather-co',
    phone: '01710000001',
    description: 'Genuine and premium faux leather bags, backpacks and purses.',
    products: [
      {
        name: 'Classic Leather Backpack',
        slug: 'classic-leather-backpack',
        categorySlug: 'backpacks',
        description: 'Full-grain leather backpack with laptop compartment and brass zippers.',
        brand: 'Dhaka Leather',
        basePrice: 3500,
        salePrice: 2999,
        featured: true,
        imageSeed: 'leatherbackpack',
        variants: [
          { color: 'Brown', stockQty: 12 },
          { color: 'Black', stockQty: 10 },
        ],
      },
      {
        name: 'Handcrafted Ladies Purse',
        slug: 'handcrafted-ladies-purse',
        categorySlug: 'purses',
        description: 'Compact handcrafted purse with detachable strap.',
        brand: 'Dhaka Leather',
        basePrice: 1800,
        salePrice: 1499,
        imageSeed: 'ladiespurse',
        variants: [{ color: 'Tan', stockQty: 20 }],
      },
    ],
  },
  {
    ownerName: 'Glamour Cosmetics',
    email: 'glamour@boutique.test',
    shopName: 'Glamour Cosmetics',
    slug: 'glamour-cosmetics',
    phone: '01710000002',
    description: 'Cosmetics, beauty essentials and fashion jewelry for every occasion.',
    products: [
      {
        name: 'Matte Lipstick Set (6 shades)',
        slug: 'matte-lipstick-set-6-shades',
        categorySlug: 'cosmetics',
        description: 'Long-lasting matte lipstick set in six everyday shades.',
        brand: 'Glamour',
        basePrice: 1200,
        salePrice: 999,
        featured: true,
        imageSeed: 'lipstickset',
        variants: [{ stockQty: 40 }],
      },
      {
        name: 'Pearl Drop Earrings',
        slug: 'pearl-drop-earrings',
        categorySlug: 'imitation-jewelry',
        description: 'Elegant imitation pearl drop earrings with gold-tone finish.',
        brand: 'Glamour',
        basePrice: 650,
        salePrice: 550,
        imageSeed: 'pearlearrings',
        variants: [{ stockQty: 35 }],
      },
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('Store@123', 10);

  for (const store of STORES) {
    // Category lookup
    const categories = await prisma.category.findMany();
    const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

    const user = await prisma.user.upsert({
      where: { email: store.email },
      update: {},
      create: {
        name: store.ownerName,
        email: store.email,
        passwordHash,
        role: 'VENDOR',
        shop: {
          create: {
            name: store.shopName,
            slug: store.slug,
            status: 'ACTIVE',
            phone: store.phone,
            description: store.description,
            commissionRate: 10,
          },
        },
      },
      include: { shop: true },
    });

    const shopId = user.shop!.id;
    const existing = await prisma.product.count({ where: { shopId } });

    if (existing === 0) {
      for (const p of store.products) {
        await prisma.product.create({
          data: {
            shopId,
            categoryId: catBySlug.get(p.categorySlug) ?? null,
            name: p.name,
            slug: p.slug,
            description: p.description,
            brand: p.brand,
            basePrice: p.basePrice,
            salePrice: p.salePrice,
            isFeatured: p.featured ?? false,
            images: {
              create: [{ url: `https://picsum.photos/seed/${p.imageSeed}/600/600`, sortOrder: 0 }],
            },
            variants: { create: p.variants },
          },
        });
      }
      console.log(`✅ Created store "${store.shopName}" (${store.slug}) with ${store.products.length} products`);
    } else {
      console.log(`↷ Store "${store.shopName}" already exists — skipped products`);
    }
  }

  console.log('\nVendor logins (password: Store@123):');
  for (const s of STORES) console.log(`   ${s.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
