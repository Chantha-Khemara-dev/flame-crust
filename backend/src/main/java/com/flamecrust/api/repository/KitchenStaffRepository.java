package com.flamecrust.api.repository;

import com.flamecrust.api.model.KitchenStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KitchenStaffRepository extends JpaRepository<KitchenStaff, Long> {
}
