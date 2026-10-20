package com.driverapp.driverservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@org.springframework.scheduling.annotation.EnableScheduling
@SpringBootApplication
public class DriverserviceApplication {

	public static void main(String[] args) {
		SpringApplication.run(DriverserviceApplication.class, args);
	}

}
