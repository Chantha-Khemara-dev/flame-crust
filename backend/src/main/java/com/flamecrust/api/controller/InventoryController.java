package com.flamecrust.api.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class InventoryController {

    @Autowired
    private JdbcTemplate jdbc;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName() != null) {
            String email = auth.getName();
            List<Map<String, Object>> users = jdbc.queryForList("SELECT id FROM users WHERE email = ? LIMIT 1", email);
            if (!users.isEmpty()) {
                return ((Number) users.get(0).get("id")).longValue();
            }
        }
        return null; // or throw exception
    }

    @PostMapping("/purchase")
    @Transactional
    public ResponseEntity<?> purchaseStock(@RequestBody Map<String, Object> payload) {
        try {
            Long ingredientId = Long.valueOf(payload.get("ingredient_id").toString());
            Long branchId = payload.containsKey("branch_id") ? Long.valueOf(payload.get("branch_id").toString()) : 1L;
            BigDecimal quantity = new BigDecimal(payload.get("quantity").toString());
            BigDecimal unitPrice = payload.containsKey("unit_price") ? new BigDecimal(payload.get("unit_price").toString()) : null;
            String note = payload.containsKey("note") ? payload.get("note").toString() : null;
            String referenceId = payload.containsKey("reference_id") ? payload.get("reference_id").toString() : null;

            Long userId = getCurrentUserId();

            // 1. Log transaction
            jdbc.update(
                "INSERT INTO inventory_transactions (ingredient_id, branch_id, transaction_type, quantity, unit_price, reference_id, note, created_by) VALUES (?, ?, 'PURCHASE_IN', ?, ?, ?, ?, ?)",
                ingredientId, branchId, quantity, unitPrice, referenceId, note, userId
            );

            // 2. Update stock
            int rowsUpdated = jdbc.update(
                "UPDATE ingredient_stock SET stock_quantity = stock_quantity + ? WHERE ingredient_id = ? AND branch_id = ?",
                quantity, ingredientId, branchId
            );

            if (rowsUpdated == 0) {
                // Insert if not exists
                jdbc.update(
                    "INSERT INTO ingredient_stock (ingredient_id, branch_id, stock_quantity, low_stock_threshold) VALUES (?, ?, ?, 0)",
                    ingredientId, branchId, quantity
                );
            }

            return ResponseEntity.ok(Map.of("message", "Purchase recorded and stock updated successfully."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/reports/summary")
    public ResponseEntity<?> getInventorySummary(@RequestParam(required = false) String startDate, @RequestParam(required = false) String endDate) {
        try {
            String sql = """
                SELECT 
                    i.id as ingredient_id, 
                    i.name as ingredient_name, 
                    i.unit,
                    COALESCE(s.stock_quantity, 0) as current_stock,
                    COALESCE(SUM(CASE WHEN t.transaction_type = 'PURCHASE_IN' THEN t.quantity ELSE 0 END), 0) as total_in,
                    COALESCE(SUM(CASE WHEN t.transaction_type = 'ORDER_USAGE' OR t.transaction_type = 'WASTE' THEN t.quantity ELSE 0 END), 0) as total_out,
                    COALESCE(SUM(CASE WHEN t.transaction_type = 'PURCHASE_IN' THEN (t.quantity * COALESCE(t.unit_price, 0)) ELSE 0 END), 0) as total_cost
                FROM ingredients i
                LEFT JOIN ingredient_stock s ON i.id = s.ingredient_id
                LEFT JOIN inventory_transactions t ON i.id = t.ingredient_id 
            """;
            
            // Add date filtering if provided
            if (startDate != null && endDate != null) {
                sql += " AND DATE(t.created_at) BETWEEN ? AND ? ";
                sql += " GROUP BY i.id, i.name, i.unit, s.stock_quantity";
                return ResponseEntity.ok(jdbc.queryForList(sql, startDate, endDate));
            } else {
                sql += " GROUP BY i.id, i.name, i.unit, s.stock_quantity";
                return ResponseEntity.ok(jdbc.queryForList(sql));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
