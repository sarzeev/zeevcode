package com.project.zeevCode.repository;

import com.project.zeevCode.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);

    boolean existsByRazorpayOrderIdAndStatus(String razorpayOrderId, Payment.Status status);

    boolean existsByRazorpayPaymentId(String razorpayPaymentId);
}
