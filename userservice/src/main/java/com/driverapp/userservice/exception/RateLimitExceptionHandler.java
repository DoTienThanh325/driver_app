package com.driverapp.userservice.exception;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class RateLimitExceptionHandler {
    @ExceptionHandler(QuotaExceededException.class)
    ResponseEntity<ProblemDetail> limited(QuotaExceededException ex) {
        return ResponseEntity.status(429).header("Retry-After", String.valueOf(ex.getRetryAfter()))
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage()));
    }
}
