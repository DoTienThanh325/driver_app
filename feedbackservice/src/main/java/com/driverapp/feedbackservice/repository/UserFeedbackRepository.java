package com.driverapp.feedbackservice.repository;

import com.driverapp.feedbackservice.models.UserFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserFeedbackRepository extends JpaRepository<UserFeedback, UUID> {
}
