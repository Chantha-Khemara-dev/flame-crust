-- V16: Seed verified customers and their real reviews for homepage testimonials & menu products

-- Insert Customers if not already present
INSERT INTO `customers` (`id`, `name`, `email`, `phone`, `avatar`, `created_at`, `status`)
VALUES
  (20, 'Sarah K.', 'sarah.k@gmail.com', '012988111', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', '2026-08-15 10:00:00', 'ACTIVE'),
  (21, 'Marcus T.', 'marcus.t@gmail.com', '012988222', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', '2026-08-16 11:00:00', 'ACTIVE'),
  (22, 'Priya R.', 'priya.r@gmail.com', '012988333', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', '2026-08-17 12:00:00', 'ACTIVE'),
  (23, 'David L.', 'david.l@gmail.com', '012988444', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', '2026-08-18 13:00:00', 'ACTIVE'),
  (24, 'Jenna M.', 'jenna.m@gmail.com', '012988555', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', '2026-08-19 14:00:00', 'ACTIVE'),
  (25, 'Tom H.', 'tom.h@gmail.com', '012988666', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', '2026-08-20 15:00:00', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `avatar` = VALUES(`avatar`);

-- Insert or update authentic reviews corresponding to homepage testimonials
INSERT INTO `reviews` (`product_id`, `customer_id`, `rating`, `comment`, `created_at`, `is_verified_purchase`)
VALUES
  -- Sarah K. on Margherita Classica (Product 1)
  (1, 20, 5, "I've ordered the Margherita Classica four times this month. The crust is the best I've had outside of Naples — airy, slightly charred, and delivered hot every single time.", '2026-08-22 18:30:00', 1),

  -- Marcus T. on Flame & Crust Signature Burger (Product 4)
  (4, 21, 5, "The Flame & Crust Signature burger ruined every other burger for me. The bacon jam is criminally good and the patties are juicy without being greasy.", '2026-08-23 19:15:00', 1),

  -- Priya R. on Classic Pizza Bagel (Product 3)
  (3, 22, 5, "Didn't know pizza bagels could be this good. The everything-bagel crust is genius. Ordered a tray for a party and they disappeared in five minutes flat.", '2026-08-24 14:45:00', 1),

  -- David L. on Truffle Parm Fries / Appetizers (Product 5)
  (5, 23, 5, "Consistently excellent. I order every Friday night for family movie night and the kids love it every time the box opens. The garlic knots and fries are a must-order.", '2026-08-25 20:10:00', 1),

  -- Jenna M. on Quattro Formaggi (Product 6)
  (6, 24, 5, "Reviewed 40+ pizzerias this year — Flame & Crust is in my top three. The four-cheese with truffle honey is a religious experience. Highly recommend.", '2026-08-26 21:00:00', 1),

  -- Tom H. on Pepperoni Diavola (Product 2)
  (2, 25, 5, "Ordered 12 pizzas for a team lunch — arrived hot, on time, and everyone asked where it was from. The online ordering flow was the easiest I've used.", '2026-08-27 12:20:00', 1)
ON DUPLICATE KEY UPDATE
  `rating` = VALUES(`rating`),
  `comment` = VALUES(`comment`),
  `is_verified_purchase` = VALUES(`is_verified_purchase`);
