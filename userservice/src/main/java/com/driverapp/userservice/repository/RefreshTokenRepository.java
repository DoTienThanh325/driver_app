package com.driverapp.userservice.repository;

import com.driverapp.userservice.models.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT token
           FROM RefreshToken token
           WHERE token.refreshToken = :hash
           """)
    Optional<RefreshToken> findByHashForUpdate(
            @Param("hash") String hash
    );
}