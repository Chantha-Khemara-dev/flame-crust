package com.flamecrust.api.repository;

import com.flamecrust.api.model.DriverLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DriverLocationRepository extends JpaRepository<DriverLocation, Long> {
}
