package com.flamecrust.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    
    private final JdbcTemplate jdbc;
    private volatile Map<String, Object> cachedOverview = null;
    private volatile long cacheExpiresAt = 0;

    @GetMapping
    public Map<String, Object> overview() {
        long now = System.currentTimeMillis();
        if (cachedOverview != null && now < cacheExpiresAt) {
            return cachedOverview;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        
        try {
            // 1. High performance aggregated stats
            BigDecimal totalRevenue = jdbc.queryForObject(
                    "SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'CANCELLED'", BigDecimal.class);
            Long totalOrders = jdbc.queryForObject("SELECT COUNT(*) FROM orders", Long.class);
            Long totalProducts = jdbc.queryForObject("SELECT COUNT(*) FROM products", Long.class);
            Long activeDrivers = jdbc.queryForObject("SELECT COUNT(*) FROM drivers", Long.class);

            result.put("totalRevenue", totalRevenue != null ? totalRevenue : BigDecimal.ZERO);
            result.put("totalOrders", totalOrders != null ? totalOrders : 0L);
            result.put("totalProducts", totalProducts != null ? totalProducts : 0L);
            result.put("activeDrivers", activeDrivers != null ? activeDrivers : 0L);

            // 2. Optimized recent orders with customer names (fast index scan)
            List<Map<String, Object>> recentOrders = jdbc.queryForList(
                    "SELECT o.id, o.order_number, o.customer_id, c.name AS customer_name, c.phone AS customer_phone, o.total, o.status, o.created_at " +
                    "FROM orders o LEFT JOIN customers c ON o.customer_id = c.id " +
                    "ORDER BY o.id DESC LIMIT 10");
            result.put("recentOrders", recentOrders);
            result.put("orders", recentOrders);

            // 3. Fast 7-day revenue aggregation
            List<Map<String, Object>> chartPoints = jdbc.queryForList(
                    "SELECT DATE(created_at) as order_date, COALESCE(SUM(total), 0) as daily_revenue, COUNT(*) as order_count " +
                    "FROM orders WHERE status != 'CANCELLED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) " +
                    "GROUP BY DATE(created_at) ORDER BY order_date ASC");
            result.put("chartData", chartPoints);

            // 4. Top Selling Products (using line_total or unit_price * quantity)
            List<Map<String, Object>> topProducts = jdbc.queryForList(
                    "SELECT p.name, COUNT(oi.id) as sales, COALESCE(SUM(COALESCE(oi.line_total, oi.unit_price * oi.quantity)), 0) as revenue " +
                    "FROM order_items oi INNER JOIN products p ON oi.product_id = p.id " +
                    "GROUP BY p.id, p.name ORDER BY sales DESC LIMIT 5");
            result.put("topProducts", topProducts);

            // 5. Sales by Category
            List<Map<String, Object>> categoryData = jdbc.queryForList(
                    "SELECT c.name, COUNT(oi.id) as value " +
                    "FROM order_items oi INNER JOIN products p ON oi.product_id = p.id " +
                    "INNER JOIN categories c ON p.category_id = c.id " +
                    "GROUP BY c.id, c.name");
            result.put("categoryData", categoryData);

            // 6. Recent Reviews
            List<Map<String, Object>> recentReviews = jdbc.queryForList(
                    "SELECT r.rating, r.comment, c.name as customer, r.created_at as time " +
                    "FROM reviews r LEFT JOIN customers c ON r.customer_id = c.id " +
                    "ORDER BY r.created_at DESC LIMIT 5");
            result.put("recentReviews", recentReviews);

            // 7. Low Stock Alerts
            List<Map<String, Object>> lowStock = jdbc.queryForList(
                    "SELECT p.name as item, i.stock_quantity as current, i.low_stock_threshold as min, " +
                    "(i.stock_quantity <= i.low_stock_threshold) as critical " +
                    "FROM inventory i INNER JOIN products p ON i.product_id = p.id " +
                    "WHERE i.stock_quantity <= i.low_stock_threshold + 20 " +
                    "ORDER BY i.stock_quantity ASC LIMIT 5");
            result.put("lowStock", lowStock);

            cachedOverview = result;
            cacheExpiresAt = now + 5000; // 5 seconds cache
        } catch (Exception e) {
            result.put("totalRevenue", BigDecimal.ZERO);
            result.put("totalOrders", 0);
            result.put("totalProducts", 0);
            result.put("activeDrivers", 0);
            result.put("recentOrders", List.of());
            result.put("orders", List.of());
            result.put("chartData", List.of());
        }
        
        return result;
    }
}
