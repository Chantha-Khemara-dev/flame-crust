package com.flamecrust.api.repository;

import com.flamecrust.api.model.Branche;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BrancheRepository extends JpaRepository<Branche, Long> {
}
