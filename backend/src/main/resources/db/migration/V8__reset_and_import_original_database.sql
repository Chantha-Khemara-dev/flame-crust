-- ==============================================================================
-- V8: Clean Reset and Mirror Local Database with Strict Dependency Ordering
-- ==============================================================================
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- Drop all existing tables in reverse dependency order
DROP TABLE IF EXISTS `cash_register_sessions`;
DROP TABLE IF EXISTS `branch_staff`;
DROP TABLE IF EXISTS `kitchen_staff`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `coupon_usages`;
DROP TABLE IF EXISTS `product_options`;
DROP TABLE IF EXISTS `product_variants`;
DROP TABLE IF EXISTS `product_recipes`;
DROP TABLE IF EXISTS `inventory`;
DROP TABLE IF EXISTS `driver_locations`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `payment_attempts`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `order_status_history`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `cart_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `carts`;
DROP TABLE IF EXISTS `addresses`;
DROP TABLE IF EXISTS `drivers`;
DROP TABLE IF EXISTS `tables`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `otps`;
DROP TABLE IF EXISTS `ingredients`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `branches`;
DROP TABLE IF EXISTS `roles`;

-- Create tables and insert data in strict dependency order
--
-- Table structure for table `roles`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `permissions` json NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=160 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

REPLACE INTO `roles` VALUES (1,'Admin','{\"can_delete\": true, \"can_manage_users\": true}'),(2,'Manager','{\"can_delete\": false, \"can_manage_users\": false}'),(3,'Staff','{\"can_delete\": false, \"can_manage_users\": false}');

--
-- Table structure for table `branches`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

--
-- Table structure for table `categories`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_slug` (`slug`),
  CONSTRAINT `chk_categories_sort_order` CHECK ((`sort_order` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=147 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

REPLACE INTO `categories` VALUES (1,'pizza','Pizza',1,1),(2,'pizza-bagels','Pizza Bagels',2,1),(3,'burgers','Burgers',3,1),(4,'sides','Sides',4,1),(26,'Drink','Drink',5,1);

--
-- Table structure for table `coupons`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `discount_type` varchar(20) NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `min_order_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `expires_at` timestamp NULL DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `usage_limit` int DEFAULT NULL,
  `used_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_coupons_code` (`code`),
  CONSTRAINT `chk_coupons_type` CHECK ((`discount_type` in (_utf8mb4'PERCENTAGE',_utf8mb4'FIXED',_utf8mb4'FREE_DELIVERY'))),
  CONSTRAINT `chk_coupons_values` CHECK (((`discount_value` >= 0) and (`min_order_amount` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=184 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupons`
--

REPLACE INTO `coupons` VALUES (1,'FREEDELIVERY','FREE_DELIVERY',20.00,29.00,NULL,1,NULL,0),(2,'NEWUSER1','FREE_DELIVERY',0.00,0.00,NULL,1,NULL,0),(3,'NEWUSER2','FREE_DELIVERY',0.00,0.00,NULL,1,NULL,0);

--
-- Table structure for table `ingredients`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredients` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `unit` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ingredients_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredients`
--

--
-- Table structure for table `otps`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otps` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `target` varchar(180) NOT NULL,
  `otp_code` varchar(10) NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `expires_at` timestamp NOT NULL,
  `purpose` varchar(30) NOT NULL DEFAULT 'LOGIN',
  PRIMARY KEY (`id`),
  KEY `idx_otps_target_expires` (`target`,`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otps`
--

REPLACE INTO `otps` VALUES (1,'chanthakhemara8@gmail.com','081957',0,'2026-08-16 19:27:56','LOGIN'),(2,'chanthakhemara8@gmail.com','279944',0,'2026-08-16 19:28:14','LOGIN'),(3,'chanthakhemara8@gmail.com','999839',0,'2026-08-16 19:28:23','LOGIN'),(4,'chanthakhemara8@gmail.com','018311',0,'2026-08-16 19:28:36','LOGIN'),(5,'chanthakhemara8@gmail.com','549880',0,'2026-08-16 19:28:49','LOGIN'),(6,'chanthakhemara@gmail.com','323589',1,'2026-08-19 12:49:13','LOGIN'),(7,'chanthakhemara@gmail.com','252392',1,'2026-08-19 12:59:23','LOGIN'),(8,'chanthakhemara@gmail.com','257211',1,'2026-08-19 13:33:16','LOGIN'),(9,'kaosokleng415@gmail.com','975764',1,'2026-08-19 13:58:22','LOGIN'),(10,'chanthakhemara@gmail.com','959321',1,'2026-08-19 15:14:49','LOGIN'),(11,'chanthakhemara@gmail.com','937021',1,'2026-08-19 15:18:48','LOGIN'),(12,'chanthakhemara@gmail.com','898426',1,'2026-08-20 04:38:29','LOGIN'),(13,'kariulk8@gmail.com','538863',1,'2026-08-20 05:00:13','LOGIN'),(14,'chanthakhemara@gmail.com','398758',1,'2026-08-23 05:28:46','LOGIN'),(15,'measn2519@gmail.com','383180',0,'2026-08-23 06:44:01','LOGIN'),(16,'measm2519@gmail.com','689686',1,'2026-08-23 06:45:23','LOGIN'),(17,'kaosokleng415@gmail.com','394962',1,'2026-08-23 07:24:41','LOGIN'),(18,'chanthakhemara@gmail.com','034234',0,'2026-08-23 16:02:25','LOGIN'),(19,'chanthakhemara12@gmail.com','217808',0,'2026-08-23 16:11:10','LOGIN'),(20,'chanthakhemara@gmail.com','461027',1,'2026-08-23 16:15:51','LOGIN'),(21,'chanthakhemara@gmail.com','567342',1,'2026-08-23 16:53:41','LOGIN'),(22,'chanthakhemara@gmail.com','867345',1,'2026-08-23 19:09:13','LOGIN'),(23,'chanthakhemara@gmail.com','192966',1,'2026-08-25 16:16:34','LOGIN'),(24,'chanthakhemara06@gmail.com','695356',1,'2026-08-25 17:10:45','LOGIN'),(25,'chanthakhemara@gmail.con','398543',0,'2026-08-25 17:35:17','LOGIN'),(26,'chanthakhemara@gmail.con','308587',0,'2026-08-25 17:35:53','LOGIN'),(27,'chanthakhemara@gmail.com','392978',0,'2026-08-25 17:36:03','LOGIN'),(28,'chanthakhemara@gmail.com','097968',1,'2026-08-25 17:36:31','LOGIN'),(29,'chanthakhemara@gmail.com','492339',1,'2026-08-25 17:48:09','LOGIN'),(30,'chanthakhemara12@gmail.com','544975',0,'2026-08-25 18:09:57','LOGIN'),(31,'chanthakhemara@gmail.com','033222',1,'2026-08-25 18:10:03','LOGIN'),(32,'chanthakhemara@gmail.com','588872',1,'2026-08-26 12:12:27','LOGIN'),(33,'chanthakhemara@gamil.com','822927',0,'2026-08-26 12:38:55','LOGIN'),(34,'chanthakhemara@gmail.com','190830',1,'2026-08-26 12:39:57','LOGIN'),(35,'chanthakhemara@gmail.com','456234',1,'2026-08-26 12:50:20','LOGIN'),(36,'chanthakhemara@gmail.com','028514',1,'2026-08-26 13:09:27','LOGIN'),(37,'chanthakhemara12@gmail.com','747756',1,'2026-08-26 16:35:56','LOGIN'),(38,'chanthakhemara@gmail.com','544184',1,'2026-08-26 16:37:02','LOGIN'),(39,'chanthakhemara@gmail.com','878457',1,'2026-08-27 08:02:33','LOGIN'),(40,'chanthakhemara12@gmail.com','686827',1,'2026-08-27 08:13:04','LOGIN'),(41,'kaosokleng415@gmail.com','464020',0,'2026-08-27 10:13:49','LOGIN'),(42,'chanthakhemara12@gmail.com','466505',1,'2026-08-27 14:32:50','LOGIN'),(43,'chanthakhemara12@gmail.com','863880',1,'2026-08-27 14:36:16','LOGIN'),(44,'chanthakhemara@gmail.com','141113',1,'2026-08-27 14:45:54','LOGIN'),(45,'kaosokleng415@gmail.com','692951',1,'2026-08-27 15:14:47','LOGIN');

--
-- Table structure for table `users`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `role_id` bigint NOT NULL,
  `name` varchar(120) NOT NULL,
  `email` varchar(180) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `chk_users_status` CHECK ((`status` in (_utf8mb4'ACTIVE',_utf8mb4'SUSPENDED')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

REPLACE INTO `users` VALUES (1,1,'Admin','admin@flamecrust.com','$2a$10$Zy5pdLN1kPVsp1cUiTAqcuEjlxu2maJrQbH/cYjAO.0RfAx2Gkzya','ACTIVE','2026-08-16 19:22:51',NULL);

--
-- Table structure for table `customers`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `email` varchar(180) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `password_hash` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `device_token` varchar(255) DEFAULT NULL,
  `reward_points` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customers_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

REPLACE INTO `customers` VALUES (1,'Guest Customer','guest@flamecrust.com','0123456789',NULL,'2026-08-16 19:22:51','2026-08-16 19:22:51',NULL,'ACTIVE',NULL,NULL,0),(2,'Khemara','chanthakhemara@gmail.com','0965755963','https://res.cloudinary.com/gdkctwwo/image/upload/v1787849244/gxbpcvwqzmdsi2pwuzyu.jpg','2026-08-19 12:44:41','2026-08-27 16:47:25','$2a$10$0t.DZfFCDxFum34ZXVJDAeJj44k0wxtI5LmbQIbyKc3Dx/ByRPRF.','ACTIVE',NULL,NULL,0),(3,'Sokleng cute','kaosokleng415@gmail.com','00000000',NULL,'2026-08-19 13:55:13','2026-08-27 15:11:33','$2a$10$pU616SRnu37kmTy2TmyiqOZu9JFnQhHBuLjBGtk3UnMPfaU6p4ZvK','ACTIVE',NULL,NULL,0),(4,'kariulk8','kariulk8@gmail.com',NULL,NULL,'2026-08-20 04:55:47','2026-08-20 04:55:47',NULL,'ACTIVE',NULL,NULL,0),(5,'Chantha Khemara','chanthakhemara12@gmail.com','0965755963','https://res.cloudinary.com/gdkctwwo/image/upload/v1787833850/sn9trvzopyumdrlxqkl2.jpg','2026-08-21 09:06:55','2026-08-27 12:30:50','$2a$10$8smrW/jr8gYY502QSXL//OTPp1SoJIOmnsXmtDipv1i93puNSEiLe','ACTIVE',NULL,NULL,0),(6,'measm2519','measm2519@gmail.com',NULL,NULL,'2026-08-23 06:40:39','2026-08-23 06:40:39',NULL,'ACTIVE',NULL,NULL,0),(7,'Chantha Khemara','chanthakhemara22@gmail.com',NULL,NULL,'2026-08-23 07:15:34','2026-08-23 07:15:34',NULL,'ACTIVE',NULL,NULL,0),(8,'chantha khemara','chanthakhemara23@gmail.com',NULL,'https://lh3.googleusercontent.com/a/ACg8ocI-UHm4kWDSIcRpwdWbGlmO79W70VCDpYmpT5u4ZvCw9Y5VhA=s96-c','2026-08-23 11:23:40','2026-08-27 12:53:11',NULL,'ACTIVE',NULL,NULL,0),(9,'Test User','test@google.com',NULL,NULL,'2026-08-25 11:42:42','2026-08-25 11:42:42',NULL,'ACTIVE',NULL,NULL,0),(10,'khemara','kira1008kh@gmail.com',NULL,NULL,'2026-08-25 13:24:46','2026-08-25 13:24:46',NULL,'ACTIVE',NULL,NULL,0),(11,'chanthakhemara06','chanthakhemara06@gmail.com',NULL,NULL,'2026-08-25 17:07:28','2026-08-25 17:07:28',NULL,'ACTIVE',NULL,NULL,0),(12,'Sokleng','makara2002kh@gmail.com','0888631805','https://res.cloudinary.com/gdkctwwo/image/upload/v1787834892/ctkcvof8bskcurmrrryu.jpg','2026-08-27 12:47:56','2026-08-27 12:48:28',NULL,'ACTIVE',NULL,NULL,0);

--
-- Table structure for table `products`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `popular` bit(1) NOT NULL,
  `price` decimal(38,2) DEFAULT NULL,
  `rating` decimal(38,2) DEFAULT NULL,
  `spicy` bit(1) NOT NULL,
  `tags` varchar(255) DEFAULT NULL,
  `vegetarian` bit(1) NOT NULL,
  `sku` varchar(40) DEFAULT NULL,
  `category_id` bigint DEFAULT NULL,
  `base_price` decimal(10,2) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

REPLACE INTO `products` VALUES (1,'pizza','San Marzano tomato, fresh mozzarella and basil on a fermented sourdough crust.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786900587/t82rlj2ukaaj4ofxmvq7.webp','Margherita Classica',_binary '',16.50,4.90,_binary '\0','Bestseller,Wood-fired',_binary '','FC-000001',1,16.50,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(2,'pizza','Spicy cup-and-char pepperoni, double mozzarella and chili honey.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786900619/ca4ywsennatswbxortvs.jpg','Pepperoni Diavola',_binary '',19.00,4.80,_binary '','Spicy,Crowd favorite',_binary '\0','FC-000002',1,19.00,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(3,'pizza-bagels','Toasted everything bagel with tomato sauce, mozzarella and oregano.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902178/z9fkkk483s3g2azbara9.jpg','Classic Pizza Bagel',_binary '',7.50,4.90,_binary '\0','Bestseller,Quick bite',_binary '','FC-000003',2,7.50,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(4,'burgers','Double smashed Angus patties, cheddar, caramelized onions and bacon jam.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902752/uhvwpiolqyqt6gv5rsgl.jpg','Flame & Crust Signature',_binary '',16.00,4.90,_binary '\0','Bestseller,Double patty',_binary '\0','FC-000004',3,16.00,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(5,'sides','Hand-cut fries with truffle oil, parmesan and garlic aioli.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903252/bgq12fdgpdn3kqlftt2q.webp','Truffle Parm Fries',_binary '',8.00,4.90,_binary '\0','Bestseller,Vegetarian',_binary '','FC-000005',4,8.00,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(6,'pizza','Mozzarella, gorgonzola, fontina and parmesan with walnuts and truffle honey.','https://res.cloudinary.com/gdkctwwo/image/upload/v1787146639/y0vaxiewxcwfmaz6khr5.jpg','Quattro Formaggi',_binary '\0',21.00,4.70,_binary '\0','Premium,Vegetarian',_binary '','FC-000006',1,21.00,1,'2026-08-16 19:22:50','2026-08-19 13:37:23'),(7,'pizza','Roasted peppers, caramelized onions, mushrooms, olives, arugula and balsamic reduction.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786900504/tesx8mayykb21wcp1qy6.jpg','Nonna\'s Garden',_binary '\0',18.50,4.60,_binary '\0','Vegetarian,Seasonal',_binary '','FC-000007',1,18.50,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(8,'pizza-bagels','Hand-rolled bagel with tomato sauce, double cheese and crisp pepperoni cups.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902194/kn0pub6ugqfsd1af6446.jpg','Pepperoni Pizza Bagel',_binary '',9.00,4.80,_binary '\0','Fan favorite',_binary '\0','FC-000008',2,9.00,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(9,'pizza-bagels','Mozzarella, cheddar, parmesan and gorgonzola over a sourdough bagel with garlic butter.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902208/e9bno23c1azn6z6lcarg.jpg','Four Cheese Pizza Bagel',_binary '\0',8.50,4.70,_binary '\0','Vegetarian,Cheesy',_binary '','FC-000009',2,8.50,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(10,'burgers','Angus patty, crispy bacon, gorgonzola, mushrooms, arugula and balsamic glaze.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902771/ovl27xji0e4s67s8ipa6.jpg','Bacon Blue Deluxe',_binary '',17.50,4.80,_binary '\0','Premium,Bold flavor',_binary '\0','FC-000010',3,17.50,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(11,'burgers','Angus patty, American cheese, lettuce, tomato, onion and secret sauce.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902786/fktpgqdz6lllupjemaus.jpg','Classic Cheeseburger',_binary '\0',12.00,4.70,_binary '\0','Classic,Family pick',_binary '\0','FC-000011',3,12.00,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(12,'burgers','Triple Angus, double bacon, cheddar, onion rings, BBQ sauce and jalapeño.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902806/pldrcz8xcczd3wh1prt4.jpg','Smokehouse Stack',_binary '\0',19.50,4.80,_binary '','Spicy,Triple stack',_binary '\0','FC-000012',3,19.50,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(13,'sides','Eight jumbo wings with house buffalo sauce, vegetables and blue cheese dip.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903276/ymwv0ej7mhgefrqra6so.jpg','Buffalo Wings',_binary '\0',12.50,4.80,_binary '','Spicy,Game day',_binary '\0','FC-000013',4,12.50,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(14,'sides','Six pillowy garlic knots brushed with herb butter and served with marinara dip.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903295/r5x7ipznucl9k4h0qjua.jpg','Garlic Knots',_binary '\0',6.50,4.70,_binary '\0','Vegetarian,Shareable',_binary '','FC-000014',4,6.50,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(15,'sides','Sweet onions in buttermilk batter, golden-fried with chipotle ranch dip.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903307/hig28s2moq1zrjlhjkxr.jpg','Crispy Onion Rings',_binary '\0',7.00,4.60,_binary '\0','Vegetarian,Crispy',_binary '','FC-000015',4,7.00,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(16,'pizza','Calabrese salami, roasted peppers, mozzarella, chili oil and fresh basil.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786901536/w46kcma68y9y1lhgzd7j.jpg','Spicy Calabrese',_binary '',20.00,4.80,_binary '','Spicy,Wood-fired',_binary '\0','FC-000016',1,20.00,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(17,'pizza','Prosciutto, mozzarella, parmesan, rocket and lemon olive oil on sourdough.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786901552/cinwemvxdvycgau11emj.jpg','Prosciutto Verde',_binary '\0',22.00,4.80,_binary '\0','Premium,Fresh',_binary '\0','FC-000017',1,22.00,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(18,'pizza','Roasted chicken, smoked mozzarella, red onion, sweet corn and smoky BBQ glaze.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786901568/edrhocyktzgc2qf85ea3.jpg','BBQ Chicken Pizza',_binary '',19.50,4.70,_binary '\0','Crowd favorite,BBQ',_binary '\0','FC-000018',1,19.50,1,'2026-08-16 19:22:50','2026-08-16 19:56:03'),(19,'pizza','Wild mushrooms, mozzarella, garlic cream, thyme and truffle oil.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786901583/plgjcvriwz3m0qfhqjqx.jpg','Mushroom Truffle Pizza',_binary '\0',20.50,4.80,_binary '\0','Vegetarian,Premium',_binary '','FC-000019',1,20.50,1,'2026-08-16 19:22:50','2026-08-16 19:58:05'),(20,'pizza-bagels','Everything bagel, cheddar, scrambled egg, crispy bacon and tomato relish.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902224/ggcoyusnvq250kxykggz.jpg','Breakfast Pizza Bagel',_binary '\0',10.50,4.60,_binary '\0','Breakfast,Quick bite',_binary '\0','FC-000020',2,10.50,1,'2026-08-16 19:22:50','2026-08-16 19:58:05'),(21,'pizza-bagels','Toasted bagel with cream cheese, mozzarella, jalapeño and crispy crumbs.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902239/iw524a8kjmz345qxfrat.jpg','Jalapeno Popper Bagel',_binary '\0',9.50,4.70,_binary '','Spicy,Cheesy',_binary '','FC-000021',2,9.50,1,'2026-08-16 19:22:50','2026-08-16 19:58:05'),(22,'pizza-bagels','Mini sourdough bagels with garlic butter, parmesan and parsley.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902254/l77uqplkte4m109dytjt.jpg','Garlic Butter Bagel Bites',_binary '\0',7.00,4.60,_binary '\0','Vegetarian,Shareable',_binary '','FC-000022',2,7.00,1,'2026-08-16 19:22:50','2026-08-16 19:58:05'),(23,'burgers','Crispy chicken, slaw, pickles, hot honey and house mayo on a toasted bun.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902822/deut9kz9xjczsrfjuhxb.jpg','Crispy Chicken Burger',_binary '',15.50,4.80,_binary '','Spicy,Crowd favorite',_binary '\0','FC-000023',3,15.50,1,'2026-08-16 19:22:50','2026-08-16 19:58:05'),(24,'burgers','Angus patty, Swiss cheese, roasted mushrooms, crispy onions and garlic aioli.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902835/vmbpgbwzfy4epvkbnnxc.jpg','Mushroom Swiss Burger',_binary '\0',16.50,4.70,_binary '\0','Vegetarian option,Premium',_binary '\0','FC-000024',3,16.50,1,'2026-08-16 19:22:50','2026-08-16 19:58:05'),(25,'burgers','Double Angus patties, pepper jack, jalapeño relish, crispy onions and hot sauce.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902848/kvnqnzhn3qdsnkcxntbk.jpg','Firecracker Burger',_binary '',18.50,4.80,_binary '','Spicy,Double patty',_binary '\0','FC-000025',3,18.50,1,'2026-08-16 19:22:50','2026-08-16 19:58:05'),(26,'sides','Crispy fries topped with cheddar sauce, bacon, spring onion and ranch.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903321/unhnnj5zegmirpwpsqje.jpg','Loaded Cheese Fries',_binary '',10.00,4.80,_binary '\0','Crowd favorite,Shareable',_binary '\0','FC-000026',4,10.00,1,'2026-08-16 19:22:50','2026-08-16 19:58:05'),(27,'sides','Crispy sweet potato fries served with smoked paprika aioli.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903334/zvcakd7xbckgrabiwjoh.jpg','Sweet Potato Fries',_binary '\0',8.50,4.60,_binary '\0','Vegetarian,Crispy',_binary '','FC-000027',4,8.50,1,'2026-08-16 19:22:50','2026-08-16 19:58:05'),(28,'sides','Golden fried mozzarella sticks with marinara and basil dip.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903349/i8dubv9n4sbqsbi9jhkc.jpg','Mozzarella Sticks',_binary '\0',9.50,4.70,_binary '\0','Vegetarian,Shareable',_binary '','FC-000028',4,9.50,1,'2026-08-16 19:22:50','2026-08-16 19:58:05'),(29,'pizza','Cup-and-char pepperoni, mozzarella, chili flakes and a sweet honey finish.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786855872/pgvufhxnqwxjr8o0pwgr.jpg','Honey Pepperoni',_binary '',19.50,4.90,_binary '','Bestseller,Sweet heat',_binary '\0','FC-000029',1,19.50,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(30,'pizza','Garlic cream, mozzarella, roasted garlic, parmesan and fresh thyme.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786901096/gogieo70g71lilh61fzt.jpg','Roasted Garlic Bianca',_binary '\0',18.00,4.70,_binary '\0','Vegetarian,Garlicky',_binary '','FC-000030',1,18.00,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(31,'pizza','Basil pesto, mozzarella, cherry tomatoes, zucchini and toasted pine nuts.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786901602/axxm9rshosfpqajhekyx.jpg','Pesto Garden',_binary '\0',18.50,4.70,_binary '\0','Vegetarian,Fresh',_binary '','FC-000031',1,18.50,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(32,'pizza','Pepperoni, sausage, bacon, mozzarella and hot peppers on our sourdough crust.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786901617/wihlfw0thkf9qsrnxtcn.jpg','Meat Lovers Fire',_binary '',22.00,4.80,_binary '','Spicy,Loaded',_binary '\0','FC-000032',1,22.00,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(33,'pizza','Pulled pork, smoked mozzarella, pickled onion and applewood BBQ sauce.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786901633/ccjmk6dedw3hk4t78r0a.jpg','Applewood BBQ Pizza',_binary '\0',21.00,4.60,_binary '\0','BBQ,Premium',_binary '\0','FC-000033',1,21.00,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(34,'pizza-bagels','Three mini bagels with tomato, mozzarella, basil and olive oil.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902271/gilsiqrktzmlh0ix14t8.jpg','Margherita Mini Bagels',_binary '\0',8.00,4.80,_binary '\0','Vegetarian,Shareable',_binary '','FC-000034',2,8.00,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(35,'pizza-bagels','Chicken, buffalo sauce, mozzarella, ranch drizzle and celery crunch.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902285/v6zc3jdmrbrjmqvrovor.jpg','Buffalo Chicken Bagel',_binary '\0',10.00,4.70,_binary '','Spicy,Game day',_binary '\0','FC-000035',2,10.00,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(36,'pizza-bagels','Pepperoni, peppers, onions, mushrooms and mozzarella on mini bagels.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902328/cw1extltuc4crodg0hwb.webp','Supreme Bagel Bites',_binary '',10.50,4.70,_binary '\0','Loaded,Shareable',_binary '\0','FC-000036',2,10.50,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(37,'pizza-bagels','Spinach, feta, mozzarella, garlic butter and cracked black pepper.','https://res.cloudinary.com/gdkctwwo/image/upload/v1787146709/dejvrwxotdllqe500u4i.jpg','Spinach Feta Bagel',_binary '\0',9.00,4.60,_binary '\0','Vegetarian,Fresh',_binary '','FC-000037',2,9.00,1,'2026-08-16 19:22:51','2026-08-19 13:38:31'),(38,'burgers','Two Angus patties, double bacon, cheddar, pickles and smoky house sauce.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902878/qzruzbrf2pfxpskdu9vm.jpg','Double Bacon Smash',_binary '',18.00,4.90,_binary '\0','Bestseller,Double patty',_binary '\0','FC-000038',3,18.00,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(39,'burgers','Crispy chicken, pepper jack, slaw, pickles and hot honey glaze.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902895/ejarojzwppq7f7bggysn.jpg','Hot Honey Chicken Burger',_binary '',16.50,4.80,_binary '','Spicy,Hot honey',_binary '\0','FC-000039',3,16.50,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(40,'burgers','Angus patty, bacon, cheddar, crispy onion, BBQ sauce and ranch.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902914/ckonb37wjp254nerizvq.jpg','BBQ Bacon Ranch Burger',_binary '\0',17.50,4.70,_binary '\0','BBQ,Crowd favorite',_binary '\0','FC-000040',3,17.50,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(41,'burgers','Grilled veggie patty, avocado, lettuce, tomato and herb aioli.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903365/cxyrjxgm9jdzv4aclptt.jpg','Green Garden Burger',_binary '\0',14.50,4.60,_binary '\0','Vegetarian,Fresh',_binary '','FC-000041',3,14.50,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(42,'sides','Crispy fries with beef chili, cheddar sauce, jalapeño and sour cream.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903737/qivwgwzoo2bazpixa9hv.jpg','Chili Cheese Fries',_binary '',11.00,4.80,_binary '','Spicy,Loaded',_binary '\0','FC-000042',4,11.00,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(43,'sides','Crispy fries tossed with parmesan, rosemary, parsley and garlic butter.','https://res.cloudinary.com/gdkctwwo/image/upload/v1787147112/u2bz3yoksn4j9pdctglt.jpg','Herb Parmesan Fries',_binary '\0',8.00,4.70,_binary '\0','Vegetarian,Classic',_binary '','FC-000043',4,8.00,1,'2026-08-16 19:22:51','2026-08-19 13:45:14'),(44,'sides','Crispy jalapeños filled with cream cheese and cheddar, with ranch dip.','https://res.cloudinary.com/gdkctwwo/image/upload/v1787147087/yorwdiou16odgqohsa9t.jpg','Jalapeno Poppers',_binary '\0',9.00,4.70,_binary '','Spicy,Shareable',_binary '','FC-000044',4,9.00,1,'2026-08-16 19:22:51','2026-08-19 13:44:49'),(45,'sides','Romaine, parmesan, sourdough croutons and creamy Caesar dressing.','https://res.cloudinary.com/gdkctwwo/image/upload/v1787147065/ztsia9mbrjtqxpwhz4yx.jpg','Classic Caesar Salad',_binary '\0',9.50,4.50,_binary '\0','Fresh,Vegetarian',_binary '','FC-000045',4,9.50,1,'2026-08-16 19:22:51','2026-08-19 13:44:27'),(46,'sides','Warm toasted bread with garlic herb butter, parmesan and marinara.','https://res.cloudinary.com/gdkctwwo/image/upload/v1787147039/fbcjvhf6jp24lhsqojn8.jpg','Garlic Bread',_binary '\0',6.00,4.60,_binary '\0','Vegetarian,Classic',_binary '','FC-000046',4,6.00,1,'2026-08-16 19:22:51','2026-08-19 13:44:02'),(47,'pizza','Signature pizza with bubbling mozzarella, roasted tomatoes, basil and extra virgin olive oil.','https://res.cloudinary.com/gdkctwwo/image/upload/v1787146675/ev17wpccm9khpjtdjxmi.jpg','Wood-fired Special',_binary '',21.50,4.90,_binary '\0','New,Wood-fired',_binary '','FC-000047',1,21.50,1,'2026-08-16 19:22:51','2026-08-19 13:37:58'),(48,'burgers','Juicy double smash burger with cheddar, lettuce, tomato, pickles and house sauce.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903664/rxskdcuxcwp9tkmfgqix.jpg','Classic Smash Supreme',_binary '',18.50,4.90,_binary '\0','New,Bestseller',_binary '\0','FC-000048',3,18.50,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(49,'sides','Crispy golden fries topped with cheese sauce, herbs and our smoky house drizzle.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903650/gddu0qjvand4dbkf44qe.jpg','Golden Loaded Fries',_binary '',10.50,4.80,_binary '\0','New,Shareable',_binary '','FC-000049',4,10.50,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(50,'sides','Fresh greens, tomato, cucumber, avocado, seeds and citrus herb dressing.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786902366/me3gwi8ltmasmqf8zebs.webp','Garden Crunch Salad',_binary '\0',11.00,4.70,_binary '\0','New,Fresh',_binary '','FC-000050',4,11.00,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(51,'pizza-bagels','Toasted mini pizza bagels with bubbling cheese, tomato sauce and Italian herbs.','https://res.cloudinary.com/gdkctwwo/image/upload/v1786903638/rwm2iosknklxh1zstm8r.webp','Cheesy Pizza Bagel Platter',_binary '',11.50,4.80,_binary '\0','New,Shareable',_binary '','FC-000051',2,11.50,1,'2026-08-16 19:22:51','2026-08-16 19:58:05'),(52,'sides','Roasted seasonal vegetables, herbs, parmesan and warm toasted sourdough.','https://res.cloudinary.com/gdkctwwo/image/upload/v1787147014/thdgeyelhw5soyogmzod.webp','Firehouse Veggie Plate',_binary '\0',12.00,4.70,_binary '\0','New,Vegetarian',_binary '','FC-000052',4,12.00,1,'2026-08-16 19:22:51','2026-08-19 13:43:36'),(53,'sides','A generous mix of our favorite bites, sauces and freshly baked sides for sharing.','https://res.cloudinary.com/gdkctwwo/image/upload/v1787146983/vfscaqereswc0cg5cge3.jpg','Chef\'s Sharing Box',_binary '',24.00,4.90,_binary '\0','New,Shareable',_binary '\0','FC-000053',4,24.00,1,'2026-08-16 19:22:51','2026-08-19 13:43:09'),(54,'Drink','','https://res.cloudinary.com/gdkctwwo/image/upload/v1787375944/wpl9rtxumykquc2c7ot4.webp','Iced Milk Coffee',_binary '\0',2.50,4.70,_binary '\0','New,Fresh',_binary '\0','FC-000054',26,2.50,1,'2026-08-22 05:19:13','2026-08-22 07:33:54'),(55,'Drink','yummy','https://res.cloudinary.com/gdkctwwo/image/upload/v1787486295/b8jyc6pwzvpffkvhmfix.jpg','bay sor sach krok',_binary '\0',0.01,5.00,_binary '','haha',_binary '\0','FC-000055',26,100.00,1,'2026-08-23 11:58:46','2026-08-25 17:21:45');

--
-- Table structure for table `tables`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tables` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `branch_id` bigint NOT NULL,
  `table_no` varchar(20) NOT NULL,
  `capacity` int NOT NULL DEFAULT '2',
  `status` varchar(20) NOT NULL DEFAULT 'AVAILABLE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tables_branch_no` (`branch_id`,`table_no`),
  CONSTRAINT `fk_tables_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tables`
--

--
-- Table structure for table `drivers`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drivers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `email` varchar(180) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `profile_photo` varchar(255) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `national_id` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `emergency_contact` varchar(30) DEFAULT NULL,
  `license_plate` varchar(30) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `location_updated_at` timestamp NULL DEFAULT NULL,
  `profile_completed` tinyint(1) NOT NULL DEFAULT '0',
  `vehicle_info` varchar(255) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'OFFLINE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `branch_id` bigint DEFAULT NULL,
  `device_token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_drivers_phone` (`phone`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_drivers_branch` (`branch_id`),
  CONSTRAINT `fk_drivers_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `chk_drivers_status` CHECK ((`status` in (_utf8mb4'ONLINE',_utf8mb4'BUSY',_utf8mb4'OFFLINE')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drivers`
--

REPLACE INTO `drivers` VALUES (1,'chet','0888631805','chetdriver@gmail.com','$2a$10$Ie8dwXA0z0gOxAd4vc.Xi.AGPEQNczgTclElkh8wzZaeI8I6tBdWa','https://res.cloudinary.com/gdkctwwo/image/upload/v1787385235/fphxromlgwbv1xyo2ukw.jpg','2007-08-19','1','','','',11.55830000,104.91210000,'2026-08-25 14:31:22',0,'','ONLINE','2026-08-22 07:54:18',NULL,NULL);

--
-- Table structure for table `addresses`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addresses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `label` varchar(50) DEFAULT 'Home',
  `address_line` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_addresses_customer` (`customer_id`),
  CONSTRAINT `fk_addresses_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addresses`
--

REPLACE INTO `addresses` VALUES (1,3,'Delivery','Independence Monument, Independence Monument Roundabout, Sangkat Boeng Keng Kang Ti Muoy, Khan Boeng Keng Kang, Phnom Penh, 120102, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-19 13:56:23',NULL,NULL),(2,3,'Delivery','Cellcard office, Samdech Preah Sihanouk Boulevard (Street 274), Sangkat Boeng Reang, Khan Daun Penh, Phnom Penh, 120204, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-19 14:06:06',NULL,NULL),(3,3,'Delivery','Independence Monument, Independence Monument Roundabout, Sangkat Boeng Keng Kang Ti Muoy, Khan Boeng Keng Kang, Phnom Penh, 120102, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-19 14:32:42',NULL,NULL),(4,3,'Delivery','Wat Langkar (Street 55), Sangkat Boeng Reang, Khan Daun Penh, Phnom Penh, 120204, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-19 14:36:31',NULL,NULL),(5,3,'1','Community (TK31), Sangkat Boeung Salang, Khan Toul Kork, Phnom Penh, 120410, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-19 14:46:12',NULL,NULL),(6,2,'Delivery','Community (TK31), Sangkat Boeung Salang, Khan Toul Kork, Phnom Penh, 120410, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-19 15:16:19',NULL,NULL),(7,2,'Delivery','Community (TK31), Sangkat Boeung Salang, Khan Toul Kork, Phnom Penh, 120410, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-19 15:46:04',NULL,NULL),(8,1,'Delivery','Independence Monument, Independence Monument Roundabout, Sangkat Boeng Keng Kang Ti Muoy, Khan Boeng Keng Kang, Phnom Penh, 120102, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-20 04:24:08',NULL,NULL),(9,2,'Delivery','Street 218, Community (TK31), Sangkat Teuk L\'ak Ti Bei, Khan Toul Kork, Phnom Penh, 120410, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-20 04:36:12',NULL,NULL),(10,2,'1','ផ្លូវវង្សគុតបូរី, Phum Phsar Teuk Thla, Sangkat Teuk Thla, Khan Sen Sok, Phnom Penh, 120802, Cambodia','Phnom Penh',NULL,NULL,0,'2026-08-20 04:37:15',NULL,NULL),(20,7,'Delivery','Russian Federation Boulevard (Street 110), Sangkat Teuk L\'ak Ti Muoy, Khan Toul Kork, Phnom Penh, 120404, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 07:22:36',NULL,NULL),(21,1,'Delivery','Independence Monument, Independence Monument Roundabout, Sangkat Boeng Keng Kang Ti Muoy, Khan Boeng Keng Kang, Phnom Penh, 120102, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 12:14:02',NULL,NULL),(22,2,'Delivery','Community (TK31), Sangkat Boeung Salang, Khan Toul Kork, Phnom Penh, 120410, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 16:12:34',NULL,NULL),(23,1,'Home','123 St','PP',NULL,NULL,1,'2026-08-23 19:13:15',NULL,NULL),(24,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:17:34',NULL,NULL),(25,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:17:41',NULL,NULL),(26,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:17:42',NULL,NULL),(27,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:17:44',NULL,NULL),(28,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:17:46',NULL,NULL),(29,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:17:47',NULL,NULL),(30,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:17:47',NULL,NULL),(31,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:17:48',NULL,NULL),(32,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:17:49',NULL,NULL),(33,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:17:49',NULL,NULL),(34,7,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-23 19:21:47',NULL,NULL),(47,2,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-25 12:00:09',NULL,NULL),(48,10,'Delivery','Sangkat Boeng Keng Kang Ti Muoy, Khan Boeng Keng Kang, Phnom Penh, 120102, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-25 13:27:39',NULL,NULL),(49,10,'Delivery','Sangkat Boeng Keng Kang Ti Muoy, Khan Boeng Keng Kang, Phnom Penh, 120102, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-25 13:30:52',NULL,NULL),(50,10,'Delivery','Sangkat Boeng Keng Kang Ti Muoy, Khan Boeng Keng Kang, Phnom Penh, 120102, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-25 13:35:19',NULL,NULL),(51,10,'Delivery','Sangkat Boeng Keng Kang Ti Muoy, Khan Boeng Keng Kang, Phnom Penh, 120102, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-25 13:40:31',NULL,NULL),(52,10,'Delivery','Sangkat Boeng Keng Kang Ti Muoy, Khan Boeng Keng Kang, Phnom Penh, 120102, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-25 13:55:09',NULL,NULL),(53,3,'Delivery','Community (TK31), Sangkat Boeung Salang, Khan Toul Kork, Phnom Penh, 120410, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-25 16:39:27',NULL,NULL),(54,3,'Delivery','Community (TK31), Sangkat Boeung Salang, Khan Toul Kork, Phnom Penh, 120410, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-25 16:43:17',NULL,NULL),(56,11,'Delivery','Rmh','Svr',NULL,NULL,1,'2026-08-25 17:10:27',NULL,NULL),(58,2,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-25 17:32:27',NULL,NULL),(59,2,'Delivery','The Plaza Street, Sangkat Veal Vong, Khan Prampir Makara, Phnom Penh, 120307, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-25 18:38:43',NULL,NULL),(66,5,'1','Street 125, Sangkat Boeng Prolit, Khan Prampir Makara, Phnom Penh, 120308, Cambodia','Phnom Penh',NULL,NULL,1,'2026-08-26 11:10:53',NULL,NULL);

--
-- Table structure for table `carts`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_carts_customer` (`customer_id`),
  CONSTRAINT `fk_carts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

--
-- Table structure for table `orders`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_number` varchar(30) NOT NULL,
  `customer_id` bigint DEFAULT NULL,
  `address_id` bigint DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `coupon_id` bigint DEFAULT NULL,
  `driver_id` bigint DEFAULT NULL,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `branch_id` bigint DEFAULT NULL,
  `order_type` varchar(30) NOT NULL DEFAULT 'DELIVERY',
  `staff_id` bigint DEFAULT NULL,
  `table_id` bigint DEFAULT NULL,
  `driver_commission` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_number` (`order_number`),
  KEY `idx_orders_customer` (`customer_id`),
  KEY `idx_orders_status` (`status`),
  KEY `fk_orders_address` (`address_id`),
  KEY `fk_orders_staff` (`staff_id`),
  KEY `fk_orders_table` (`table_id`),
  CONSTRAINT `fk_orders_address` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_orders_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_orders_table` FOREIGN KEY (`table_id`) REFERENCES `tables` (`id`),
  CONSTRAINT `chk_orders_status` CHECK ((`status` in (_utf8mb4'PENDING',_utf8mb4'CONFIRMED',_utf8mb4'PREPARING',_utf8mb4'READY',_utf8mb4'OUT_FOR_DELIVERY',_utf8mb4'DELIVERED',_utf8mb4'CANCELLED',_utf8mb4'REJECTED')))
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

REPLACE INTO `orders` VALUES (1,'ORD-563550',3,1,'DELIVERED',28.00,0.99,28.99,'Payment: KHQR','2026-08-19 13:56:23','2026-08-22 10:03:20',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(2,'ORD-262450',3,2,'DELIVERED',25.00,0.99,25.99,'Payment: KHQR','2026-08-19 14:06:06','2026-08-22 10:03:31',2,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(3,'ORD-464139',3,3,'DELIVERED',47.00,0.99,47.99,'Payment: KHQR','2026-08-19 14:32:43','2026-08-22 10:03:35',1,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(4,'ORD-789760',3,4,'DELIVERED',76.00,0.99,76.99,'Payment: CASH','2026-08-19 14:36:31','2026-08-22 10:33:12',1,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(5,'ORD-714664',2,6,'DELIVERED',246.50,0.99,247.49,'Payment: KHQR','2026-08-19 15:16:20','2026-08-22 10:51:40',1,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(6,'ORD-782923',2,7,'DELIVERED',115.00,0.99,115.99,'Payment: KHQR','2026-08-19 15:46:05','2026-08-21 09:44:05',1,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(7,'ORD-509932',1,8,'DELIVERED',149.50,0.99,150.49,'Payment: KHQR','2026-08-20 04:24:09','2026-08-22 10:51:39',2,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(8,'ORD-553518',2,9,'DELIVERED',27.00,4.98,31.98,'Payment: KHQR','2026-08-20 04:36:13','2026-08-22 10:51:38',1,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(9,'ORD-587803',5,NULL,'DELIVERED',24.00,0.99,24.99,'Payment: CASH','2026-08-21 09:08:20','2026-08-22 10:47:53',3,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(10,'ORD-109750',5,NULL,'DELIVERED',337.50,0.99,338.49,'Payment: KHQR','2026-08-22 09:32:00','2026-08-22 10:51:37',3,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(11,'ORD-166256',5,NULL,'DELIVERED',15.00,0.99,15.99,'Payment: KHQR','2026-08-22 09:41:51','2026-08-22 10:51:33',3,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(12,'ORD-138480',5,NULL,'DELIVERED',973.50,0.99,974.49,'Payment: KHQR','2026-08-22 09:51:11','2026-08-22 10:23:53',3,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(13,'ORD-157270',5,NULL,'DELIVERED',12.50,4.98,17.48,'Payment: CASH','2026-08-22 10:52:33','2026-08-22 11:27:53',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(14,'ORD-568464',5,NULL,'DELIVERED',49.50,0.99,50.49,'Payment: CASH','2026-08-23 04:34:08','2026-08-23 04:34:48',2,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(15,'ORD-917201',5,NULL,'DELIVERED',16.50,0.99,17.49,'Payment: CASH','2026-08-23 05:13:14','2026-08-23 05:14:12',2,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(16,'ORD-921494',5,NULL,'DELIVERED',16.50,0.99,17.49,'Payment: CASH','2026-08-23 05:18:31','2026-08-23 05:21:29',2,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(17,'ORD-995626',5,NULL,'DELIVERED',573.00,0.99,573.99,'Payment: CASH','2026-08-23 06:12:06','2026-08-23 07:30:13',2,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(18,'ORD-397271',7,20,'DELIVERED',140.00,4.98,144.98,'Payment: CASH','2026-08-23 07:22:36','2026-08-23 07:39:37',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(19,'ORD-546774',1,21,'DELIVERED',35.50,0.99,36.49,'Payment: CASH','2026-08-23 12:14:02','2026-08-25 12:49:24',2,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(20,'ORD-603704',2,22,'DELIVERED',24.00,4.98,28.98,'Payment: CASH','2026-08-23 16:12:35','2026-08-23 16:14:58',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(21,'ORD-880378',7,34,'DELIVERED',15.00,4.98,19.98,'Payment: CASH','2026-08-23 19:21:47','2026-08-25 12:49:36',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(22,'ORD-394442',7,NULL,'DELIVERED',15.00,4.98,19.98,'Payment: CASH','2026-08-23 19:21:48','2026-08-25 12:52:23',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(23,'ORD-738402',7,NULL,'DELIVERED',15.00,4.98,19.98,'Payment: KHQR','2026-08-23 19:21:54','2026-08-25 12:52:22',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(24,'ORD-765209',7,NULL,'DELIVERED',36.00,4.98,40.98,'Payment: CASH','2026-08-23 19:22:48','2026-08-25 12:52:22',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(25,'ORD-181729',7,NULL,'DELIVERED',36.00,4.98,40.98,'Payment: CASH','2026-08-23 19:22:49','2026-08-25 12:52:21',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(26,'ORD-833053',7,NULL,'DELIVERED',36.00,4.98,40.98,'Payment: CASH','2026-08-23 19:22:49','2026-08-25 12:52:20',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(27,'ORD-179752',7,NULL,'DELIVERED',36.00,4.98,40.98,'Payment: CASH','2026-08-23 19:22:50','2026-08-25 12:52:19',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(28,'ORD-999043',7,NULL,'DELIVERED',36.00,4.98,40.98,'Payment: CASH','2026-08-23 19:22:50','2026-08-25 12:52:18',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(29,'ORD-616091',7,NULL,'DELIVERED',36.00,4.98,40.98,'Payment: CASH','2026-08-23 19:23:56','2026-08-25 12:52:17',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(30,'ORD-243130',5,NULL,'DELIVERED',16.50,4.98,21.48,'Payment: CASH','2026-08-24 10:24:46','2026-08-25 12:52:16',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(31,'ORD-329885',7,NULL,'DELIVERED',461.50,4.98,466.48,'Payment: CASH','2026-08-24 12:30:53','2026-08-25 12:52:15',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(32,'ORD-734719',2,47,'DELIVERED',481.50,4.98,486.48,'Payment: CASH','2026-08-25 12:00:09','2026-08-25 12:49:31',NULL,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(33,'ORD-276425',10,48,'DELIVERED',71.00,0.99,71.99,'Payment: CASH','2026-08-25 13:27:39','2026-08-25 13:30:34',3,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(34,'ORD-785923',10,49,'DELIVERED',64.50,0.99,65.49,'Payment: CASH','2026-08-25 13:30:52','2026-08-25 13:33:04',3,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(35,'ORD-955491',10,50,'DELIVERED',38.00,0.99,38.99,'Payment: CASH','2026-08-25 13:35:19','2026-08-25 13:39:30',3,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(36,'ORD-883477',10,51,'DELIVERED',57.00,0.99,57.99,'Payment: CASH','2026-08-25 13:40:31','2026-08-25 13:44:55',3,1,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(37,'ORD-451423',10,52,'DELIVERED',50.00,0.99,50.99,'Payment: CASH','2026-08-25 13:55:09','2026-08-27 13:33:22',3,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(38,'ORD-258830',3,53,'DELIVERED',94.50,3.99,98.49,'Payment: KHQR','2026-08-25 16:39:28','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(39,'ORD-967474',3,54,'DELIVERED',99.90,3.99,103.89,'Payment: KHQR','2026-08-25 16:43:17','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(40,'ORD-481127',5,NULL,'DELIVERED',0.10,0.00,0.10,'Payment: KHQR','2026-08-25 16:50:53','2026-08-27 13:33:22',2,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(41,'ORD-274398',11,56,'DELIVERED',0.10,0.00,0.10,'Payment: KHQR','2026-08-25 17:10:27','2026-08-27 13:33:22',2,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(42,'ORD-130733',5,NULL,'DELIVERED',0.10,0.00,0.10,'Payment: KHQR','2026-08-25 17:21:59','2026-08-27 13:33:22',2,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(43,'ORD-646861',2,58,'DELIVERED',0.01,0.00,0.01,'Payment: CASH','2026-08-25 17:32:27','2026-08-27 13:33:22',2,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(44,'ORD-865286',2,59,'DELIVERED',76.01,0.00,76.01,'Payment: CASH','2026-08-25 18:38:43','2026-08-27 13:33:22',2,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(45,'FC-1787732844662',5,NULL,'DELIVERED',91.50,0.00,91.50,NULL,'2026-08-26 08:27:25','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(46,'FC-1787733008598',5,NULL,'DELIVERED',133.00,0.00,133.00,NULL,'2026-08-26 08:30:09','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(47,'FC-1787733461550',5,NULL,'DELIVERED',19.00,0.00,19.00,NULL,'2026-08-26 08:37:42','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(48,'FC-1787734682695',5,NULL,'DELIVERED',57.00,0.00,57.00,NULL,'2026-08-26 08:58:03','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(49,'FC-1787734786559',5,NULL,'DELIVERED',38.00,0.00,38.00,NULL,'2026-08-26 08:59:47','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(50,'FC-1787735166763',5,NULL,'DELIVERED',19.00,0.00,19.00,NULL,'2026-08-26 09:06:07','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(51,'FC-1787735480239',5,NULL,'DELIVERED',76.00,0.00,76.00,NULL,'2026-08-26 09:11:20','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(52,'FC-1787736042864',5,NULL,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-26 09:20:43','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(53,'FC-1787738005788',5,NULL,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-26 09:53:26','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(54,'FC-1787738021889',5,NULL,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-26 09:53:42','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(55,'FC-1787738022979',5,NULL,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-26 09:53:43','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(56,'FC-1787738023896',5,NULL,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-26 09:53:44','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(57,'FC-1787738860607',5,NULL,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-26 10:07:41','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(58,'FC-1787739145818',5,NULL,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-26 10:12:26','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(59,'FC-1787739516996',5,NULL,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-26 10:18:37','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(60,'FC-1787771074277',5,66,'DELIVERED',1230.00,3.99,1233.99,NULL,'2026-08-26 19:04:34','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(61,'FC-1787771515330',5,66,'DELIVERED',0.01,3.99,4.00,NULL,'2026-08-26 19:11:55','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(62,'FC-1787772933580',5,66,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-26 19:35:34','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(63,'FC-1787818643654',5,66,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-27 08:17:24','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(64,'FC-1787818692481',5,66,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-27 08:18:12','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(65,'FC-1787820120419',5,66,'DELIVERED',0.01,0.00,0.01,NULL,'2026-08-27 08:42:01','2026-08-27 13:33:22',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(66,'FC-1787832372894',5,66,'PREPARING',0.01,0.00,0.01,NULL,'2026-08-27 12:06:13','2026-08-27 13:51:28',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(67,'FC-1787832548191',5,66,'OUT_FOR_DELIVERY',0.01,0.00,0.01,NULL,'2026-08-27 12:09:08','2026-08-27 13:39:21',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(68,'FC-1787842598650',2,59,'PENDING',194.00,0.00,194.00,NULL,'2026-08-27 14:56:40','2026-08-27 14:56:40',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(69,'FC-1787842801455',2,59,'PENDING',57.00,3.99,60.99,NULL,'2026-08-27 15:00:02','2026-08-27 15:00:02',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(70,'FC-1787843800061',2,59,'PENDING',551.50,3.99,555.49,NULL,'2026-08-27 15:16:40','2026-08-27 15:16:40',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(71,'FC-1787843843272',2,59,'PENDING',19.00,3.99,22.99,NULL,'2026-08-27 15:17:23','2026-08-27 15:17:23',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00),(72,'FC-1787845048669',3,54,'PENDING',0.02,0.00,0.02,NULL,'2026-08-27 15:37:30','2026-08-27 15:37:30',NULL,NULL,0.00,NULL,'DELIVERY',NULL,NULL,0.00);

--
-- Table structure for table `cart_items`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `cart_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `quantity` int NOT NULL,
  `options` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_cart_items_cart` (`cart_id`),
  KEY `fk_cart_items_product` (`product_id`),
  CONSTRAINT `fk_cart_items_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `chk_cart_items_quantity` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

--
-- Table structure for table `order_items`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `line_total` decimal(10,2) NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `options` json DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `item_notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `chk_order_items_status` CHECK ((`status` in (_utf8mb4'PENDING',_utf8mb4'COOKING',_utf8mb4'READY',_utf8mb4'CANCELLED')))
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

REPLACE INTO `order_items` VALUES (1,1,22,4,7.00,28.00,'Garlic Butter Bagel Bites',NULL,'PENDING',NULL),(2,2,3,1,7.50,7.50,'Classic Pizza Bagel',NULL,'PENDING',NULL),(3,2,8,1,9.00,9.00,'Pepperoni Pizza Bagel',NULL,'PENDING',NULL),(4,2,9,1,8.50,8.50,'Four Cheese Pizza Bagel',NULL,'PENDING',NULL),(5,3,3,2,7.50,15.00,'Classic Pizza Bagel',NULL,'PENDING',NULL),(6,3,4,2,16.00,32.00,'Flame & Crust Signature',NULL,'PENDING',NULL),(7,4,2,4,19.00,76.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(8,5,33,1,21.00,21.00,'Applewood BBQ Pizza',NULL,'PENDING',NULL),(9,5,47,1,21.50,21.50,'Wood-fired Special',NULL,'PENDING',NULL),(10,5,32,1,22.00,22.00,'Meat Lovers Fire',NULL,'PENDING',NULL),(11,5,31,1,18.50,18.50,'Pesto Garden',NULL,'PENDING',NULL),(12,5,30,8,18.00,144.00,'Roasted Garlic Bianca',NULL,'PENDING',NULL),(13,5,29,1,19.50,19.50,'Honey Pepperoni',NULL,'PENDING',NULL),(14,6,1,2,16.50,33.00,'Margherita Classica',NULL,'PENDING',NULL),(15,6,4,1,16.00,16.00,'Flame & Crust Signature',NULL,'PENDING',NULL),(16,6,6,1,21.00,21.00,'Quattro Formaggi',NULL,'PENDING',NULL),(17,6,5,1,8.00,8.00,'Truffle Parm Fries',NULL,'PENDING',NULL),(18,6,7,2,18.50,37.00,'Nonna\'s Garden',NULL,'PENDING',NULL),(19,7,1,1,16.50,16.50,'Margherita Classica',NULL,'PENDING',NULL),(20,7,2,7,19.00,133.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(21,8,8,3,9.00,27.00,'Pepperoni Pizza Bagel','{}','PENDING',NULL),(22,9,53,1,24.00,24.00,'Chef\'s Sharing Box',NULL,'PENDING',NULL),(23,10,53,7,24.00,168.00,'Chef\'s Sharing Box',NULL,'PENDING',NULL),(24,10,8,3,9.00,27.00,'Pepperoni Pizza Bagel',NULL,'PENDING',NULL),(25,10,8,15,9.00,135.00,'Pepperoni Pizza Bagel','{}','PENDING',NULL),(26,10,54,3,2.50,7.50,'Iced Milk Coffee','{}','PENDING',NULL),(27,11,54,6,2.50,15.00,'Iced Milk Coffee',NULL,'PENDING',NULL),(28,12,1,59,16.50,973.50,'Margherita Classica',NULL,'PENDING',NULL),(29,13,13,1,12.50,12.50,'Buffalo Wings',NULL,'PENDING',NULL),(30,14,1,3,16.50,49.50,'Margherita Classica',NULL,'PENDING',NULL),(31,15,1,1,16.50,16.50,'Margherita Classica',NULL,'PENDING',NULL),(32,16,1,1,16.50,16.50,'Margherita Classica',NULL,'PENDING',NULL),(33,17,19,24,20.50,492.00,'Mushroom Truffle Pizza','{}','PENDING',NULL),(34,17,8,9,9.00,81.00,'Pepperoni Pizza Bagel',NULL,'PENDING',NULL),(35,18,3,7,7.50,52.50,'Classic Pizza Bagel',NULL,'PENDING',NULL),(36,18,2,2,19.00,38.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(37,18,1,3,16.50,49.50,'Margherita Classica',NULL,'PENDING',NULL),(38,19,1,1,16.50,16.50,'Margherita Classica',NULL,'PENDING',NULL),(39,19,2,1,19.00,19.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(40,20,53,1,24.00,24.00,'Chef\'s Sharing Box',NULL,'PENDING',NULL),(41,29,3,2,7.50,15.00,'Classic Pizza Bagel',NULL,'PENDING',NULL),(42,29,6,1,21.00,21.00,'Quattro Formaggi','{}','PENDING',NULL),(43,30,1,1,16.50,16.50,'Margherita Classica',NULL,'PENDING',NULL),(44,31,14,71,6.50,461.50,'Garlic Knots',NULL,'PENDING',NULL),(45,32,2,10,19.00,190.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(46,32,40,15,17.50,262.50,'BBQ Bacon Ranch Burger',NULL,'PENDING',NULL),(47,32,41,2,14.50,29.00,'Green Garden Burger',NULL,'PENDING',NULL),(48,33,1,2,16.50,33.00,'Margherita Classica',NULL,'PENDING',NULL),(49,33,2,2,19.00,38.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(50,34,3,1,7.50,7.50,'Classic Pizza Bagel',NULL,'PENDING',NULL),(51,34,2,3,19.00,57.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(52,35,2,2,19.00,38.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(53,36,2,3,19.00,57.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(54,37,13,4,12.50,50.00,'Buffalo Wings',NULL,'PENDING',NULL),(55,38,8,1,9.00,9.00,'Pepperoni Pizza Bagel',NULL,'PENDING',NULL),(56,38,5,1,8.00,8.00,'Truffle Parm Fries',NULL,'PENDING',NULL),(57,38,6,1,21.00,21.00,'Quattro Formaggi',NULL,'PENDING',NULL),(58,38,7,1,18.50,18.50,'Nonna\'s Garden',NULL,'PENDING',NULL),(59,38,2,2,19.00,38.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(60,39,55,999,0.10,99.90,'bay sor sach krok','{}','PENDING',NULL),(61,40,55,1,0.10,0.10,'bay sor sach krok',NULL,'PENDING',NULL),(62,41,55,1,0.10,0.10,'bay sor sach krok','{}','PENDING',NULL),(63,42,55,1,0.10,0.10,'bay sor sach krok',NULL,'PENDING',NULL),(64,43,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(65,44,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(66,44,2,4,19.00,76.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(67,45,14,1,6.50,6.50,'Garlic Knots',NULL,'PENDING',NULL),(68,45,1,4,16.50,66.00,'Margherita Classica',NULL,'PENDING',NULL),(69,45,2,1,19.00,19.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(70,46,2,7,19.00,133.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(71,47,2,1,19.00,19.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(72,48,2,3,19.00,57.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(73,49,2,2,19.00,38.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(74,50,2,1,19.00,19.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(75,51,2,4,19.00,76.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(76,52,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(77,57,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(78,58,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(79,59,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(80,60,4,3,16.00,48.00,'Flame & Crust Signature (Small)','{\"Size\": \"Small\"}','PENDING',NULL),(81,60,2,41,19.00,779.00,'Pepperoni Diavola (Small)','{\"Size\": \"Small\"}','PENDING',NULL),(82,60,8,7,9.00,63.00,'Pepperoni Pizza Bagel (Small)','{\"Size\": \"Small\"}','PENDING',NULL),(83,60,2,2,21.00,42.00,'Pepperoni Diavola (Medium)','{\"Size\": \"Medium\"}','PENDING',NULL),(84,60,2,8,23.00,184.00,'Pepperoni Diavola (Large)','{\"Size\": \"Large\"}','PENDING',NULL),(85,60,2,6,19.00,114.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(86,61,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(87,62,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(88,63,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(89,64,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(90,65,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(91,66,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(92,67,55,1,0.01,0.01,'bay sor sach krok',NULL,'PENDING',NULL),(93,68,2,5,19.00,95.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(94,68,1,6,16.50,99.00,'Margherita Classica',NULL,'PENDING',NULL),(95,69,2,3,19.00,57.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(96,70,1,2,16.50,33.00,'Margherita Classica',NULL,'PENDING',NULL),(97,70,3,1,7.50,7.50,'Classic Pizza Bagel (Small)','{\"Size\": \"Small\"}','PENDING',NULL),(98,70,2,16,19.00,304.00,'Pepperoni Diavola (Small)','{\"Size\": \"Small\"}','PENDING',NULL),(99,70,2,9,23.00,207.00,'Pepperoni Diavola (Large)','{\"Size\": \"Large\"}','PENDING',NULL),(100,71,2,1,19.00,19.00,'Pepperoni Diavola',NULL,'PENDING',NULL),(101,72,55,2,0.01,0.02,'bay sor sach krok (Small)','{\"Size\": \"Small\"}','PENDING',NULL);

--
-- Table structure for table `order_status_history`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_status_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `status` varchar(30) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `changed_by` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_status_history_order` (`order_id`),
  KEY `fk_osh_user` (`changed_by`),
  CONSTRAINT `fk_order_status_history_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_osh_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_status_history`
--

--
-- Table structure for table `payments`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `method` varchar(30) NOT NULL DEFAULT 'CASH',
  `status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `amount` decimal(10,2) NOT NULL,
  `transaction_id` varchar(120) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_order` (`order_id`),
  UNIQUE KEY `uk_payments_transaction` (`transaction_id`),
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

REPLACE INTO `payments` VALUES (1,1,'OTHER','PAID',28.99,'TXN-1787147784628',NULL,'2026-08-19 13:56:24'),(2,2,'OTHER','PAID',25.99,'TXN-1787148368118',NULL,'2026-08-19 14:06:08'),(3,3,'OTHER','PAID',47.99,'TXN-1787149964122',NULL,'2026-08-19 14:32:44'),(4,4,'CASH','PENDING',76.99,NULL,NULL,'2026-08-19 14:36:32'),(5,5,'OTHER','PAID',247.49,'TXN-1787152581432',NULL,'2026-08-19 15:16:21'),(6,6,'OTHER','PAID',115.99,'TXN-1787154367095',NULL,'2026-08-19 15:46:07'),(7,7,'OTHER','PAID',150.49,'TXN-1787199850379',NULL,'2026-08-20 04:24:10'),(8,8,'OTHER','PAID',31.98,'TXN-1787200574251',NULL,'2026-08-20 04:36:14'),(9,9,'CASH','PENDING',24.99,NULL,NULL,'2026-08-21 09:08:20'),(10,10,'OTHER','PAID',338.49,'TXN-1787391120683',NULL,'2026-08-22 09:32:00'),(11,11,'OTHER','PAID',15.99,'TXN-1787391711336',NULL,'2026-08-22 09:41:51'),(12,12,'OTHER','PAID',974.49,'TXN-1787392271544',NULL,'2026-08-22 09:51:11'),(13,13,'CASH','PENDING',17.48,NULL,NULL,'2026-08-22 10:52:33'),(14,14,'CASH','PENDING',50.49,NULL,NULL,'2026-08-23 04:34:08'),(15,15,'CASH','PENDING',17.49,NULL,NULL,'2026-08-23 05:13:14'),(16,16,'CASH','PENDING',17.49,NULL,NULL,'2026-08-23 05:18:31'),(17,17,'CASH','PENDING',573.99,NULL,NULL,'2026-08-23 06:12:06'),(18,18,'CASH','PENDING',144.98,NULL,NULL,'2026-08-23 07:22:38'),(19,19,'CASH','PENDING',36.49,NULL,NULL,'2026-08-23 12:14:03'),(20,20,'CASH','PENDING',28.98,NULL,NULL,'2026-08-23 16:12:36'),(21,29,'CASH','PENDING',40.98,NULL,NULL,'2026-08-23 19:23:56'),(22,30,'CASH','PENDING',21.48,NULL,NULL,'2026-08-24 10:24:46'),(23,31,'CASH','PENDING',466.48,NULL,NULL,'2026-08-24 12:30:55'),(24,32,'CASH','PENDING',486.48,NULL,NULL,'2026-08-25 12:00:10'),(25,33,'CASH','PENDING',71.99,NULL,NULL,'2026-08-25 13:27:39'),(26,34,'CASH','PENDING',65.49,NULL,NULL,'2026-08-25 13:30:52'),(27,35,'CASH','PENDING',38.99,NULL,NULL,'2026-08-25 13:35:19'),(28,36,'CASH','PENDING',57.99,NULL,NULL,'2026-08-25 13:40:31'),(29,37,'CASH','PENDING',50.99,NULL,NULL,'2026-08-25 13:55:09'),(30,38,'OTHER','PAID',98.49,'TXN-1787675971280',NULL,'2026-08-25 16:39:32'),(31,39,'OTHER','PAID',103.89,'TXN-1787676197736',NULL,'2026-08-25 16:43:19'),(32,40,'OTHER','PAID',0.10,'TXN-1787676653540',NULL,'2026-08-25 16:50:54'),(33,41,'OTHER','PAID',0.10,'TXN-1787677829207',NULL,'2026-08-25 17:10:30'),(34,42,'OTHER','PAID',0.10,'TXN-1787678519001',NULL,'2026-08-25 17:21:59'),(35,43,'CASH','PENDING',0.01,NULL,NULL,'2026-08-25 17:32:28'),(36,44,'CASH','PENDING',76.01,NULL,NULL,'2026-08-25 18:38:44'),(37,45,'KHQR','PENDING',91.50,NULL,NULL,'2026-08-26 08:27:25'),(38,46,'KHQR','PENDING',133.00,NULL,NULL,'2026-08-26 08:30:09'),(39,47,'KHQR','PENDING',19.00,NULL,NULL,'2026-08-26 08:37:42'),(40,48,'KHQR','PENDING',57.00,NULL,NULL,'2026-08-26 08:58:03'),(41,49,'KHQR','PENDING',38.00,NULL,NULL,'2026-08-26 08:59:47'),(42,50,'KHQR','PENDING',19.00,NULL,NULL,'2026-08-26 09:06:07'),(43,51,'KHQR','PENDING',76.00,NULL,NULL,'2026-08-26 09:11:20'),(44,52,'KHQR','PENDING',0.01,NULL,NULL,'2026-08-26 09:20:43'),(45,57,'KHQR','PENDING',0.01,NULL,NULL,'2026-08-26 10:07:41'),(46,58,'KHQR','PENDING',0.01,NULL,NULL,'2026-08-26 10:12:26'),(47,59,'KHQR','PENDING',0.01,NULL,NULL,'2026-08-26 10:18:37'),(48,60,'KHQR','PENDING',1233.99,NULL,NULL,'2026-08-26 19:04:35'),(51,61,'KHQR','PENDING',4.00,NULL,NULL,'2026-08-26 19:11:55'),(52,62,'KHQR','PAID',0.01,NULL,NULL,'2026-08-26 19:35:34'),(53,63,'KHQR','PAID',0.01,NULL,NULL,'2026-08-27 08:17:24'),(54,64,'KHQR','PAID',0.01,NULL,NULL,'2026-08-27 08:18:13'),(55,65,'CASH','PENDING',0.01,NULL,NULL,'2026-08-27 08:42:02'),(56,66,'CASH','PENDING',0.01,NULL,NULL,'2026-08-27 12:06:13'),(57,67,'CASH','PENDING',0.01,NULL,NULL,'2026-08-27 12:09:08'),(58,68,'CASH','PENDING',194.00,NULL,NULL,'2026-08-27 14:56:41'),(59,69,'CASH','PENDING',60.99,NULL,NULL,'2026-08-27 15:00:03'),(60,70,'CASH','PENDING',555.49,NULL,NULL,'2026-08-27 15:16:40'),(61,71,'CASH','PENDING',22.99,NULL,NULL,'2026-08-27 15:17:24'),(62,72,'CASH','PENDING',0.02,NULL,NULL,'2026-08-27 15:37:31');

--
-- Table structure for table `payment_attempts`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_attempts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `method` varchar(30) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `amount` decimal(10,2) NOT NULL,
  `transaction_id` varchar(120) DEFAULT NULL,
  `error_message` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_attempts_order` (`order_id`),
  CONSTRAINT `fk_payment_attempts_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_attempts`
--

--
-- Table structure for table `reviews`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `customer_id` bigint NOT NULL,
  `rating` int NOT NULL,
  `comment` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_verified_purchase` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reviews_product_customer` (`product_id`,`customer_id`),
  KEY `fk_reviews_customer` (`customer_id`),
  CONSTRAINT `fk_reviews_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_reviews_rating` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

REPLACE INTO `reviews` VALUES (1,2,1,1,'ot chganh te','2026-08-23 04:40:18',0);

--
-- Table structure for table `driver_locations`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driver_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `driver_id` bigint NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dloc_driver` (`driver_id`),
  CONSTRAINT `fk_dloc_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver_locations`
--

--
-- Table structure for table `inventory`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `branch_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `stock_quantity` int NOT NULL DEFAULT '0',
  `low_stock_threshold` int NOT NULL DEFAULT '5',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inventory_branch_product` (`branch_id`,`product_id`),
  KEY `fk_inventory_product` (`product_id`),
  CONSTRAINT `fk_inventory_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

--
-- Table structure for table `product_recipes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_recipes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `variant_id` bigint NOT NULL,
  `ingredient_id` bigint NOT NULL,
  `quantity_needed` decimal(10,3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_recipe` (`variant_id`,`ingredient_id`),
  KEY `fk_recipe_ing` (`ingredient_id`),
  CONSTRAINT `fk_recipe_ing` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recipe_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_recipes`
--

--
-- Table structure for table `product_variants`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `option_id` bigint NOT NULL,
  `name` varchar(50) NOT NULL,
  `price_adjustment` decimal(10,2) NOT NULL DEFAULT '0.00',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_product_variants_option` (`option_id`),
  CONSTRAINT `fk_product_variants_option` FOREIGN KEY (`option_id`) REFERENCES `product_options` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=182 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variants`
--

REPLACE INTO `product_variants` VALUES (1,1,'Small',0.00,1),(2,2,'Small',0.00,1),(3,3,'Small',0.00,1),(4,4,'Small',0.00,1),(5,5,'Small',0.00,1),(6,6,'Small',0.00,1),(7,7,'Small',0.00,1),(8,8,'Small',0.00,1),(9,9,'Small',0.00,1),(10,10,'Small',0.00,1),(11,11,'Small',0.00,1),(12,12,'Small',0.00,1),(13,13,'Small',0.00,1),(14,14,'Small',0.00,1),(15,15,'Small',0.00,1),(16,16,'Small',0.00,1),(17,17,'Small',0.00,1),(18,18,'Small',0.00,1),(19,19,'Small',0.00,1),(20,20,'Small',0.00,1),(21,21,'Small',0.00,1),(22,22,'Small',0.00,1),(23,23,'Small',0.00,1),(24,24,'Small',0.00,1),(25,25,'Small',0.00,1),(26,26,'Small',0.00,1),(27,27,'Small',0.00,1),(28,28,'Small',0.00,1),(29,29,'Small',0.00,1),(30,30,'Small',0.00,1),(31,31,'Small',0.00,1),(32,32,'Small',0.00,1),(33,33,'Small',0.00,1),(34,34,'Small',0.00,1),(35,35,'Small',0.00,1),(36,36,'Small',0.00,1),(37,37,'Small',0.00,1),(38,38,'Small',0.00,1),(39,39,'Small',0.00,1),(40,40,'Small',0.00,1),(41,41,'Small',0.00,1),(42,42,'Small',0.00,1),(43,43,'Small',0.00,1),(44,44,'Small',0.00,1),(45,45,'Small',0.00,1),(46,46,'Small',0.00,1),(47,47,'Small',0.00,1),(48,48,'Small',0.00,1),(49,49,'Small',0.00,1),(50,50,'Small',0.00,1),(51,51,'Small',0.00,1),(52,52,'Small',0.00,1),(53,53,'Small',0.00,1),(54,54,'Small',0.00,1),(55,55,'Small',0.00,1),(64,1,'Medium',2.00,1),(65,2,'Medium',2.00,1),(66,3,'Medium',2.00,1),(67,4,'Medium',2.00,1),(68,5,'Medium',2.00,1),(69,6,'Medium',2.00,1),(70,7,'Medium',2.00,1),(71,8,'Medium',2.00,1),(72,9,'Medium',2.00,1),(73,10,'Medium',2.00,1),(74,11,'Medium',2.00,1),(75,12,'Medium',2.00,1),(76,13,'Medium',2.00,1),(77,14,'Medium',2.00,1),(78,15,'Medium',2.00,1),(79,16,'Medium',2.00,1),(80,17,'Medium',2.00,1),(81,18,'Medium',2.00,1),(82,19,'Medium',2.00,1),(83,20,'Medium',2.00,1),(84,21,'Medium',2.00,1),(85,22,'Medium',2.00,1),(86,23,'Medium',2.00,1),(87,24,'Medium',2.00,1),(88,25,'Medium',2.00,1),(89,26,'Medium',2.00,1),(90,27,'Medium',2.00,1),(91,28,'Medium',2.00,1),(92,29,'Medium',2.00,1),(93,30,'Medium',2.00,1),(94,31,'Medium',2.00,1),(95,32,'Medium',2.00,1),(96,33,'Medium',2.00,1),(97,34,'Medium',2.00,1),(98,35,'Medium',2.00,1),(99,36,'Medium',2.00,1),(100,37,'Medium',2.00,1),(101,38,'Medium',2.00,1),(102,39,'Medium',2.00,1),(103,40,'Medium',2.00,1),(104,41,'Medium',2.00,1),(105,42,'Medium',2.00,1),(106,43,'Medium',2.00,1),(107,44,'Medium',2.00,1),(108,45,'Medium',2.00,1),(109,46,'Medium',2.00,1),(110,47,'Medium',2.00,1),(111,48,'Medium',2.00,1),(112,49,'Medium',2.00,1),(113,50,'Medium',2.00,1),(114,51,'Medium',2.00,1),(115,52,'Medium',2.00,1),(116,53,'Medium',2.00,1),(117,54,'Medium',2.00,1),(118,55,'Medium',2.00,1),(127,1,'Large',4.00,1),(128,2,'Large',4.00,1),(129,3,'Large',4.00,1),(130,4,'Large',4.00,1),(131,5,'Large',4.00,1),(132,6,'Large',4.00,1),(133,7,'Large',4.00,1),(134,8,'Large',4.00,1),(135,9,'Large',4.00,1),(136,10,'Large',4.00,1),(137,11,'Large',4.00,1),(138,12,'Large',4.00,1),(139,13,'Large',4.00,1),(140,14,'Large',4.00,1),(141,15,'Large',4.00,1),(142,16,'Large',4.00,1),(143,17,'Large',4.00,1),(144,18,'Large',4.00,1),(145,19,'Large',4.00,1),(146,20,'Large',4.00,1),(147,21,'Large',4.00,1),(148,22,'Large',4.00,1),(149,23,'Large',4.00,1),(150,24,'Large',4.00,1),(151,25,'Large',4.00,1),(152,26,'Large',4.00,1),(153,27,'Large',4.00,1),(154,28,'Large',4.00,1),(155,29,'Large',4.00,1),(156,30,'Large',4.00,1),(157,31,'Large',4.00,1),(158,32,'Large',4.00,1),(159,33,'Large',4.00,1),(160,34,'Large',4.00,1),(161,35,'Large',4.00,1),(162,36,'Large',4.00,1),(163,37,'Large',4.00,1),(164,38,'Large',4.00,1),(165,39,'Large',4.00,1),(166,40,'Large',4.00,1),(167,41,'Large',4.00,1),(168,42,'Large',4.00,1),(169,43,'Large',4.00,1),(170,44,'Large',4.00,1),(171,45,'Large',4.00,1),(172,46,'Large',4.00,1),(173,47,'Large',4.00,1),(174,48,'Large',4.00,1),(175,49,'Large',4.00,1),(176,50,'Large',4.00,1),(177,51,'Large',4.00,1),(178,52,'Large',4.00,1),(179,53,'Large',4.00,1),(180,54,'Large',4.00,1),(181,55,'Large',4.00,1);

--
-- Table structure for table `product_options`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_options` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `name` varchar(50) NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `max_selections` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_product_options_product` (`product_id`),
  CONSTRAINT `fk_product_options_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_options`
--

REPLACE INTO `product_options` VALUES (1,1,'Size',1,1),(2,2,'Size',1,1),(3,3,'Size',1,1),(4,4,'Size',1,1),(5,5,'Size',1,1),(6,6,'Size',1,1),(7,7,'Size',1,1),(8,8,'Size',1,1),(9,9,'Size',1,1),(10,10,'Size',1,1),(11,11,'Size',1,1),(12,12,'Size',1,1),(13,13,'Size',1,1),(14,14,'Size',1,1),(15,15,'Size',1,1),(16,16,'Size',1,1),(17,17,'Size',1,1),(18,18,'Size',1,1),(19,19,'Size',1,1),(20,20,'Size',1,1),(21,21,'Size',1,1),(22,22,'Size',1,1),(23,23,'Size',1,1),(24,24,'Size',1,1),(25,25,'Size',1,1),(26,26,'Size',1,1),(27,27,'Size',1,1),(28,28,'Size',1,1),(29,29,'Size',1,1),(30,30,'Size',1,1),(31,31,'Size',1,1),(32,32,'Size',1,1),(33,33,'Size',1,1),(34,34,'Size',1,1),(35,35,'Size',1,1),(36,36,'Size',1,1),(37,37,'Size',1,1),(38,38,'Size',1,1),(39,39,'Size',1,1),(40,40,'Size',1,1),(41,41,'Size',1,1),(42,42,'Size',1,1),(43,43,'Size',1,1),(44,44,'Size',1,1),(45,45,'Size',1,1),(46,46,'Size',1,1),(47,47,'Size',1,1),(48,48,'Size',1,1),(49,49,'Size',1,1),(50,50,'Size',1,1),(51,51,'Size',1,1),(52,52,'Size',1,1),(53,53,'Size',1,1),(54,54,'Size',1,1),(55,55,'Size',1,1);

--
-- Table structure for table `coupon_usages`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupon_usages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint NOT NULL,
  `customer_id` bigint NOT NULL,
  `order_id` bigint NOT NULL,
  `used_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cu_unique` (`coupon_id`,`customer_id`,`order_id`),
  KEY `fk_cu_customer` (`customer_id`),
  KEY `fk_cu_order` (`order_id`),
  CONSTRAINT `fk_cu_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cu_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cu_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupon_usages`
--

--
-- Table structure for table `audit_logs`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_created` (`user_id`,`created_at`),
  CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

--
-- Table structure for table `kitchen_staff`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kitchen_staff` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `email` varchar(180) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_title` varchar(100) DEFAULT 'Staff',
  `status` varchar(30) NOT NULL DEFAULT 'OFFLINE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `device_token` varchar(255) DEFAULT NULL,
  `branch_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kitchen_staff_phone` (`phone`),
  UNIQUE KEY `uk_kitchen_staff_email` (`email`),
  KEY `fk_ks_branch` (`branch_id`),
  CONSTRAINT `fk_ks_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `chk_kitchen_staff_status` CHECK ((`status` in (_utf8mb4'ONLINE',_utf8mb4'BUSY',_utf8mb4'OFFLINE')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kitchen_staff`
--

REPLACE INTO `kitchen_staff` VALUES (1,'khemara','0888631805','kira1111@gmail.com','$2a$10$3jFpQ9Y2aU62YBZgK0WrPeVfzVg7pO/pakCRH9/ERPJ2wEYXK.iI.',NULL,'ONLINE','2026-08-23 18:51:18',NULL,NULL);

--
-- Table structure for table `branch_staff`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branch_staff` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `branch_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_branch_staff` (`branch_id`,`user_id`),
  KEY `fk_branch_staff_user` (`user_id`),
  CONSTRAINT `fk_branch_staff_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_branch_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_staff`
--

--
-- Table structure for table `cash_register_sessions`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_register_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `branch_id` bigint NOT NULL,
  `opened_by` bigint NOT NULL,
  `closed_by` bigint DEFAULT NULL,
  `opening_amount` decimal(10,2) NOT NULL,
  `closing_amount` decimal(10,2) DEFAULT NULL,
  `opened_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_crs_branch` (`branch_id`),
  KEY `fk_crs_opened` (`opened_by`),
  KEY `fk_crs_closed` (`closed_by`),
  CONSTRAINT `fk_crs_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_crs_closed` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_crs_opened` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_register_sessions`
--

SET FOREIGN_KEY_CHECKS = 1;