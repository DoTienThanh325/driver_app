package com.driverapp.userservice;

import com.driverapp.userservice.config.JwtProperties;
import com.driverapp.userservice.config.OtpProperties;
import com.driverapp.userservice.config.TwilioSmsProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({
		JwtProperties.class,
		OtpProperties.class,
		TwilioSmsProperties.class
})
public class UserserviceApplication {

	public static void main(String[] args) {
		SpringApplication.run(UserserviceApplication.class, args);
	}

}
