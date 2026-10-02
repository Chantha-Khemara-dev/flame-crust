INSERT IGNORE INTO categories (slug, name, sort_order)
VALUES
    ('pizza', 'Pizza', 1),
    ('pizza-bagels', 'Pizza Bagels', 2),
    ('burgers', 'Burgers', 3),
    ('sides', 'Sides', 4),
    ('drink', 'Drink', 5);

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT *
FROM (
        SELECT
            'Margherita Classica' AS name, 'San Marzano tomato, fresh mozzarella and basil on a fermented sourdough crust.' AS description, 16.50 AS price, 'pizza' AS category, '/images/924d2bfa0aae.jpg' AS image, 'Bestseller,Wood-fired' AS tags, 4.9 AS rating, TRUE AS popular, FALSE AS spicy, TRUE AS vegetarian
        UNION ALL
        SELECT 'Pepperoni Diavola', 'Spicy cup-and-char pepperoni, double mozzarella and chili honey.', 19.00, 'pizza', '/images/3f0b7b66e55b.jpg', 'Spicy,Crowd favorite', 4.8, TRUE, TRUE, FALSE
        UNION ALL
        SELECT 'Classic Pizza Bagel', 'Toasted everything bagel with tomato sauce, mozzarella and oregano.', 7.50, 'pizza-bagels', '/images/e44520dceaf9.jpg', 'Bestseller,Quick bite', 4.9, TRUE, FALSE, TRUE
        UNION ALL
        SELECT 'Flame & Crust Signature', 'Double smashed Angus patties, cheddar, caramelized onions and bacon jam.', 16.00, 'burgers', '/images/0cf6e534739f.jpg', 'Bestseller,Double patty', 4.9, TRUE, FALSE, FALSE
        UNION ALL
        SELECT 'Truffle Parm Fries', 'Hand-cut fries with truffle oil, parmesan and garlic aioli.', 8.00, 'sides', '/images/ea3a4b5c0f51.jpg', 'Bestseller,Vegetarian', 4.9, TRUE, FALSE, TRUE
    ) AS seed
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Quattro Formaggi', 'Mozzarella, gorgonzola, fontina and parmesan with walnuts and truffle honey.', 21.00, 'pizza', '/images/0f945511d117.jpg', 'Premium,Vegetarian', 4.7, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Quattro Formaggi'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Nonna''s Garden', 'Roasted peppers, caramelized onions, mushrooms, olives, arugula and balsamic reduction.', 18.50, 'pizza', '/images/33b73203db36.jpg', 'Vegetarian,Seasonal', 4.6, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Nonna''s Garden'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Pepperoni Pizza Bagel', 'Hand-rolled bagel with tomato sauce, double cheese and crisp pepperoni cups.', 9.00, 'pizza-bagels', '/images/8f8c59add97b.jpg', 'Fan favorite', 4.8, TRUE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Pepperoni Pizza Bagel'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Four Cheese Pizza Bagel', 'Mozzarella, cheddar, parmesan and gorgonzola over a sourdough bagel with garlic butter.', 8.50, 'pizza-bagels', '/images/803300ed0f8a.jpg', 'Vegetarian,Cheesy', 4.7, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Four Cheese Pizza Bagel'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Bacon Blue Deluxe', 'Angus patty, crispy bacon, gorgonzola, mushrooms, arugula and balsamic glaze.', 17.50, 'burgers', '/images/e1df257e15b7.jpg', 'Premium,Bold flavor', 4.8, TRUE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Bacon Blue Deluxe'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Classic Cheeseburger', 'Angus patty, American cheese, lettuce, tomato, onion and secret sauce.', 12.00, 'burgers', '/images/5a7687bb89a6.jpg', 'Classic,Family pick', 4.7, FALSE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Classic Cheeseburger'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Smokehouse Stack', 'Triple Angus, double bacon, cheddar, onion rings, BBQ sauce and jalapeño.', 19.50, 'burgers', '/images/1addeb10923d.jpg', 'Spicy,Triple stack', 4.8, FALSE, TRUE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Smokehouse Stack'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Buffalo Wings', 'Eight jumbo wings with house buffalo sauce, vegetables and blue cheese dip.', 12.50, 'sides', '/images/d2abf6483f3e.jpg', 'Spicy,Game day', 4.8, FALSE, TRUE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Buffalo Wings'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Garlic Knots', 'Six pillowy garlic knots brushed with herb butter and served with marinara dip.', 6.50, 'sides', '/images/781685f1777b.jpeg', 'Vegetarian,Shareable', 4.7, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Garlic Knots'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Crispy Onion Rings', 'Sweet onions in buttermilk batter, golden-fried with chipotle ranch dip.', 7.00, 'sides', '/images/875de03940a5.jpg', 'Vegetarian,Crispy', 4.6, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Crispy Onion Rings'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Spicy Calabrese', 'Calabrese salami, roasted peppers, mozzarella, chili oil and fresh basil.', 20.00, 'pizza', '/images/3f0b7b66e55b.jpg', 'Spicy,Wood-fired', 4.8, TRUE, TRUE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Spicy Calabrese'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Prosciutto Verde', 'Prosciutto, mozzarella, parmesan, rocket and lemon olive oil on sourdough.', 22.00, 'pizza', '/images/924d2bfa0aae.jpg', 'Premium,Fresh', 4.8, FALSE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Prosciutto Verde'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'BBQ Chicken Pizza', 'Roasted chicken, smoked mozzarella, red onion, sweet corn and smoky BBQ glaze.', 19.50, 'pizza', '/images/0f945511d117.jpg', 'Crowd favorite,BBQ', 4.7, TRUE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'BBQ Chicken Pizza'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Mushroom Truffle Pizza', 'Wild mushrooms, mozzarella, garlic cream, thyme and truffle oil.', 20.50, 'pizza', '/images/33b73203db36.jpg', 'Vegetarian,Premium', 4.8, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Mushroom Truffle Pizza'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Breakfast Pizza Bagel', 'Everything bagel, cheddar, scrambled egg, crispy bacon and tomato relish.', 10.50, 'pizza-bagels', '/images/e44520dceaf9.jpg', 'Breakfast,Quick bite', 4.6, FALSE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Breakfast Pizza Bagel'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Jalapeno Popper Bagel', 'Toasted bagel with cream cheese, mozzarella, jalapeño and crispy crumbs.', 9.50, 'pizza-bagels', '/images/8f8c59add97b.jpg', 'Spicy,Cheesy', 4.7, FALSE, TRUE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Jalapeno Popper Bagel'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Garlic Butter Bagel Bites', 'Mini sourdough bagels with garlic butter, parmesan and parsley.', 7.00, 'pizza-bagels', '/images/803300ed0f8a.jpg', 'Vegetarian,Shareable', 4.6, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Garlic Butter Bagel Bites'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Crispy Chicken Burger', 'Crispy chicken, slaw, pickles, hot honey and house mayo on a toasted bun.', 15.50, 'burgers', '/images/e1df257e15b7.jpg', 'Spicy,Crowd favorite', 4.8, TRUE, TRUE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Crispy Chicken Burger'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Mushroom Swiss Burger', 'Angus patty, Swiss cheese, roasted mushrooms, crispy onions and garlic aioli.', 16.50, 'burgers', '/images/5a7687bb89a6.jpg', 'Vegetarian option,Premium', 4.7, FALSE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Mushroom Swiss Burger'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Firecracker Burger', 'Double Angus patties, pepper jack, jalapeño relish, crispy onions and hot sauce.', 18.50, 'burgers', '/images/1addeb10923d.jpg', 'Spicy,Double patty', 4.8, TRUE, TRUE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Firecracker Burger'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Loaded Cheese Fries', 'Crispy fries topped with cheddar sauce, bacon, spring onion and ranch.', 10.00, 'sides', '/images/ea3a4b5c0f51.jpg', 'Crowd favorite,Shareable', 4.8, TRUE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Loaded Cheese Fries'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Sweet Potato Fries', 'Crispy sweet potato fries served with smoked paprika aioli.', 8.50, 'sides', '/images/875de03940a5.jpg', 'Vegetarian,Crispy', 4.6, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Sweet Potato Fries'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Mozzarella Sticks', 'Golden fried mozzarella sticks with marinara and basil dip.', 9.50, 'sides', '/images/d2abf6483f3e.jpg', 'Vegetarian,Shareable', 4.7, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Mozzarella Sticks'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Honey Pepperoni', 'Cup-and-char pepperoni, mozzarella, chili flakes and a sweet honey finish.', 19.50, 'pizza', '/images/3f0b7b66e55b.jpg', 'Bestseller,Sweet heat', 4.9, TRUE, TRUE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Honey Pepperoni'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Roasted Garlic Bianca', 'Garlic cream, mozzarella, roasted garlic, parmesan and fresh thyme.', 18.00, 'pizza', '/images/0f945511d117.jpg', 'Vegetarian,Garlicky', 4.7, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Roasted Garlic Bianca'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Pesto Garden', 'Basil pesto, mozzarella, cherry tomatoes, zucchini and toasted pine nuts.', 18.50, 'pizza', '/images/33b73203db36.jpg', 'Vegetarian,Fresh', 4.7, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Pesto Garden'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Meat Lovers Fire', 'Pepperoni, sausage, bacon, mozzarella and hot peppers on our sourdough crust.', 22.00, 'pizza', '/images/924d2bfa0aae.jpg', 'Spicy,Loaded', 4.8, TRUE, TRUE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Meat Lovers Fire'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Applewood BBQ Pizza', 'Pulled pork, smoked mozzarella, pickled onion and applewood BBQ sauce.', 21.00, 'pizza', '/images/5a7687bb89a6.jpg', 'BBQ,Premium', 4.6, FALSE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Applewood BBQ Pizza'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Margherita Mini Bagels', 'Three mini bagels with tomato, mozzarella, basil and olive oil.', 8.00, 'pizza-bagels', '/images/e44520dceaf9.jpg', 'Vegetarian,Shareable', 4.8, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Margherita Mini Bagels'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Buffalo Chicken Bagel', 'Chicken, buffalo sauce, mozzarella, ranch drizzle and celery crunch.', 10.00, 'pizza-bagels', '/images/8f8c59add97b.jpg', 'Spicy,Game day', 4.7, FALSE, TRUE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Buffalo Chicken Bagel'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Supreme Bagel Bites', 'Pepperoni, peppers, onions, mushrooms and mozzarella on mini bagels.', 10.50, 'pizza-bagels', '/images/803300ed0f8a.jpg', 'Loaded,Shareable', 4.7, TRUE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Supreme Bagel Bites'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Spinach Feta Bagel', 'Spinach, feta, mozzarella, garlic butter and cracked black pepper.', 9.00, 'pizza-bagels', '/images/e44520dceaf9.jpg', 'Vegetarian,Fresh', 4.6, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Spinach Feta Bagel'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Double Bacon Smash', 'Two Angus patties, double bacon, cheddar, pickles and smoky house sauce.', 18.00, 'burgers', '/images/0cf6e534739f.jpg', 'Bestseller,Double patty', 4.9, TRUE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Double Bacon Smash'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Hot Honey Chicken Burger', 'Crispy chicken, pepper jack, slaw, pickles and hot honey glaze.', 16.50, 'burgers', '/images/e1df257e15b7.jpg', 'Spicy,Hot honey', 4.8, TRUE, TRUE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Hot Honey Chicken Burger'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'BBQ Bacon Ranch Burger', 'Angus patty, bacon, cheddar, crispy onion, BBQ sauce and ranch.', 17.50, 'burgers', '/images/5a7687bb89a6.jpg', 'BBQ,Crowd favorite', 4.7, FALSE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'BBQ Bacon Ranch Burger'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Green Garden Burger', 'Grilled veggie patty, avocado, lettuce, tomato and herb aioli.', 14.50, 'burgers', '/images/1addeb10923d.jpg', 'Vegetarian,Fresh', 4.6, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Green Garden Burger'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Chili Cheese Fries', 'Crispy fries with beef chili, cheddar sauce, jalapeño and sour cream.', 11.00, 'sides', '/images/ea3a4b5c0f51.jpg', 'Spicy,Loaded', 4.8, TRUE, TRUE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Chili Cheese Fries'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Herb Parmesan Fries', 'Crispy fries tossed with parmesan, rosemary, parsley and garlic butter.', 8.00, 'sides', '/images/875de03940a5.jpg', 'Vegetarian,Classic', 4.7, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Herb Parmesan Fries'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Jalapeno Poppers', 'Crispy jalapeños filled with cream cheese and cheddar, with ranch dip.', 9.00, 'sides', '/images/d2abf6483f3e.jpg', 'Spicy,Shareable', 4.7, FALSE, TRUE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Jalapeno Poppers'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Classic Caesar Salad', 'Romaine, parmesan, sourdough croutons and creamy Caesar dressing.', 9.50, 'sides', '/images/0cf6e534739f.jpg', 'Fresh,Vegetarian', 4.5, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Classic Caesar Salad'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Garlic Bread', 'Warm toasted bread with garlic herb butter, parmesan and marinara.', 6.00, 'sides', '/images/781685f1777b.jpeg', 'Vegetarian,Classic', 4.6, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Garlic Bread'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Wood-fired Special', 'Signature pizza with bubbling mozzarella, roasted tomatoes, basil and extra virgin olive oil.', 21.50, 'pizza', '/images/pizza-special.jpg', 'New,Wood-fired', 4.9, TRUE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Wood-fired Special'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Classic Smash Supreme', 'Juicy double smash burger with cheddar, lettuce, tomato, pickles and house sauce.', 18.50, 'burgers', '/images/burger-special.jpg', 'New,Bestseller', 4.9, TRUE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Classic Smash Supreme'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Golden Loaded Fries', 'Crispy golden fries topped with cheese sauce, herbs and our smoky house drizzle.', 10.50, 'sides', '/images/fries-special.jpg', 'New,Shareable', 4.8, TRUE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Golden Loaded Fries'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Garden Crunch Salad', 'Fresh greens, tomato, cucumber, avocado, seeds and citrus herb dressing.', 11.00, 'sides', '/images/salad-special.jpg', 'New,Fresh', 4.7, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Garden Crunch Salad'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Cheesy Pizza Bagel Platter', 'Toasted mini pizza bagels with bubbling cheese, tomato sauce and Italian herbs.', 11.50, 'pizza-bagels', '/images/bagel-special.jpg', 'New,Shareable', 4.8, TRUE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Cheesy Pizza Bagel Platter'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Firehouse Veggie Plate', 'Roasted seasonal vegetables, herbs, parmesan and warm toasted sourdough.', 12.00, 'sides', '/images/products/product-054.jpg', 'New,Vegetarian', 4.7, FALSE, FALSE, TRUE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Firehouse Veggie Plate'
    );

INSERT INTO
    products (
        name,
        description,
        price,
        category,
        image,
        tags,
        rating,
        popular,
        spicy,
        vegetarian
    )
SELECT 'Chef''s Sharing Box', 'A generous mix of our favorite bites, sauces and freshly baked sides for sharing.', 24.00, 'sides', '/images/products/product-055.jpg', 'New,Shareable', 4.9, TRUE, FALSE, FALSE
WHERE
    NOT EXISTS (
        SELECT 1
        FROM products
        WHERE
            name = 'Chef''s Sharing Box'
    );

-- Give every seeded product a stable business identifier. The nullable column
-- allows this idempotent legacy seed format to insert first, then normalize.
UPDATE products
SET
    sku = CONCAT('FC-', LPAD(id, 6, '0'))
WHERE
    sku IS NULL
    OR sku = '';

-- Every product receives its own local image path.
UPDATE products
SET
    image = CONCAT(
        '/images/products/product-',
        LPAD(id, 3, '0'),
        '.jpg'
    )
WHERE
    image NOT LIKE 'http%';

-- Keep the catalogue aligned with the 25 images in frontend/public/images/library.
-- Do not delete catalog rows here: products may already be referenced by orders.

CREATE TEMPORARY TABLE product_library_images (
    position_no INT PRIMARY KEY,
    image_path VARCHAR(255) NOT NULL
);

UPDATE products p
JOIN (
    SELECT id, ROW_NUMBER() OVER (
            ORDER BY id
        ) AS position_no
    FROM products
) numbered ON numbered.id = p.id
JOIN product_library_images library_image ON library_image.position_no = numbered.position_no
SET
    p.image = library_image.image_path;

DROP TEMPORARY TABLE product_library_images;

-- Populate the normalized catalogue fields after the product seed has run.
UPDATE products p
JOIN categories c ON c.slug = p.category
SET
    p.category_id = c.id
WHERE
    p.category_id IS NULL;

UPDATE products SET base_price = price WHERE base_price IS NULL;

-- Seed Admin Role and User
INSERT INTO
    roles (name, permissions)
SELECT 'Admin', '["*"]'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM roles
        WHERE
            name = 'Admin'
    );

INSERT INTO
    users (
        role_id,
        name,
        email,
        password_hash
    )
SELECT id, 'Admin', 'admin@flamecrust.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
FROM roles
WHERE
    name = 'Admin'
    AND NOT EXISTS (
        SELECT 1
        FROM users
        WHERE
            email = 'admin@flamecrust.com'
    );

-- Seed Default Guest Customer (ID 1)
INSERT INTO
    customers (
        id,
        name,
        email,
        phone,
        status
    )
VALUES (
        1,
        'Guest Customer',
        'guest@flamecrust.com',
        '0123456789',
        'ACTIVE'
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name);

INSERT INTO
    coupons (
        code,
        discount_type,
        discount_value,
        min_order_amount,
        active
    )
VALUES (
        'FREEDELIVERY',
        'FREE_DELIVERY',
        0.00,
        0.00,
        TRUE
    );

INSERT INTO
    coupons (
        code,
        discount_type,
        discount_value,
        min_order_amount,
        active
    )
VALUES (
        'NEWUSER1',
        'FREE_DELIVERY',
        0.00,
        0.00,
        TRUE
    );

INSERT INTO
    coupons (
        code,
        discount_type,
        discount_value,
        min_order_amount,
        active
    )
VALUES (
        'NEWUSER2',
        'FREE_DELIVERY',
        0.00,
        0.00,
        TRUE
    );

-- Seed Initial Customer Reviews
INSERT IGNORE INTO `reviews` (`product_id`, `customer_id`, `rating`, `comment`, `created_at`, `is_verified_purchase`)
VALUES
  (1, 2, 5, 'រសជាតិឆ្ងាញ់ខ្លាំងណាស់! ម្សៅនំបុ័ង sourdough បំពងឈ្ងុយ ក្លិនឈីស និងស្លឹក basil ស្រស់ល្អឥតខ្ចោះ។ ខ្ញុំនឹងកម្ម៉ង់ញ៉ាំទៀតច្បាស់ណាស់!', '2026-08-25 10:15:00', 1),
  (1, 3, 5, 'The authentic Neapolitan taste in town! Crust is airy, chewy, and light with perfectly balanced tomato sauce.', '2026-08-26 14:30:20', 1),
  (1, 5, 4, 'ភីហ្សាឆ្ងាញ់ ក្តៅៗស្រួយល្អ សេវាកម្មដឹកជញ្ជូនរហ័សទាន់ចិត្ត គ្រាន់តែថែម basil បន្តិចទៀតកាន់តែអែម។', '2026-08-27 18:05:12', 1),
  (1, 8, 5, 'Best margherita pizza! Very fresh buffalo mozzarella and sourdough crust is unmatched.', '2026-08-28 12:40:00', 0),
  (2, 3, 5, 'Pepperoni ស្រួយឆ្ងាញ់ខ្លាំង ហឹរតិចៗត្រូវមាត់ជាមួយ hot honey ផ្អែមមុតស្រាល! ញ៉ាំជក់មាត់ណាស់។', '2026-08-26 19:22:15', 1),
  (2, 5, 5, 'This is our go-to pizza every Friday night. Incredible cup & char pepperoni and cheese pull!', '2026-08-27 20:10:45', 1),
  (2, 12, 4, 'ឈីសច្រើន pepperoni ស្រួយឆ្ងាញ់ ដឹកមកដល់នៅក្តៅហុយៗ។ Recommend សម្រាប់អ្នកចូលចិត្តរសជាតិបែប American-Italian!', '2026-08-29 11:30:00', 1),
  (3, 2, 5, 'Pizza Bagel នេះប្លែកហើយឆ្ងាញ់ណាស់! Bagel ខាងក្រៅស្រួយ ខាងក្នុងទន់ ឈីសពេញៗមាត់។', '2026-08-25 15:45:00', 1),
  (3, 8, 5, 'Perfect snack size! The everything seasoning on the bagel combined with pizza toppings is genius.', '2026-08-27 09:12:33', 1),
  (4, 5, 5, 'Burger សាច់ Angus ពីរជាន់ juicy ខ្លាំង! Caramelized onion និង bacon jam ធ្វើឱ្យរសជាតិដាច់គេតែម្តង។ 10/10!', '2026-08-26 12:20:00', 1),
  (4, 2, 5, 'One of the juiciest smash burgers in Phnom Penh. Brioche bun toasted to perfection.', '2026-08-28 13:10:00', 1),
  (5, 3, 5, 'ដំឡូងបារាំងបំពងក្លិន Truffle ឈ្ងុយសាយភាយ ជាមួយ Parmesan ម៉ត់ និង garlic aioli dip ឆ្ងាញ់ញៀន!', '2026-08-27 17:35:00', 1),
  (6, 2, 5, 'អ្នកស្រឡាញ់ឈីសមិនគួររំលងទេ! Gorgonzola ជាមួយ Truffle honey ចូលគ្នាល្អឥតខ្ចោះ រសជាតិផ្អែមប្រៃបែប Premium។', '2026-08-26 21:15:00', 1),
  (1, 20, 5, 'I''ve ordered the Margherita Classica four times this month. The crust is the best I''ve had outside of Naples — airy, slightly charred, and delivered hot every single time.', '2026-08-22 18:30:00', 1),
  (4, 21, 5, 'The Flame & Crust Signature burger ruined every other burger for me. The bacon jam is criminally good and the patties are juicy without being greasy.', '2026-08-23 19:15:00', 1),
  (3, 22, 5, 'Didn''t know pizza bagels could be this good. The everything-bagel crust is genius. Ordered a tray for a party and they disappeared in five minutes flat.', '2026-08-24 14:45:00', 1),
  (5, 23, 5, 'Consistently excellent. I order every Friday night for family movie night and the kids love it every time the box opens. The garlic knots and fries are a must-order.', '2026-08-25 20:10:00', 1),
  (6, 24, 5, 'Reviewed 40+ pizzerias this year — Flame & Crust is in my top three. The four-cheese with truffle honey is a religious experience. Highly recommend.', '2026-08-26 21:00:00', 1),
  (2, 25, 5, 'Ordered 12 pizzas for a team lunch — arrived hot, on time, and everyone asked where it was from. The online ordering flow was the easiest I''ve used.', '2026-08-27 12:20:00', 1);