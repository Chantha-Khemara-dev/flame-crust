package com.flamecrust.api.repository;

import com.flamecrust.api.model.PaymentAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentAttemptRepository extends JpaRepository<PaymentAttempt, Long> {
}
