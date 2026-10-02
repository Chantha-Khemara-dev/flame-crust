package com.flamecrust.api.repository;

import com.flamecrust.api.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    java.util.List<Category> findByActiveTrueOrderBySortOrderAsc();
}
