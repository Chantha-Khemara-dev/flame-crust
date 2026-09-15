-- V23: Create review_replies and review_reactions tables

CREATE TABLE IF NOT EXISTS review_replies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    review_id BIGINT NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_avatar VARCHAR(255) NULL,
    is_staff BOOLEAN DEFAULT FALSE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_review_replies_review_id (review_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_reactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    review_id BIGINT NOT NULL,
    emoji VARCHAR(16) NOT NULL,
    user_identifier VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_review_reactions_review_id (review_id),
    UNIQUE KEY uk_review_emoji_user (review_id, emoji, user_identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed initial friendly staff response for existing reviews
INSERT INTO review_replies (review_id, author_name, is_staff, comment, created_at)
SELECT id, 'Flame & Crust Team', TRUE, 'អរគុណច្រើនសម្រាប់ការគាំទ្រ និងការវាយតម្លៃដ៏កក់ក្ដៅ! 🍕🔥 ហាងយើងខ្ញុំរីករាយណាស់ដែលអ្នកពេញចិត្តរសជាតិភីហ្សា!', NOW()
FROM reviews
LIMIT 1;

-- Seed initial reactions
INSERT IGNORE INTO review_reactions (review_id, emoji, user_identifier, created_at)
SELECT id, '👍', 'seed_user_1', NOW() FROM reviews LIMIT 1;

INSERT IGNORE INTO review_reactions (review_id, emoji, user_identifier, created_at)
SELECT id, '🔥', 'seed_user_2', NOW() FROM reviews LIMIT 1;

INSERT IGNORE INTO review_reactions (review_id, emoji, user_identifier, created_at)
SELECT id, '❤️', 'seed_user_3', NOW() FROM reviews LIMIT 1;
