package com.flamecrust.api.repository;

import com.flamecrust.api.model.ProductRecipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRecipeRepository extends JpaRepository<ProductRecipe, Long> {
}
