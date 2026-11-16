package com.driverapp.feedbackservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class DependencyUnavailableException extends ResponseStatusException {
    public DependencyUnavailableException(boolean timeout, Throwable cause) {
        super(timeout ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.SERVICE_UNAVAILABLE,
                timeout ? "Dependency timed out; check operation status before retrying" : "Dependency unavailable", cause);
    }
}
