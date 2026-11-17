package com.driverapp.userservice;

import com.driverapp.userservice.config.OtpProperties;
import com.driverapp.userservice.exception.QuotaExceededException;
import com.driverapp.userservice.service.AuthRateLimitService;
import com.driverapp.userservice.service.impl.OtpChallengeServiceImpl;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OtpResilienceTest {
    @Test void validatesSignatureBeforeUsingSubjectOrCountingChallengeAttempts() {
        var quotas = mock(AuthRateLimitService.class);
        var service = service(quotas);
        assertThrows(ResponseStatusException.class, () -> service.validatedUserId("forged.token"));
        verifyNoInteractions(quotas);
    }
    @Test void quotaErrorIsNotRewrittenToInvalidOtp() {
        var quotas = mock(AuthRateLimitService.class);
        var service = service(quotas);
        var challenge = service.create(UUID.randomUUID());
        doThrow(new QuotaExceededException(60)).when(quotas).check(eq("verify"), anyString());
        assertThrows(QuotaExceededException.class, () -> service.verify(challenge.challengeToken(), challenge.otp()));
        verify(quotas, never()).consumeChallenge(anyString(), anyInt());
    }
    @Test void validChallengeIsConsumedOnlyAfterCorrectOtp() {
        var quotas = mock(AuthRateLimitService.class);
        var service = service(quotas);
        UUID user = UUID.randomUUID();
        var challenge = service.create(user);
        assertEquals(user, service.validatedUserId(challenge.challengeToken()));
        assertThrows(ResponseStatusException.class, () -> service.verify(challenge.challengeToken(), "wrong"));
        verify(quotas, never()).consumeChallenge(anyString(), anyInt());
        assertEquals(user, service.verify(challenge.challengeToken(), challenge.otp()));
        verify(quotas).consumeChallenge(eq(challenge.challengeToken()), anyInt());
    }
    private OtpChallengeServiceImpl service(AuthRateLimitService quotas) {
        var p = new OtpProperties(); p.setExpiresMinutes(5); p.setChallengeSecret("test-secret-not-for-production");
        return new OtpChallengeServiceImpl(p, quotas);
    }
}
