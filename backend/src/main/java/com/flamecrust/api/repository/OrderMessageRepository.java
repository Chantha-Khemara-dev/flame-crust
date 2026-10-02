package com.flamecrust.api.repository;

import com.flamecrust.api.model.OrderMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrderMessageRepository extends JpaRepository<OrderMessage, Long> {
    List<OrderMessage> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}
