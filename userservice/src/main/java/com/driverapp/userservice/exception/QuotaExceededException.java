package com.driverapp.userservice.exception;

public class QuotaExceededException extends RuntimeException {
    private final long retryAfter;
    public QuotaExceededException(long seconds) {
        super("Request limit exceeded");
        retryAfter = Math.max(1, seconds);
    }
    public long getRetryAfter() { return retryAfter; }
}
