package com.driverapp.driverservice.exception;

import com.driverapp.driverservice.controller.DriverVerificationController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = DriverVerificationController.class)
public class DriverVerificationExceptionHandler {

    @ExceptionHandler(UserServiceException.class)
    public ProblemDetail userServiceFailed(UserServiceException exception) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_GATEWAY);
        problem.setDetail(exception.getMessage());
        return problem;
    }
}