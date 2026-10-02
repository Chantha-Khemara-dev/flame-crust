package com.flamecrust.api.repository;

import com.flamecrust.api.model.IngredientStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IngredientStockRepository extends JpaRepository<IngredientStock, Long> {
}
