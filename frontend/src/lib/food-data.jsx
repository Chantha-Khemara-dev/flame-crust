const categoryMeta = {
  all: {
    label: "All Foods",
    description: "Explore our full delicious menu of wood-fired sourdough pizzas, bagels, burgers & sides.",
    icon: "🍽️",
    badge: "All"
  },
  pizza: {
    label: "Pizza",
    description: "Wood-fired sourdough crusts topped with fresh gourmet ingredients.",
    icon: "🍕",
    badge: "Crusts"
  },
  "pizza-bagels": {
    label: "Pizza Bagels",
    description: "Hand-rolled bagels meet pizzeria magic. Perfect snack-size.",
    icon: "🥯",
    badge: "Bagels"
  },
  burgers: {
    label: "Burgers",
    description: "Smashed Angus patties, gourmet toppings, toasted brioche buns.",
    icon: "🍔",
    badge: "Burgers"
  },
  sides: {
    label: "Sides",
    description: "The crispy, savory supporting cast that steals the show.",
    icon: "🍟",
    badge: "Sides"
  },
  drink: {
    label: "Drinks",
    description: "Refreshing cold drinks & craft beverages to pair with your meal.",
    icon: "🥤",
    badge: "Drinks"
  },
  chicken: {
    label: "Chicken",
    description: "Crispy fried wings, tenders & chef-seasoned chicken specials.",
    icon: "🍗",
    badge: "Chicken"
  },
  beef: {
    label: "Beef",
    description: "Premium cuts and flame-grilled gourmet beef dishes.",
    icon: "🥩",
    badge: "Beef"
  },
  cheese: {
    label: "Cheese",
    description: "Melted mozzarella, artisan cheeses, and cheesy perfection.",
    icon: "🧀",
    badge: "Cheese"
  },
  mushroom: {
    label: "Mushroom",
    description: "Earthy portobello & button mushroom specialties.",
    icon: "🍄",
    badge: "Veg"
  }
};

const categoryOrder = [
  "all",
  "pizza",
  "pizza-bagels",
  "burgers",
  "sides",
  "drink"
];

const DEFAULT_FALLBACK_PRODUCTS = [
  {
    id: "1",
    sku: "PIZ-MARG",
    category_id: 1,
    name: "Classic Margherita Pizza",
    description: "Wood-fired sourdough crust, San Marzano tomato sauce, fresh buffalo mozzarella, aromatic basil, and extra virgin olive oil.",
    price: 10.99,
    base_price: 10.99,
    category: "pizza",
    image: "/images/library/margherita.jpg",
    tags: ["Signature", "Vegetarian", "WoodFired"],
    rating: 4.9,
    sales_count: 86,
    popular: true,
    spicy: false,
    vegetarian: true,
    active: true,
    options: [
      {
        id: 1,
        name: "Size",
        is_required: true,
        variants: [
          { id: 1, name: 'Personal 10"', price_adjustment: 0.00, active: true },
          { id: 2, name: 'Medium 12"', price_adjustment: 2.50, active: true },
          { id: 3, name: 'Large 14"', price_adjustment: 4.50, active: true }
        ]
      }
    ]
  },
  {
    id: "2",
    sku: "PIZ-PEPP",
    category_id: 1,
    name: "Pepperoni Supreme Pizza",
    description: "Crispy cupping pepperoni, melted aged mozzarella, rich herb tomato sauce, hot honey drizzle on sourdough crust.",
    price: 12.99,
    base_price: 12.99,
    category: "pizza",
    image: "/images/library/pepperoni.jpg",
    tags: ["BestSeller", "Spicy", "Crispy"],
    rating: 5.0,
    sales_count: 163,
    popular: true,
    spicy: true,
    vegetarian: false,
    active: true,
    options: [
      {
        id: 2,
        name: "Size",
        is_required: true,
        variants: [
          { id: 4, name: 'Personal 10"', price_adjustment: 0.00, active: true },
          { id: 5, name: 'Medium 12"', price_adjustment: 2.50, active: true },
          { id: 6, name: 'Large 14"', price_adjustment: 4.50, active: true }
        ]
      }
    ]
  },
  {
    id: "3",
    sku: "PIZ-BBQ",
    category_id: 1,
    name: "Smoked BBQ Chicken Pizza",
    description: "Tender flame-grilled chicken breast, smoky BBQ sauce, caramelized red onions, sweet corn, and melted smoked gouda.",
    price: 13.49,
    base_price: 13.49,
    category: "pizza",
    image: "/images/library/bbq-chicken.jpg",
    tags: ["Smoky", "ProteinRich", "ChefSpecial"],
    rating: 4.8,
    popular: true,
    spicy: false,
    vegetarian: false,
    active: true,
    options: [
      {
        id: 3,
        name: "Size",
        is_required: true,
        variants: [
          { id: 7, name: 'Personal 10"', price_adjustment: 0.00, active: true },
          { id: 8, name: 'Medium 12"', price_adjustment: 2.50, active: true },
          { id: 9, name: 'Large 14"', price_adjustment: 4.50, active: true }
        ]
      }
    ]
  },
  {
    id: "4",
    sku: "PIZ-TRUF",
    category_id: 1,
    name: "Truffle Wild Mushroom Pizza",
    description: "Earthy roasted portobello & cremini mushrooms, white truffle cream sauce, fresh thyme, and shaved parmesan.",
    price: 14.29,
    base_price: 14.29,
    category: "pizza",
    image: "/images/library/truffle-mushroom.jpg",
    tags: ["Gourmet", "Vegetarian", "Truffle"],
    rating: 4.9,
    popular: true,
    spicy: false,
    vegetarian: true,
    active: true
  },
  {
    id: "5",
    sku: "PIZ-MEAT",
    category_id: 1,
    name: "Carnivore Meat Lovers Pizza",
    description: "Handcrafted Italian sausage, crispy bacon bits, savory ground Angus beef, pepperoni, and rich tomato sauce.",
    price: 14.99,
    base_price: 14.99,
    category: "pizza",
    image: "/images/library/meat-lovers.jpg",
    tags: ["MeatLovers", "Hearty", "Savory"],
    rating: 4.9,
    popular: true,
    spicy: false,
    vegetarian: false,
    active: true
  },
  {
    id: "6",
    sku: "BAG-PEPP",
    category_id: 2,
    name: "Cheesy Pepperoni Pizza Bagel",
    description: "Toasted artisan NYC-style bagel halves topped with garlic butter, marinara, mozzarella, and mini pepperoni crisps.",
    price: 6.49,
    base_price: 6.49,
    category: "pizza-bagels",
    image: "/images/library/bagel-pep.jpg",
    tags: ["Snack", "Cheesy", "Handheld"],
    rating: 4.7,
    sales_count: 39,
    popular: true,
    spicy: true,
    vegetarian: false,
    active: true
  },
  {
    id: "7",
    sku: "BAG-MARG",
    category_id: 2,
    name: "Four-Cheese Garlic Bagel",
    description: "Crispy bagel loaded with parmesan, mozzarella, provolone, fontina, and roasted garlic herb butter.",
    price: 5.99,
    base_price: 5.99,
    category: "pizza-bagels",
    image: "/images/library/bagel-cheese.jpg",
    tags: ["Cheesy", "Vegetarian", "Garlic"],
    rating: 4.8,
    sales_count: 6,
    popular: false,
    spicy: false,
    vegetarian: true,
    active: true
  },
  {
    id: "8",
    sku: "BUR-ANGUS",
    category_id: 3,
    name: "Flame Smashed Double Cheeseburger",
    description: "Two 100% Angus smashed patties, double melted cheddar, grilled onions, house secret burger sauce on toasted brioche.",
    price: 9.99,
    base_price: 9.99,
    category: "burgers",
    image: "/images/library/burger-angus.jpg",
    tags: ["Angus", "DoublePatty", "Juicy"],
    rating: 5.0,
    sales_count: 14,
    popular: true,
    spicy: false,
    vegetarian: false,
    active: true
  },
  {
    id: "9",
    sku: "BUR-TRUF",
    category_id: 3,
    name: "Truffle Swiss Smash Burger",
    description: "Smashed Angus patty, sautéed portobello mushrooms, melted Swiss cheese, and black truffle aioli on brioche.",
    price: 11.49,
    base_price: 11.49,
    category: "burgers",
    image: "/images/library/burger-truffle.jpg",
    tags: ["Truffle", "Gourmet", "Smashed"],
    rating: 4.8,
    popular: false,
    spicy: false,
    vegetarian: false,
    active: true
  },
  {
    id: "10",
    sku: "SID-WINGS",
    category_id: 4,
    name: "Crispy Garlic Parmesan Wings",
    description: "Juicy bone-in chicken wings tossed in garlic herb butter, grated aged parmesan, served with house ranch.",
    price: 7.99,
    base_price: 7.99,
    category: "sides",
    image: "/images/library/wings.jpg",
    tags: ["Crispy", "Savory", "Wings"],
    rating: 4.9,
    popular: true,
    spicy: false,
    vegetarian: false,
    active: true
  },
  {
    id: "11",
    sku: "SID-FRIES",
    category_id: 4,
    name: "Loaded Truffle Parmesan Fries",
    description: "Golden crispy fries tossed in rosemary sea salt, truffle oil, grated parmesan, and chives.",
    price: 4.99,
    base_price: 4.99,
    category: "sides",
    image: "/images/library/fries.jpg",
    tags: ["Crispy", "Truffle", "SideFavorite"],
    rating: 4.8,
    popular: true,
    spicy: false,
    vegetarian: true,
    active: true
  },
  {
    id: "12",
    sku: "DRK-LEMON",
    category_id: 5,
    name: "Fresh Mint Craft Lemonade",
    description: "Freshly squeezed citrus lemonade infused with garden mint and sparkling botanical water.",
    price: 3.49,
    base_price: 3.49,
    category: "drink",
    image: "/images/library/lemonade.jpg",
    tags: ["Refreshing", "Cold", "Citrus"],
    rating: 4.9,
    popular: true,
    spicy: false,
    vegetarian: true,
    active: true
  },
  {
    id: "13",
    sku: "DRK-COLA",
    category_id: 5,
    name: "Artisan Craft Cane Cola",
    description: "Cold-brewed botanical cane sugar cola served over cracked ice.",
    price: 2.99,
    base_price: 2.99,
    category: "drink",
    image: "/images/library/cola.jpg",
    tags: ["Classic", "Craft", "Cold"],
    rating: 4.7,
    popular: false,
    spicy: false,
    vegetarian: true,
    active: true
  }
];

const DEFAULT_REVIEWS = [
  {
    id: 101,
    product_id: 1,
    customer_name: "Khemara",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1787849244/gxbpcvwqzmdsi2pwuzyu.jpg",
    rating: 5,
    comment: "រសជាតិឆ្ងាញ់ខ្លាំងណាស់! ម្សៅនំបុ័ង sourdough បំពងឈ្ងុយ ក្លិនឈីស និងស្លឹក basil ស្រស់ល្អឥតខ្ចោះ។ ខ្ញុំនឹងកម្ម៉ង់ញ៉ាំទៀតច្បាស់ណាស់!",
    created_at: "2026-08-25T10:15:00Z",
    is_verified_purchase: true
  },
  {
    id: 102,
    product_id: 1,
    customer_name: "Sokleng",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1787834892/ctkcvof8bskcurmrrryu.jpg",
    rating: 5,
    comment: "The authentic Neapolitan taste in town! Crust is airy, chewy, and light with perfectly balanced tomato sauce.",
    created_at: "2026-08-26T14:30:20Z",
    is_verified_purchase: true
  },
  {
    id: 103,
    product_id: 1,
    customer_name: "Chantha Khemara",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1787833850/sn9trvzopyumdrlxqkl2.jpg",
    rating: 4,
    comment: "ភីហ្សាឆ្ងាញ់ ក្តៅៗស្រួយល្អ សេវាកម្មដឹកជញ្ជូនរហ័សទាន់ចិត្ត គ្រាន់តែថែម basil បន្តិចទៀតកាន់តែអែម។",
    created_at: "2026-08-27T18:05:12Z",
    is_verified_purchase: true
  },
  {
    id: 104,
    product_id: 2,
    customer_name: "Sokleng cute",
    customer_avatar: null,
    rating: 5,
    comment: "Pepperoni ស្រួយឆ្ងាញ់ខ្លាំង ហឹរតិចៗត្រូវមាត់ជាមួយ hot honey ផ្អែមមុតស្រាល! ញ៉ាំជក់មាត់ណាស់។",
    created_at: "2026-08-26T19:22:15Z",
    is_verified_purchase: true
  },
  {
    id: 105,
    product_id: 2,
    customer_name: "Khemara",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1787849244/gxbpcvwqzmdsi2pwuzyu.jpg",
    rating: 5,
    comment: "This is our go-to pizza every Friday night. Incredible cup & char pepperoni and cheese pull!",
    created_at: "2026-08-27T20:10:45Z",
    is_verified_purchase: true
  },
  {
    id: 106,
    product_id: 3,
    customer_name: "Chantha Khemara",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1787833850/sn9trvzopyumdrlxqkl2.jpg",
    rating: 5,
    comment: "Pizza Bagel នេះប្លែកហើយឆ្ងាញ់ណាស់! Bagel ខាងក្រៅស្រួយ ខាងក្នុងទន់ ឈីសពេញៗមាត់។",
    created_at: "2026-08-25T15:45:00Z",
    is_verified_purchase: true
  },
  {
    id: 107,
    product_id: 4,
    customer_name: "Khemara",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1787849244/gxbpcvwqzmdsi2pwuzyu.jpg",
    rating: 5,
    comment: "Burger សាច់ Angus ពីរជាន់ juicy ខ្លាំង! Caramelized onion និង bacon jam ធ្វើឱ្យរសជាតិដាច់គេតែម្តង។ 10/10!",
    created_at: "2026-08-26T12:20:00Z",
    is_verified_purchase: true
  },
  {
    id: 108,
    product_id: 5,
    customer_name: "Sokleng",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1787834892/ctkcvof8bskcurmrrryu.jpg",
    rating: 5,
    comment: "ដំឡូងបារាំងបំពងក្លិន Truffle ឈ្ងុយសាយភាយ ជាមួយ Parmesan ម៉ត់ និង garlic aioli dip ឆ្ងាញ់ញៀន!",
    created_at: "2026-08-27T17:35:00Z",
    is_verified_purchase: true
  },
  {
    id: 109,
    product_id: 6,
    customer_name: "Chantha Khemara",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1787833850/sn9trvzopyumdrlxqkl2.jpg",
    rating: 5,
    comment: "អ្នកស្រឡាញ់ឈីសមិនគួររំលងទេ! Gorgonzola ជាមួយ Truffle honey ចូលគ្នាល្អឥតខ្ចោះ រសជាតិផ្អែមប្រៃបែប Premium។",
    created_at: "2026-08-26T21:15:00Z",
    is_verified_purchase: true
  },
  {
    id: 110,
    product_id: 4,
    customer_name: "Chantha Khemara",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1787833850/sn9trvzopyumdrlxqkl2.jpg",
    rating: 5,
    comment: "Burger សាច់ Angus ពីរជាន់ juicy ខ្លាំង! Caramelized onion និង bacon jam ធ្វើឱ្យរសជាតិដាច់គេតែម្តង។ 10/10 ត្រូវចិត្តខ្លាំង!",
    created_at: "2026-08-27T18:30:00Z",
    is_verified_purchase: true
  },
  {
    id: 111,
    product_id: 2,
    customer_name: "Sokleng",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1787834892/ctkcvof8bskcurmrrryu.jpg",
    rating: 5,
    comment: "ឈីសច្រើន pepperoni ស្រួយឆ្ងាញ់ ដឹកមកដល់នៅក្តៅហុយៗ។ Recommend សម្រាប់អ្នកចូលចិត្តរសជាតិបែប American-Italian!",
    created_at: "2026-08-29T11:30:00Z",
    is_verified_purchase: true
  },
  {
    id: 112,
    product_id: 3,
    customer_name: "Khemara",
    customer_avatar: "https://res.cloudinary.com/gdkctwwo/image/upload/v1788378288/isqcmoousnfzttu3bimz.jpg",
    rating: 5,
    comment: "Pizza Bagel នេះប្លែកហើយឆ្ងាញ់ណាស់! Bagel ខាងក្រៅស្រួយ ខាងក្នុងទន់ ឈីសពេញៗមាត់។ កូនៗខ្ញុំចូលចិត្តខ្លាំង។",
    created_at: "2026-08-25T15:45:00Z",
    is_verified_purchase: true
  },
  {
    id: 113,
    product_id: 1,
    customer_name: "Khen Chet",
    customer_avatar: "https://lh3.googleusercontent.com/a/ACg8ocJH3fTCAuRs8dcJYJuoy3PtVLRXgOAlVNWEQVJP8EzRf-AmrJYa=s96-c",
    rating: 5,
    comment: "The authentic Neapolitan taste in town! Crust is airy, chewy, and light with perfectly balanced tomato sauce. Best pizza in Phnom Penh!",
    created_at: "2026-08-26T14:30:20Z",
    is_verified_purchase: true
  },
  {
    id: 114,
    product_id: 6,
    customer_name: "Srey Leak",
    customer_avatar: "https://lh3.googleusercontent.com/a/ACg8ocK0urhPkTM23sGDETFZ8yhhfe--YZst2CP9QTcjSCfAHUpzmBQ=s96-c",
    rating: 5,
    comment: "ភីហ្សាឆ្ងាញ់ ក្តៅៗស្រួយល្អ សេវាកម្មដឹកជញ្ជូនរហ័សទាន់ចិត្ត គ្រាន់តែបើកប្រអប់ភ្លាមឈ្ងុយសាយភាយពេញផ្ទះ!",
    created_at: "2026-08-27T18:05:12Z",
    is_verified_purchase: true
  },
  {
    id: 115,
    product_id: 5,
    customer_name: "Khemara (kira)",
    customer_avatar: "https://lh3.googleusercontent.com/a/ACg8ocLd9RuuN9RwU2tZa9lL0iI10bL5Z3xAIAKCXcpH30PVL8iw5A=s96-c",
    rating: 5,
    comment: "ដំឡូងបារាំងបំពងក្លិន Truffle ឈ្ងុយសាយភាយ ជាមួយ Parmesan ម៉ត់ និង garlic aioli dip ឆ្ងាញ់ញៀនជាប់ចិត្ត!",
    created_at: "2026-08-28T12:40:00Z",
    is_verified_purchase: true
  }
];

export {
  categoryMeta,
  categoryOrder,
  DEFAULT_FALLBACK_PRODUCTS,
  DEFAULT_REVIEWS
};

