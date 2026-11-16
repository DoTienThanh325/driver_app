package com.driverapp.userservice.service;

public interface AuthRateLimitService {
    void check(String policy, String subject);
    void checkChallenge(String signedChallenge, int lifetimeSeconds);
    void consumeChallenge(String signedChallenge, int lifetimeSeconds);
}
