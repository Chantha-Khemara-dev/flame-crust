package com.flamecrust.api.repository;

import com.flamecrust.api.model.BranchStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BranchStaffRepository extends JpaRepository<BranchStaff, Long> {
}
