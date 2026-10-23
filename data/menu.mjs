// Single source of truth for the seed menu.
// Prices: the restaurant's QR menu (menu.qrtoco.com, Oct 2026 screenshots); dips, water, juice and the
// +1 JD upsize from the in-store counter menu photo. Never Talabat prices.
// Descriptions: the restaurant's own Talabat listing (descriptions only — no Talabat prices).
// Prices are stored in fils (1 JD = 1000 fils) to avoid floating point errors.
//
// Item `options` (any of):
//   heat    → Spicy / Mild choice ("Have it your way")
//   flavour → wings & bites coating (Original, BBQ, Dynamite, Buffalo, Honey Mustard, Sweet Chili)
//   dip     → pick the dip that comes with the meal (items with is_dip = 1)
//   upsize  → "Upsize your meal" for settings.combo_price
//
// `npm run seed:build` turns this file into:
//   - migrations/0002_seed.sql   (initial D1 data)
//   - public/data/menu.json      (static fallback the site uses if the API is unreachable)

const jd = (v) => Math.round(v * 1000);
const one = (price, ar = 'عادي', en = 'Regular') => [{ id: 'one', ar, en, price: jd(price) }];
const pcs = (list) => list.map(([n, price, id]) => ({ id: id || `${n}pc`, ar: `${n} قطع`.replace(/^(1[1-9]|[2-9]\d) قطع$/, `$1 قطعة`), en: `${n} pcs`, price: jd(price) }));

export const categories = [
  {
    id: 'tenders',
    name_ar: 'تندرز',
    name_en: 'Tenders',
    tagline_ar: 'حار أو عادي — على ذوق ماما',
    tagline_en: 'Spicy or mild — mama’s way',
  },
  {
    id: 'sandwiches',
    name_ar: 'ساندويشات',
    name_en: 'Sandwiches',
    tagline_ar: 'كل الساندويشات وجبات مع بطاطا ومشروب',
    tagline_en: 'Every sandwich is a meal with fries & a drink',
  },
  {
    id: 'wings',
    name_ar: 'وينجز',
    name_en: 'Wings',
    tagline_ar: 'اختار النكهة اللي بتحبها',
    tagline_en: 'Pick your favourite flavour',
  },
  {
    id: 'bites',
    name_ar: 'بايتس',
    name_en: 'Bites',
    tagline_ar: 'قطع دجاج مقرمشة بدون عظم',
    tagline_en: 'Boneless crispy chicken bites',
  },
  {
    id: 'kids',
    name_ar: 'وجبات أطفال',
    name_en: 'Kids Meals',
    tagline_ar: 'مع بطاطا ومشروب صغير وكوكيز',
    tagline_en: 'With fries, a small drink & a cookie',
  },
  {
    id: 'sides',
    name_ar: 'أطباق جانبية',
    name_en: 'Sides',
    tagline_ar: 'كرنش زيادة عالطاولة',
    tagline_en: 'Extra crunch for the table',
  },
  {
    id: 'offers',
    name_ar: 'عروض',
    name_en: 'Offers',
    tagline_ar: 'للمشاركة مع الشلّة',
    tagline_en: 'Made for sharing',
  },
  {
    id: 'dips',
    name_ar: 'صوصات',
    name_en: 'Dips',
    tagline_ar: 'صوص ٠٫٣٥ — ٣ صوصات بدينار',
    tagline_en: '1 dip 0.35 — 3 dips 1.00',
  },
  {
    id: 'sweets',
    name_ar: 'كوكيز',
    name_en: 'Cookies',
    tagline_ar: 'مخبوزة طازة',
    tagline_en: 'Freshly baked',
  },
  {
    id: 'drinks',
    name_ar: 'مشروبات',
    name_en: 'Drinks',
    tagline_ar: 'باردة وبتطفّي الحرارة',
    tagline_en: 'Ice cold, puts out the fire',
  },
];

const MEAL_AR = 'تقدّم مع كولسلو، خبز بالثوم، بطاطا كرنكل، صوص ومشروب غازي';
const MEAL_EN = 'Served with coleslaw, garlic toast, crinkle fries, a dip and a soft drink';
const SAND_AR = (s) => `${s} — وجبة مع بطاطا كرنكل ومشروب`;
const SAND_EN = (s) => `${s} — a meal with crinkle fries & a drink`;

export const items = [
  // ─── Tenders ──────────────────────────────────────────────────────
  {
    id: 'tenders-meal', category_id: 'tenders', image: '/img/menu/tenders-meal.webp',
    name_ar: 'وجبة تندرز', name_en: 'Tenders Meal',
    desc_ar: `تندرز مقرمشة ${MEAL_AR.replace('تقدّم', 'تُقدّم')}`, desc_en: `Crispy tenders. ${MEAL_EN}`,
    sizes: pcs([[3, 4.75], [4, 5.75], [5, 6.5]]), options: ['heat', 'dip', 'upsize'], tags: ['signature'], featured: 1,
  },
  {
    id: 'family-tenders', category_id: 'tenders', image: '/img/menu/family-tenders.webp',
    name_ar: 'وجبة تندرز عائلية', name_en: 'Family Tenders Meal',
    desc_ar: `للعيلة كلها. ${MEAL_AR}`, desc_en: `For the whole family. ${MEAL_EN}`,
    note_ar: 'بتكفي ٤-٥ أشخاص', note_en: 'Feeds 4–5',
    sizes: pcs([[15, 18.5], [20, 23.5]]), options: ['heat', 'dip'], tags: [],
  },
  {
    id: 'tenders-solo', category_id: 'tenders', image: '/img/menu/tenders-solo.webp',
    name_ar: 'تندرز سولو', name_en: 'Tenders Solo',
    desc_ar: '٣ قطع تندرز مقرمشة مع خبز بالثوم وصوص', desc_en: '3 crispy tenders with garlic toast and a dip',
    sizes: pcs([[3, 3.15]]), options: ['heat', 'dip'], tags: [],
  },

  // ─── Sandwiches (meals) ───────────────────────────────────────────
  {
    id: 'big-mama', category_id: 'sandwiches', image: '/img/menu/big-mama.webp',
    name_ar: 'بيج ماما', name_en: 'Big Mama',
    desc_ar: SAND_AR('خبز محمّص بالثوم، صدر دجاج مقرمش، خس، شرائح لحم بقري، صوص باربيكيو، جبنة تشيدر ذايبة ومايونيز'),
    desc_en: SAND_EN('Garlic toast, crunchy chicken breast, lettuce, beef strips, BBQ sauce, melted cheddar and mayo'),
    sizes: one(6.85, 'وجبة', 'Meal'), options: ['heat', 'upsize'], tags: ['signature'], featured: 1,
  },
  {
    id: 'cheze', category_id: 'sandwiches', image: '/img/menu/cheze.webp',
    name_ar: 'تشيزي تشكن', name_en: 'Cheze Chicken',
    desc_ar: SAND_AR('خبز بريوش، صدر دجاج مقرمش، خس، كرات جبنة بالهالابينو، جبنة تشيدر وصوص خاص'),
    desc_en: SAND_EN('Brioche bun, crunchy chicken breast, lettuce, jalapeño cheese balls, cheddar, special sauce'),
    note_ar: 'بيجي حار بس', note_en: 'Spicy only',
    sizes: one(6.85, 'وجبة', 'Meal'), options: ['upsize'], tags: ['spicy'], featured: 1,
  },
  {
    id: 'nano', category_id: 'sandwiches', image: '/img/menu/nano.webp',
    name_ar: 'نانو تشكن', name_en: 'Nano Chicken',
    desc_ar: SAND_AR('خبز نان هندي، صدر دجاج مقرمش، خس، بندورة، بصل أحمر، جبنة تشيدر وصوص خاص'),
    desc_en: SAND_EN('Indian naan, crunchy chicken breast, lettuce, tomato, red onion, cheddar, special sauce'),
    sizes: one(6.85, 'وجبة', 'Meal'), options: ['heat', 'upsize'], tags: ['signature'], featured: 1,
  },
  {
    id: 'ultimate', category_id: 'sandwiches', image: '/img/menu/ultimate.webp',
    name_ar: 'ألتيميت تشكن', name_en: 'Ultimate Chicken',
    desc_ar: SAND_AR('خبز بريوش، صدر دجاج مقرمش، خس، بندورة، بصل أحمر، جبنة تشيدر وصوص خاص'),
    desc_en: SAND_EN('Brioche bun, crunchy chicken breast, lettuce, tomato, red onion, cheddar, special sauce'),
    sizes: one(6.25, 'وجبة', 'Meal'), options: ['heat', 'upsize'], tags: [],
  },
  {
    id: 'mamas-boy', category_id: 'sandwiches', image: '/img/menu/mamas-boy.webp',
    name_ar: 'ماماز بوي', name_en: 'Mama’s Boy',
    desc_ar: SAND_AR('خبز بريوش، صدر دجاج مقرمش، خس، جبنة تشيدر، تشيبس بصل وصوص البيكلز'),
    desc_en: SAND_EN('Brioche bun, crunchy chicken breast, lettuce, cheddar, onion chips, pickles sauce'),
    sizes: one(5.95, 'وجبة', 'Meal'), options: ['heat', 'upsize'], tags: [],
  },
  {
    id: 'supreme', category_id: 'sandwiches', image: '/img/menu/supreme.webp',
    name_ar: 'سوبريم تشكن', name_en: 'Supreme Chicken',
    desc_ar: SAND_AR('خبز بريوش، صدر دجاج مقرمش، خس، بندورة، جبنة تشيدر وصوص خاص'),
    desc_en: SAND_EN('Brioche bun, crunchy chicken breast, lettuce, tomato, cheddar, special sauce'),
    sizes: one(5.95, 'وجبة', 'Meal'), options: ['heat', 'upsize'], tags: [],
  },
  {
    id: 'grilled', category_id: 'sandwiches', image: '/img/menu/grilled.webp',
    name_ar: 'جريلد تشكن', name_en: 'Grilled Chicken',
    desc_ar: SAND_AR('خبز بريوش، صدر دجاج مشوي، خس لولو روسو، بندورة، جبنة تشيدر، مخلل وصوص خاص'),
    desc_en: SAND_EN('Brioche bun, grilled chicken breast, lollo rosso, tomato, cheddar, pickles, special sauce'),
    sizes: one(5.95, 'وجبة', 'Meal'), options: ['heat', 'upsize'], tags: ['grilled'],
  },
  {
    id: 'classic', category_id: 'sandwiches', image: '/img/menu/classic.webp',
    name_ar: 'كلاسيك تشكن', name_en: 'Classic Chicken',
    desc_ar: SAND_AR('خبز بريوش، صدر دجاج مقرمش، خس، جبنة تشيدر وصوص ماما'),
    desc_en: SAND_EN('Brioche bun, crunchy chicken breast, lettuce, cheddar, Mama’s sauce'),
    sizes: one(5.5, 'وجبة', 'Meal'), options: ['heat', 'upsize'], tags: [],
  },
  {
    id: 'rocket', category_id: 'sandwiches', image: '/img/menu/rocket.webp',
    name_ar: 'روكيت', name_en: 'Rocket',
    desc_ar: SAND_AR('خبز تورتيلا، قطعتين تندرز مقرمشة، خس، بندورة، بصل أحمر، مكس جبنة وصوص خاص'),
    desc_en: SAND_EN('Tortilla wrap, two crunchy tenders, lettuce, tomato, red onion, mixed cheese, special sauce'),
    sizes: one(4.95, 'وجبة', 'Meal'), options: ['heat', 'upsize'], tags: [],
  },
  {
    id: 'double-spicy-rocket', category_id: 'sandwiches', image: '/img/menu/rocket.webp',
    name_ar: 'دبل سبايسي روكيت', name_en: 'Double Spicy Rocket',
    desc_ar: SAND_AR('خبز تورتيلا، قطعتين تندرز حارة مقرمشة، خس، بندورة، بصل أحمر، مكس جبنة وصوص خاص'),
    desc_en: SAND_EN('Tortilla wrap, two spicy crunchy tenders, lettuce, tomato, red onion, mixed cheese, special sauce'),
    note_ar: 'بيجي حار بس', note_en: 'Spicy only',
    sizes: one(4.95, 'وجبة', 'Meal'), options: ['upsize'], tags: ['spicy'],
  },
  {
    id: 'the-square', category_id: 'sandwiches', image: '/img/menu/the-square.webp',
    name_ar: 'ذا سكوير', name_en: 'The Square',
    desc_ar: SAND_AR('خبز بطاطا مربّع، صوص بيكانتي، خس، بندورة، شيدر أبيض وهالابينو مقلي'),
    desc_en: SAND_EN('Square potato bun, picante sauce, lettuce, tomato, white cheddar, fried jalapeños'),
    sizes: one(5.95, 'وجبة', 'Meal'), options: ['upsize'], tags: ['spicy', 'new'],
  },

  // ─── Wings ────────────────────────────────────────────────────────
  {
    id: 'wings-meal', category_id: 'wings', image: '/img/menu/wings-meal.webp',
    name_ar: 'وجبة وينجز', name_en: 'Wings Meal',
    desc_ar: 'أجنحة دجاج مقرمشة بالنكهة اللي بتختارها، مع بطاطا كرنكل ومشروب', desc_en: 'Crispy bone-in wings in your flavour, with crinkle fries and a drink',
    sizes: pcs([[8, 5.8], [12, 7.3]]), options: ['flavour', 'upsize'], tags: ['signature'], featured: 1,
  },
  {
    id: 'wings-family', category_id: 'wings', image: '/img/menu/wings-family.webp',
    name_ar: 'وجبة وينجز عائلية', name_en: 'Family Wings Meal',
    desc_ar: 'أجنحة دجاج مقرمشة بالنكهة اللي بتختارها، مع بطاطا كرنكل ومشروب', desc_en: 'Crispy bone-in wings in your flavour, with crinkle fries and drinks',
    sizes: pcs([[24, 13.5], [40, 21.0]]), options: ['flavour'], tags: [],
  },
  {
    id: 'wings-solo', category_id: 'wings', image: '/img/menu/wings-solo.webp',
    name_ar: 'وينجز سولو', name_en: 'Wings Solo',
    desc_ar: 'أجنحة دجاج مقرمشة بالنكهة اللي بتختارها', desc_en: 'Crispy bone-in wings in your flavour',
    sizes: pcs([[4, 2.65], [8, 4.8]]), options: ['flavour'], tags: [],
  },

  // ─── Bites ────────────────────────────────────────────────────────
  {
    id: 'bites-meal', category_id: 'bites', image: '/img/menu/bites-meal.webp',
    name_ar: 'وجبة بايتس', name_en: 'Bites Meal',
    desc_ar: 'قطع دجاج مقرمشة بدون عظم بالنكهة اللي بتختارها، مع بطاطا كرنكل ومشروب', desc_en: 'Boneless crispy bites in your flavour, with crinkle fries and a drink',
    sizes: pcs([[12, 5.95], [24, 10.5]]), options: ['flavour', 'upsize'], tags: [],
  },
  {
    id: 'bites-solo', category_id: 'bites', image: '/img/menu/bites-meal.webp',
    name_ar: 'بايتس سولو', name_en: 'Bites Solo',
    desc_ar: 'قطع دجاج مقرمشة بدون عظم بالنكهة اللي بتختارها', desc_en: 'Boneless crispy bites in your flavour',
    sizes: pcs([[6, 3.15], [12, 5.25]]), options: ['flavour'], tags: [],
  },
  {
    id: 'almond-bites', category_id: 'bites', image: '/img/menu/almond-bites.webp',
    name_ar: 'بايتس سويت هيت باللوز', name_en: 'Sweet Heat Almond Bites',
    desc_ar: 'بايتس مقرمشة بصوص حلو وحار ولوز', desc_en: 'Crispy bites glazed sweet & hot, with almonds',
    sizes: [
      { id: 'solo-6', ar: '6 قطع سولو', en: '6 pcs solo', price: jd(3.15) },
      { id: 'meal-12', ar: 'وجبة 12 قطعة', en: '12 pcs meal', price: jd(5.8) },
    ],
    tags: ['new', 'spicy', 'nuts'],
  },

  // ─── Kids ─────────────────────────────────────────────────────────
  {
    id: 'kids-crunch', category_id: 'kids', image: '/img/menu/kids-crunch.webp',
    name_ar: 'كرنش تشكن', name_en: 'Crunch Chicken',
    desc_ar: 'برغر دجاج صغير مع بطاطا وعصير', desc_en: 'Little chicken burger with fries and a juice',
    sizes: one(3.7, 'وجبة', 'Meal'), tags: [],
  },
  {
    id: 'kids-nuggets', category_id: 'kids', image: '/img/menu/kids-nuggets.webp',
    name_ar: 'ناجتس ٥ قطع', name_en: 'Nuggets 5 pcs',
    desc_ar: '٥ قطع ناجتس مع بطاطا وعصير', desc_en: '5 nuggets with fries and a juice',
    sizes: one(3.7, 'وجبة', 'Meal'), tags: [],
  },

  // ─── Sides ────────────────────────────────────────────────────────
  {
    id: 'fries', category_id: 'sides', image: '/img/menu/fries.webp',
    name_ar: 'بطاطا كرنكل', name_en: 'Crinkle Fries',
    desc_ar: 'بطاطا متعرّجة مقرمشة ومتبّلة', desc_en: 'Crispy, seasoned crinkle-cut fries',
    sizes: [{ id: 'm', ar: 'وسط', en: 'Medium', price: jd(1.3) }, { id: 'l', ar: 'كبير', en: 'Large', price: jd(1.85) }], tags: ['veg', 'signature'],
  },
  {
    id: 'cheese-balls', category_id: 'sides', image: '/img/menu/cheese-balls.webp',
    name_ar: 'كرات الجبنة الحارة', name_en: 'Jalapeño Cheese Balls',
    desc_ar: 'كرات ذهبية محشية جبنة ذايبة وهالابينو', desc_en: 'Golden balls filled with melted cheese and jalapeño',
    sizes: pcs([[3, 1.6], [6, 2.65]]), tags: ['veg', 'spicy'],
  },
  {
    id: 'mozzarella', category_id: 'sides', image: '/img/menu/mozzarella.webp',
    name_ar: 'أصابع موزاريلا', name_en: 'Mozzarella Sticks',
    desc_ar: 'مقرمشة من برّا وجبنة بتمطّ من جوّا', desc_en: 'Crunchy outside, stretchy cheese inside',
    sizes: pcs([[3, 2.15], [6, 3.7]]), tags: ['veg'],
  },
  {
    id: 'onion-rings', category_id: 'sides', image: '/img/menu/onion-rings.webp',
    name_ar: 'حلقات البصل', name_en: 'Onion Rings',
    desc_ar: 'حلقات بصل بعجينة مقرمشة', desc_en: 'Onion rings in a crispy batter',
    sizes: pcs([[6, 1.6], [12, 2.65]]), tags: ['veg'],
  },
  {
    id: 'garlic-toast', category_id: 'sides', image: '/img/menu/garlic-toast.webp',
    name_ar: 'خبز بالثوم', name_en: 'Garlic Toast',
    desc_ar: 'خبز طري بزبدة الثوم، محمّص لحد ما يذهّب', desc_en: 'Soft bread brushed with garlic butter, toasted golden',
    sizes: [{ id: '1pc', ar: 'قطعة', en: '1 pc', price: jd(0.35) }, { id: '3pc', ar: '٣ قطع', en: '3 pcs', price: jd(1.0) }], tags: ['veg'],
  },
  {
    id: 'coleslaw', category_id: 'sides', image: '/img/menu/coleslaw.webp',
    name_ar: 'كولسلو', name_en: 'Coleslaw',
    desc_ar: 'ملفوف وجزر طازة بصوص كريمي خفيف', desc_en: 'Fresh cabbage and carrot in a light creamy dressing',
    sizes: [{ id: '1pc', ar: 'علبة', en: '1 cup', price: jd(0.6) }, { id: '2pc', ar: 'علبتين', en: '2 cups', price: jd(1.0) }], tags: ['veg'],
  },

  // ─── Offers ───────────────────────────────────────────────────────
  {
    id: 'share-box', category_id: 'offers', image: '/img/menu/share-box.webp',
    name_ar: 'شير بوكس', name_en: 'Share Box',
    desc_ar: '٣ ساندويشات على اختيارك (سوبريم، كلاسيك أو نانو) + ١٢ قطعة بايتس + بطاطا مرتين', desc_en: 'Any 3 sandwiches (Supreme, Classic or Nano) + 12 bites + two fries',
    note_ar: 'اكتب الساندويشات بالملاحظة', note_en: 'Write your sandwiches in the note',
    sizes: one(15.99, 'بوكس', 'Box'), options: ['heat'], tags: ['new'], featured: 1,
  },
  {
    id: 'snack-box', category_id: 'offers', image: '/img/menu/snack-box.webp',
    name_ar: 'سناك بوكس', name_en: 'Snack Box',
    desc_ar: '٣ أصابع موزاريلا، ٣ كرات جبنة حارة و٣ حلقات بصل', desc_en: '3 mozzarella sticks, 3 jalapeño cheese balls, 3 onion rings',
    sizes: one(3.5, 'بوكس', 'Box'), tags: ['veg'],
  },

  // ─── Dips (is_dip: can be picked as the dip that comes with a meal) ──
  ...[
    ['mamas', 'صوص ماما', 'Mama’s Sauce'],
    ['garlic', 'صوص الثوم', 'Garlic Sauce'],
    ['honey-mustard', 'هني ماسترد', 'Honey Mustard'],
    ['ranch', 'رانش', 'Ranch'],
    ['bbq', 'باربيكيو', 'BBQ'],
    ['pickles', 'صوص البيكلز', 'Pickles Sauce'],
    ['sweet-chili', 'سويت تشيلي', 'Sweet Chili'],
    ['dynamite', 'دايناميت', 'Dynamite'],
    ['buffalo', 'بافلو', 'Buffalo'],
    ['spicy-mayo', 'مايونيز حار', 'Spicy Mayo'],
  ].map(([id, ar, en]) => ({
    id: `dip-${id}`, category_id: 'dips', image: '',
    name_ar: ar, name_en: en, desc_ar: '', desc_en: '',
    sizes: [{ id: '1pc', ar: 'علبة', en: '1 cup', price: jd(0.35) }, { id: '3pc', ar: '3 علب', en: '3 cups', price: jd(1.0) }],
    tags: ['sweet-chili', 'dynamite', 'buffalo', 'spicy-mayo'].includes(id) ? ['spicy'] : [], is_dip: 1,
  })),
  {
    id: 'specialty-sauce', category_id: 'dips', image: '',
    name_ar: 'صوصات ماما الخاصة', name_en: 'Mama’s Specialty Sauces',
    desc_ar: 'علبة أكبر من صوصاتنا المميزة', desc_en: 'A bigger pot of our signature sauces',
    sizes: [
      { id: 'truffle', ar: 'ترافل', en: 'Truffle', price: jd(1.0) },
      { id: 'pickles', ar: 'بيكلز', en: 'Pickles', price: jd(1.0) },
      { id: 'spicy-mayo', ar: 'مايو حار', en: 'Spicy mayo', price: jd(1.0) },
    ],
    tags: ['new'],
  },

  // ─── Cookies ──────────────────────────────────────────────────────
  {
    id: 'cookies', category_id: 'sweets', image: '/img/menu/cookies.webp',
    name_ar: 'كوكيز ماما', name_en: 'Mama’s Cookies',
    desc_ar: 'كوكيز طرية مخبوزة طازة', desc_en: 'Soft, freshly baked cookies',
    sizes: [
      { id: 'chunk', ar: '2 تشانك شوكولاتة', en: '2 chocolate chunk', price: jd(1.6) },
      { id: 'double', ar: '2 دبل شوكولاتة', en: '2 double chocolate', price: jd(1.6) },
    ],
    tags: ['veg'],
  },

  // ─── Drinks ───────────────────────────────────────────────────────
  {
    id: 'soft-drink', category_id: 'drinks', image: '',
    name_ar: 'مشروب غازي', name_en: 'Soft Drink',
    desc_ar: 'اكتب النوع بالملاحظات', desc_en: 'Tell us the flavour in the notes',
    sizes: [{ id: '250ml', ar: '٢٥٠ مل', en: '250 ml', price: jd(0.6) }, { id: '1l', ar: '١ لتر', en: '1 L', price: jd(1.0) }], tags: [],
  },
  {
    id: 'juice', category_id: 'drinks', image: '',
    name_ar: 'عصير', name_en: 'Juice',
    desc_ar: '', desc_en: '', sizes: one(0.65), tags: [],
  },
  {
    id: 'water', category_id: 'drinks', image: '',
    name_ar: 'مياه معدنية', name_en: 'Mineral Water',
    desc_ar: '', desc_en: '', sizes: one(0.45), tags: [],
  },
];

// One WhatsApp number takes orders for every branch; home delivery goes through Talabat.
const WA = '962775866660';
const PHONE = '+96265666660';
// Google Maps place ids (from each branch's Maps listing): exact pin, directions, reviews
const maps = (q, id) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&query_place_id=${id}`;

export const branches = [
  {
    id: 'marj-al-hamam',
    name_ar: 'مرج الحمام', name_en: 'Marj Al Hamam',
    address_ar: 'مرج الحمام — شارع سعيد العبادي', address_en: 'Marj Al Hamam — Saeed Al Abbadi St.',
    phone: PHONE, whatsapp: WA,
    maps_url: maps("Mama's Tenders Marj Al Hamam", 'ChIJ5ZTUVQCnHBUR5QKHv6hJwmc'), place_id: 'ChIJ5ZTUVQCnHBUR5QKHv6hJwmc',
    rating: 4.9, reviews: 2859,
    open_time: '11:00', close_time: '02:00',
    delivery: 0, accepting: 1, sort: 1,
  },
  {
    id: 'seventh-circle',
    name_ar: 'الدوار السابع', name_en: '7th Circle',
    address_ar: 'عمّان — الدوار السابع', address_en: 'Amman — 7th Circle',
    phone: PHONE, whatsapp: WA,
    maps_url: maps("MAMA'S TENDERS 7th Circle", 'ChIJ-0lGbKqhHBURS2Wwgl3bjyI'), place_id: 'ChIJ-0lGbKqhHBURS2Wwgl3bjyI',
    rating: 4.8, reviews: 4371,
    open_time: '11:00', close_time: '02:00',
    delivery: 0, accepting: 1, sort: 2,
  },
  {
    id: 'mecca-mall',
    name_ar: 'مكة مول', name_en: 'Mecca Mall',
    address_ar: 'شارع مكة — داخل مكة مول', address_en: 'Mecca St. — inside Mecca Mall',
    phone: PHONE, whatsapp: WA,
    maps_url: maps("MAMA'S TENDERS Mecca Mall Amman", 'ChIJ83HABYuhHBUR3u7OBFXqKVE'), place_id: 'ChIJ83HABYuhHBUR3u7OBFXqKVE',
    rating: 4.9, reviews: 2719,
    open_time: '11:00', close_time: '00:00',
    delivery: 0, accepting: 1, sort: 3,
  },
  {
    id: 'khalda',
    name_ar: 'خلدا', name_en: 'Khalda',
    address_ar: 'خلدا — شارع وصفي التل', address_en: 'Khalda — Wasfi Al Tal St.',
    phone: PHONE, whatsapp: WA,
    maps_url: maps("MAMA'S TENDERS Wasfi Al Tal Khalda Amman", 'ChIJNd_Qg4yhHBUR9VhXOZo4wWk'), place_id: 'ChIJNd_Qg4yhHBUR9VhXOZo4wWk',
    rating: 4.9, reviews: 3056,
    open_time: '11:00', close_time: '01:00',
    hours_note_ar: 'الخميس والجمعة لـ ٢ بالليل', hours_note_en: 'Thu & Fri till 2 AM',
    delivery: 0, accepting: 1, sort: 4,
  },
];

export const settings = {
  combo_price: '1000',
  google_rating: '4.9',
  google_reviews: '13000',
  delivery_note_ar: 'التوصيل للبيت عن طريق طلبات أو كريم، أو اتصل على 06 566 6660',
  delivery_note_en: 'Home delivery through Talabat or Careem, or call 06 566 6660',
  announcement_ar: '',
  announcement_en: '',
  hours_note_ar: '',
  hours_note_en: '',
  halal: '1',
  instagram: 'https://www.instagram.com/mamastendersjo/',
  tiktok: '',
  facebook: '',
  talabat: 'https://www.talabat.com/jordan/mamas-tenders',
  orders_enabled: '1',
};
