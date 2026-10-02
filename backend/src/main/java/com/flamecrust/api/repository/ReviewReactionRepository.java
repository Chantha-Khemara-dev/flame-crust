package com.flamecrust.api.repository;

import com.flamecrust.api.model.ReviewReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewReactionRepository extends JpaRepository<ReviewReaction, Long> {
    List<ReviewReaction> findByReviewId(Long reviewId);
    Optional<ReviewReaction> findByReviewIdAndEmojiAndUserIdentifier(Long reviewId, String emoji, String userIdentifier);
    void deleteByReviewIdAndEmojiAndUserIdentifier(Long reviewId, String emoji, String userIdentifier);
}
