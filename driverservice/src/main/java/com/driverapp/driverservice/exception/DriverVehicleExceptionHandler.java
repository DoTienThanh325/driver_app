package com.driverapp.driverservice.exception;

import com.driverapp.driverservice.controller.DriverVehicleController;
import com.driverapp.driverservice.storage.ObjectStorageException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// Scoped riêng cho DriverVehicleController, đúng pattern hiện có trong project
@RestControllerAdvice(assignableTypes = DriverVehicleController.class)
public class DriverVehicleExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail handleDuplicate(DataIntegrityViolationException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.CONFLICT);
        problem.setDetail("Vehicle data conflicts with existing records.");
        return problem;
    }

    @ExceptionHandler(ObjectStorageException.class)
    public ProblemDetail handleStorageFailed(ObjectStorageException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_GATEWAY);
        problem.setDetail(ex.getMessage());
        return problem;
    }
}