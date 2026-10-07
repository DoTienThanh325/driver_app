package com.driverapp.apigateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        JwtGrantedAuthoritiesConverter rolesConverter =
                new JwtGrantedAuthoritiesConverter();

        rolesConverter.setAuthoritiesClaimName("roles");
        rolesConverter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();

        jwtConverter.setJwtGrantedAuthoritiesConverter(rolesConverter);
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(Customizer.withDefaults())
                .authorizeExchange(exchange -> exchange
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .pathMatchers(
                                HttpMethod.POST,
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/verify-otp",
                                "/api/auth/refresh",
                                "/api/auth/logout"
                        ).permitAll()
                        .pathMatchers("/api/drivers/test").hasRole("CUSTOMER")
                        .pathMatchers("/api/drivers/register").hasRole("CUSTOMER")
                        .pathMatchers(HttpMethod.PATCH, "/api/drivers/registration").hasRole("CUSTOMER")
                        .pathMatchers("/api/bookings/foods", "/api/bookings/foods/**").hasRole("BUSINESS")
                        .pathMatchers("/api/bookings/restaurants", "/api/bookings/restaurants/**").hasRole("BUSINESS")
                        .pathMatchers(HttpMethod.PATCH, "/api/trips/status").hasRole("DRIVER")
                        .pathMatchers("/api/trips").hasAnyRole("CUSTOMER", "DRIVER")
                        .pathMatchers("/api/businesses/registration").hasRole("CUSTOMER")
                        .pathMatchers("/api/businesses/*/review").hasRole("ADMIN")
                        .pathMatchers("/api/drivers/*/verification-status").hasRole("ADMIN")
                        .pathMatchers("/api/drivers/candidates").hasRole("ADMIN")
                        .pathMatchers(HttpMethod.GET, "/api/drivers/{driverId}").hasAnyRole("ADMIN", "DRIVER", "CUSTOMER")
                        .anyExchange().authenticated()
                )
                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(jwt ->
                                jwt.jwtAuthenticationConverter(
                                        new ReactiveJwtAuthenticationConverterAdapter(jwtConverter)
                                )
                        )
                )
                .build();
    }
}
