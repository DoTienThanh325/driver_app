package com.driverapp.userservice.service;

public interface SmsSender {

    void sendOtp(String phoneNumber, String otp);
}