package com.driverapp.driverservice.exception;

import com.driverapp.driverservice.controller.DriverRegistrationController;
import com.driverapp.driverservice.storage.ObjectStorageException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = DriverRegistrationController.class)
public class DriverRegistrationExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail duplicateRegistration(
            DataIntegrityViolationException exception) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.CONFLICT);

        problem.setDetail(
                "Driver registration conflicts with existing data");
        return problem;
    }

    @ExceptionHandler(ObjectStorageException.class)
    public ProblemDetail storageFailed(
            ObjectStorageException exception) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_GATEWAY);

        problem.setDetail(exception.getMessage());
        return problem;
    }
}