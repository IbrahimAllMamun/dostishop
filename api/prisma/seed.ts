import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Demo catalog: 10 stores × 10 products = 100 products
// ---------------------------------------------------------------------------

interface DemoShop {
  name: string;
  email: string;
  phone: string;
  description: string;
  focus: string[]; // category slugs the shop sells in
}

const DEMO_SHOPS: DemoShop[] = [
  {
    name: 'Bengal Leather Works',
    email: 'bengalleather@boutique.test',
    phone: '01710000101',
    description: 'Handcrafted leather backpacks, bags and accessories made in Dhaka.',
    focus: ['backpacks', 'purses'],
  },
  {
    name: 'Dhaka Sneaker Studio',
    email: 'sneakerstudio@boutique.test',
    phone: '01710000102',
    description: 'Fresh kicks and comfortable everyday footwear for men and women.',
    focus: ['footwear'],
  },
  {
    name: 'Rupali Jewels',
    email: 'rupalijewels@boutique.test',
    phone: '01710000103',
    description: 'Elegant imitation jewelry for weddings, parties and every day.',
    focus: ['imitation-jewelry'],
  },
  {
    name: 'Meher Beauty House',
    email: 'meherbeauty@boutique.test',
    phone: '01710000104',
    description: 'Authentic cosmetics and beauty essentials at honest prices.',
    focus: ['cosmetics'],
  },
  {
    name: 'Chandni Fashion House',
    email: 'chandnifashion@boutique.test',
    phone: '01710000105',
    description: 'Trendy ethnic and western wear for the modern Bangladeshi woman.',
    focus: ['clothing'],
  },
  {
    name: 'Mirpur Bag Gallery',
    email: 'mirpurbags@boutique.test',
    phone: '01710000106',
    description: 'Every bag you need — school, office, travel and fashion.',
    focus: ['backpacks', 'purses'],
  },
  {
    name: 'Gulshan Glam',
    email: 'gulshanglam@boutique.test',
    phone: '01710000107',
    description: 'Premium beauty products and statement jewelry, curated with love.',
    focus: ['cosmetics', 'imitation-jewelry'],
  },
  {
    name: 'Uttara Trendz',
    email: 'uttaratrendz@boutique.test',
    phone: '01710000108',
    description: 'Streetwear, casuals and sneakers for the young crowd.',
    focus: ['clothing', 'footwear'],
  },
  {
    name: 'Style Point BD',
    email: 'stylepoint@boutique.test',
    phone: '01710000109',
    description: 'One-stop fashion point — outfits and matching handbags.',
    focus: ['clothing', 'purses'],
  },
  {
    name: 'Comfort Walk BD',
    email: 'comfortwalk@boutique.test',
    phone: '01710000110',
    description: 'Shoes that feel as good as they look, for the whole family.',
    focus: ['footwear'],
  },
];

// Ten product templates per category: [name, basePrice, brand]
const CATALOG: Record<string, Array<[string, number, string]>> = {
  backpacks: [
    ['Urban Commuter Backpack', 1800, 'UrbanGo'],
    ['Campus Daypack', 1200, 'UrbanGo'],
    ['Travel Rucksack 40L', 2800, 'TrekMate'],
    ['Anti-Theft Laptop Backpack', 2400, 'SafePack'],
    ['Canvas School Bag', 950, 'CampusLine'],
    ['Hiking Backpack Pro', 3200, 'TrekMate'],
    ['Mini Fashion Backpack', 1100, 'Trendy'],
    ['Waterproof Office Backpack', 2100, 'SafePack'],
    ['Vintage Leather Backpack', 3500, 'Heritage'],
    ['Foldable Travel Daypack', 850, 'TrekMate'],
  ],
  purses: [
    ['Classic Leather Purse', 1600, 'Heritage'],
    ['Quilted Party Clutch', 900, 'Glamora'],
    ['Everyday Tote Bag', 1400, 'Trendy'],
    ['Crossbody Sling Bag', 1200, 'Trendy'],
    ['Bridal Clutch Gold', 1500, 'Glamora'],
    ['Woven Shoulder Bag', 1300, 'Heritage'],
    ['Mini Coin Purse', 450, 'Trendy'],
    ['Office Handbag', 1900, 'Heritage'],
    ['Tassel Hobo Bag', 1700, 'Glamora'],
    ['Transparent Jelly Bag', 750, 'Trendy'],
  ],
  'imitation-jewelry': [
    ['Rose Gold Necklace Set', 950, 'Shimmer'],
    ['Pearl Drop Earrings', 650, 'Shimmer'],
    ['Kundan Bridal Set', 2200, 'Nakshi'],
    ['Oxidised Silver Jhumka', 550, 'Nakshi'],
    ['Gold-Plated Bangle Set', 850, 'Shimmer'],
    ['Crystal Pendant Chain', 700, 'Shimmer'],
    ['Antique Choker Set', 1300, 'Nakshi'],
    ['Minimalist Ring Set', 400, 'Shimmer'],
    ['Temple Jewelry Set', 1800, 'Nakshi'],
    ['Stone Studded Nose Pin', 250, 'Nakshi'],
  ],
  cosmetics: [
    ['Matte Lipstick Set (6 shades)', 1200, 'Glamour'],
    ['HD Liquid Foundation', 950, 'Glamour'],
    ['Eyeshadow Palette 18 Shades', 1400, 'ColorPop BD'],
    ['Kajal & Eyeliner Duo', 450, 'Glamour'],
    ['Vitamin C Face Serum', 850, 'PureGlow'],
    ['Compact Powder', 550, 'Glamour'],
    ['Makeup Brush Set 12pc', 1100, 'ColorPop BD'],
    ['Nail Polish Combo 6pc', 600, 'ColorPop BD'],
    ['Lip Tint Trio', 700, 'PureGlow'],
    ['Matte Setting Spray', 650, 'PureGlow'],
  ],
  clothing: [
    ['Cotton Kurti', 1100, 'Chandni'],
    ['Embroidered Three Piece', 2800, 'Chandni'],
    ['Denim Jacket', 1900, 'StreetFit'],
    ['Printed Hijab Premium', 650, 'Modest'],
    ['Casual T-Shirt', 550, 'StreetFit'],
    ['Silk Party Saree', 3800, 'Chandni'],
    ['Palazzo Pant Set', 1200, 'Modest'],
    ['Winter Hoodie', 1400, 'StreetFit'],
    ['Formal Panjabi', 1800, 'Chandni'],
    ['Georgette Evening Gown', 3200, 'Chandni'],
  ],
  footwear: [
    ['Canvas Sneakers', 1500, 'Stride'],
    ['Leather Loafers', 2400, 'ComfortStep'],
    ['Sports Running Shoes', 2800, 'Stride'],
    ['Ladies Block Heels', 1600, 'ComfortStep'],
    ['Comfort Slides', 700, 'ComfortStep'],
    ['Formal Oxford Shoes', 3200, 'ComfortStep'],
    ['Slip-On Espadrilles', 1200, 'Stride'],
    ['Kids School Shoes', 900, 'ComfortStep'],
    ['Chunky Fashion Sneakers', 2200, 'Stride'],
    ['Traditional Nagra', 1100, 'Heritage'],
  ],
};

/** Deterministic per-category variants so the seed is reproducible. */
function variantsFor(categorySlug: string, shopIdx: number, prodIdx: number) {
  const stock = (n: number) => 8 + ((shopIdx * 7 + prodIdx * 13 + n * 5) % 40);
  if (categorySlug === 'clothing') {
    return ['M', 'L', 'XL'].map((size, n) => ({ size, stockQty: stock(n) }));
  }
  if (categorySlug === 'footwear') {
    return ['40', '41', '42'].map((size, n) => ({ size, stockQty: stock(n) }));
  }
  if (categorySlug === 'backpacks' || categorySlug === 'purses') {
    const colors = ['Black', 'Brown', 'Navy', 'Maroon'];
    return [colors[(shopIdx + prodIdx) % 4], colors[(shopIdx + prodIdx + 2) % 4]].map(
      (color, n) => ({ color, stockQty: stock(n) }),
    );
  }
  return [{ stockQty: stock(0) + 15 }]; // jewelry & cosmetics: single variant
}

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
  const categoryList = [
    { name: 'Backpacks', slug: 'backpacks' },
    { name: 'Purses', slug: 'purses' },
    { name: 'Imitation Jewelry', slug: 'imitation-jewelry' },
    { name: 'Cosmetics', slug: 'cosmetics' },
    { name: 'Clothing', slug: 'clothing' },
    { name: 'Footwear', slug: 'footwear' },
  ];
  for (const [i, c] of categoryList.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i },
    });
  }
  const categories = await prisma.category.findMany();
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  // ---- Original demo vendor: Rahim Traders ----
  const vendorPass = await bcrypt.hash('Vendor@123', 10);
  const rahim = await prisma.user.upsert({
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

  if ((await prisma.product.count({ where: { shopId: rahim.shop!.id } })) === 0) {
    await prisma.product.create({
      data: {
        shopId: rahim.shop!.id,
        categoryId: catBySlug.get('backpacks'),
        name: 'Urban Travel Backpack',
        slug: 'urban-travel-backpack',
        description: 'Water-resistant 25L backpack with padded laptop sleeve.',
        brand: 'UrbanGo',
        basePrice: 2200,
        salePrice: 1799,
        isFeatured: true,
        images: { create: [{ url: 'https://picsum.photos/seed/backpack1/600/600', sortOrder: 0 }] },
        variants: { create: [{ color: 'Black', stockQty: 15 }, { color: 'Navy', stockQty: 8 }] },
      },
    });
    await prisma.product.create({
      data: {
        shopId: rahim.shop!.id,
        categoryId: catBySlug.get('imitation-jewelry'),
        name: 'Rose Gold Necklace Set',
        slug: 'rose-gold-necklace-set',
        description: 'Elegant imitation rose-gold necklace with matching earrings.',
        brand: 'Shimmer',
        basePrice: 950,
        salePrice: 799,
        isFeatured: true,
        images: { create: [{ url: 'https://picsum.photos/seed/necklace1/600/600', sortOrder: 0 }] },
        variants: { create: [{ stockQty: 30 }] },
      },
    });
  }

  // ---- 10 demo stores × 10 products ----
  const storePass = await bcrypt.hash('Store@123', 10);
  const existingSlugs = new Set(
    (await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug),
  );

  function uniqueSlug(name: string): string {
    let slug = slugify(name);
    let i = 2;
    while (existingSlugs.has(slug)) slug = `${slugify(name)}-${i++}`;
    existingSlugs.add(slug);
    return slug;
  }

  let createdShops = 0;
  let createdProducts = 0;

  for (const [shopIdx, demo] of DEMO_SHOPS.entries()) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {},
      create: {
        name: demo.name,
        email: demo.email,
        passwordHash: storePass,
        role: 'VENDOR',
        shop: {
          create: {
            name: demo.name,
            slug: slugify(demo.name),
            status: 'ACTIVE',
            phone: demo.phone,
            description: demo.description,
            commissionRate: 10,
          },
        },
      },
      include: { shop: true },
    });
    const shopId = user.shop!.id;
    if (user.createdAt.getTime() > Date.now() - 60_000) createdShops++;

    if ((await prisma.product.count({ where: { shopId } })) > 0) continue;

    for (let j = 0; j < 10; j++) {
      // Cycle the shop's focus categories; offset into the pool so shops
      // sharing a category list different items first
      const categorySlug = demo.focus[j % demo.focus.length];
      const pool = CATALOG[categorySlug];
      const [prodName, basePrice, brand] = pool[(j + shopIdx * 3) % pool.length];

      const onSale = (shopIdx + j) % 2 === 0;
      const salePrice = onSale ? Math.round((basePrice * 0.85) / 10) * 10 : null;
      const slug = uniqueSlug(prodName);

      await prisma.product.create({
        data: {
          shopId,
          categoryId: catBySlug.get(categorySlug),
          name: prodName,
          slug,
          description: `${prodName} from ${demo.name}. Quality checked, delivered anywhere in Bangladesh with cash on delivery.`,
          brand,
          basePrice,
          salePrice,
          isFeatured: (shopIdx * 10 + j) % 8 === 0,
          images: {
            create: [{ url: `https://picsum.photos/seed/${slug}/600/600`, sortOrder: 0 }],
          },
          variants: { create: variantsFor(categorySlug, shopIdx, j) },
        },
      });
      createdProducts++;
    }
  }

  // ---- Banner ----
  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.create({
      data: {
        imageUrl: 'https://picsum.photos/seed/hero1/1200/400',
        title: 'New Arrivals',
        linkUrl: '/products',
        sortOrder: 0,
      },
    });
  }

  const totals = {
    shops: await prisma.shop.count(),
    products: await prisma.product.count(),
  };

  console.log('✅ Seed complete.');
  console.log(`   Demo stores created this run: ${createdShops}, products: ${createdProducts}`);
  console.log(`   Totals in DB — shops: ${totals.shops}, products: ${totals.products}`);
  console.log('   Super Admin  → admin@boutique.test  / Admin@123');
  console.log('   Vendor       → vendor@boutique.test / Vendor@123');
  console.log('   Demo vendors → *@boutique.test      / Store@123');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
