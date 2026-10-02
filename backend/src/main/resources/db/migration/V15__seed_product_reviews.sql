-- V15: Seed authentic customer reviews for menu products
-- Products: 1 (Margherita), 2 (Pepperoni Diavola), 3 (Classic Pizza Bagel), 4 (Flame & Crust Signature Burger), 5 (Truffle Parm Fries), 6 (Quattro Formaggi), 8 (Pepperoni Bagel), 10 (Bacon Blue Deluxe), 13 (Buffalo Wings), 23 (Crispy Chicken Burger)

INSERT INTO `reviews` (`product_id`, `customer_id`, `rating`, `comment`, `created_at`, `is_verified_purchase`)
VALUES
  -- Product 1: Margherita Classica
  (1, 2, 5, 'រសជាតិឆ្ងាញ់ខ្លាំងណាស់! ម្សៅនំបុ័ង sourdough បំពងឈ្ងុយ ក្លិនឈីស និងស្លឹក basil ស្រស់ល្អឥតខ្ចោះ។ ខ្ញុំនឹងកម្ម៉ង់ញ៉ាំទៀតច្បាស់ណាស់!', '2026-08-25 10:15:00', 1),
  (1, 3, 5, 'The authentic Neapolitan taste in town! Crust is airy, chewy, and light with perfectly balanced tomato sauce.', '2026-08-26 14:30:20', 1),
  (1, 5, 4, 'ភីហ្សាឆ្ងាញ់ ក្តៅៗស្រួយល្អ សេវាកម្មដឹកជញ្ជូនរហ័សទាន់ចិត្ត គ្រាន់តែថែម basil បន្តិចទៀតកាន់តែអែម។', '2026-08-27 18:05:12', 1),
  (1, 8, 5, 'Best margherita pizza! Very fresh buffalo mozzarella and sourdough crust is unmatched.', '2026-08-28 12:40:00', 0),

  -- Product 2: Pepperoni Diavola
  (2, 3, 5, 'Pepperoni ស្រួយឆ្ងាញ់ខ្លាំង ហឹរតិចៗត្រូវមាត់ជាមួយ hot honey ផ្អែមមុតស្រាល! ញ៉ាំជក់មាត់ណាស់។', '2026-08-26 19:22:15', 1),
  (2, 5, 5, 'This is our go-to pizza every Friday night. Incredible cup & char pepperoni and cheese pull!', '2026-08-27 20:10:45', 1),
  (2, 12, 4, 'ឈីសច្រើន pepperoni ស្រួយឆ្ងាញ់ ដឹកមកដល់នៅក្តៅហុយៗ។ Recommend សម្រាប់អ្នកចូលចិត្តរសជាតិបែប American-Italian!', '2026-08-29 11:30:00', 1),

  -- Product 3: Classic Pizza Bagel
  (3, 2, 5, 'Pizza Bagel នេះប្លែកហើយឆ្ងាញ់ណាស់! Bagel ខាងក្រៅស្រួយ ខាងក្នុងទន់ ឈីសពេញៗមាត់។ កូនៗខ្ញុំចូលចិត្តខ្លាំង។', '2026-08-25 15:45:00', 1),
  (3, 8, 5, 'Perfect snack size! The everything seasoning on the bagel combined with pizza toppings is genius.', '2026-08-27 09:12:33', 1),
  (3, 10, 4, 'រសជាតិឆ្ងាញ់ តម្លៃសមរម្យ ញ៉ាំពេលរសៀលជាមួយកាហ្វេត្រូវគ្នាខ្លាំង។', '2026-08-28 16:50:10', 0),

  -- Product 4: Flame & Crust Signature Burger
  (4, 5, 5, 'Burger សាច់ Angus ពីរជាន់ juicy ខ្លាំង! Caramelized onion និង bacon jam ធ្វើឱ្យរសជាតិដាច់គេតែម្តង។ 10/10!', '2026-08-26 12:20:00', 1),
  (4, 2, 5, 'One of the juiciest smash burgers in Phnom Penh. Brioche bun toasted to perfection.', '2026-08-28 13:10:00', 1),
  (4, 12, 5, 'សាច់គោ Angus ឈ្ងុយខ្លាំង ទឹកជ្រលក់ពិសេសរបស់ហាងឆ្ងាញ់ប្លែក ញ៉ាំហើយចង់ញ៉ាំទៀត!', '2026-08-29 19:40:15', 1),

  -- Product 5: Truffle Parm Fries
  (5, 3, 5, 'ដំឡូងបារាំងបំពងក្លិន Truffle ឈ្ងុយសាយភាយ ជាមួយ Parmesan ម៉ត់ និង garlic aioli dip ឆ្ងាញ់ញៀន!', '2026-08-27 17:35:00', 1),
  (5, 7, 5, 'Crispy outside, fluffy inside. Truffle aroma is rich and not artificial at all. Must order side!', '2026-08-28 20:05:40', 1),

  -- Product 6: Quattro Formaggi
  (6, 2, 5, 'អ្នកស្រឡាញ់ឈីសមិនគួររំលងទេ! Gorgonzola ជាមួយ Truffle honey ចូលគ្នាល្អឥតខ្ចោះ រសជាតិផ្អែមប្រៃបែប Premium។', '2026-08-26 21:15:00', 1),
  (6, 11, 4, 'Very rich four cheese blend, the walnuts add an amazing texture.', '2026-08-29 14:00:25', 0),

  -- Product 8: Pepperoni Pizza Bagel
  (8, 5, 5, 'បាហ្គែលភីហ្សា Pepperoni នេះស្រួយស្រួលញ៉ាំ ឈីសច្រើន Pepperoni បំពងស្រួយក្រៀមឆ្ងាញ់ណាស់!', '2026-08-28 11:20:00', 1),
  (8, 12, 5, 'Super crispy and comforting. Great portion for lunch!', '2026-08-29 12:15:30', 1),

  -- Product 10: Bacon Blue Deluxe
  (10, 8, 5, 'Gorgonzola cheese and bacon blend on Angus patty is top tier! Bold flavor for true burger lovers.', '2026-08-27 13:45:10', 1),
  (10, 10, 4, 'រសជាតិដិតល្អ សាច់គោទន់ស្រួលញ៉ាំ ទឹកជ្រលក់ balsamic glaze កាត់ទ្រលាន់បានយ៉ាងល្អ។', '2026-08-28 18:30:00', 1),

  -- Product 13: Buffalo Wings
  (13, 3, 5, 'ស្លាបមាន់បំពងស្រួយ ទឹកជ្រលក់ Buffalo ជូរហឹរកំពុងតែត្រូវមាត់ Dip ជាមួយ Blue cheese dip គឺអេមខ្លាំង!', '2026-08-26 18:50:00', 1),
  (13, 7, 5, 'Awesome crispy jumbo wings! Spicy kick is just right and very juicy inside.', '2026-08-28 17:25:40', 1),

  -- Product 23: Crispy Chicken Burger
  (23, 2, 5, 'សាច់មាន់បំពងបន្ទះធំ ស្រួយក្រៅទន់ក្នុង ទឹកជ្រលក់ hot honey mayo រសជាតិប្លែកឆ្ងាញ់ខ្លាំង!', '2026-08-27 12:10:00', 1),
  (23, 12, 5, 'The slaw and hot honey glaze make this chicken burger stand out from any other fast food!', '2026-08-29 13:22:00', 1)

ON DUPLICATE KEY UPDATE
  `rating` = VALUES(`rating`),
  `comment` = VALUES(`comment`),
  `is_verified_purchase` = VALUES(`is_verified_purchase`);
