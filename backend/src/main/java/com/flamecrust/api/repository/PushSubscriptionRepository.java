package com.flamecrust.api.repository;

import com.flamecrust.api.model.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    Optional<PushSubscription> findByEndpoint(String endpoint);

    List<PushSubscription> findByUserIdAndUserType(Long userId, String userType);

    List<PushSubscription> findByUserType(String userType);

    void deleteByEndpoint(String endpoint);
}
