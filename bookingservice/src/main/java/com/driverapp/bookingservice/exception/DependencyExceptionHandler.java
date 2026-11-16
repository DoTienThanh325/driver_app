package com.driverapp.bookingservice.exception;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientResponseException;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DependencyExceptionHandler {
    @ExceptionHandler(DependencyUnavailableException.class)
    public ResponseEntity<ProblemDetail> unavailable(DependencyUnavailableException ex) {
        var body = ProblemDetail.forStatusAndDetail(ex.getStatusCode(), ex.getReason());
        return ResponseEntity.status(ex.getStatusCode()).body(body);
    }
    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<ProblemDetail> downstream(RestClientResponseException ex) {
        var status = ex.getStatusCode().is4xxClientError() ? ex.getStatusCode() : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(ProblemDetail.forStatusAndDetail(status, "Dependency rejected the request"));
    }
}
