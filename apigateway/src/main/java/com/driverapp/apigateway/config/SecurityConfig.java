package com.driverapp.apigateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {

        @Bean
        CorsConfigurationSource corsConfigurationSource(
                        @Value("${ADMIN_FE_ORIGIN:http://localhost:5173}") String allowedOrigins) {
                CorsConfiguration config = new CorsConfiguration();
                config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                                .map(String::trim)
                                .filter(s -> !s.isEmpty())
                                .toList());
                config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
                config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
                config.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", config);
                return source;
        }

        @Bean
        SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
                JwtGrantedAuthoritiesConverter rolesConverter = new JwtGrantedAuthoritiesConverter();

                rolesConverter.setAuthoritiesClaimName("roles");
                rolesConverter.setAuthorityPrefix("ROLE_");

                JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();

                jwtConverter.setJwtGrantedAuthoritiesConverter(rolesConverter);
                return http
                                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                                .cors(Customizer.withDefaults())
                                .authorizeExchange(exchange -> exchange
                                                .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                                .pathMatchers(HttpMethod.GET, "/.well-known/jwks.json").permitAll()
                                                .pathMatchers("/ws/notifications/**").permitAll()
                                                .pathMatchers(
                                                                HttpMethod.POST,
                                                                "/api/auth/register",
                                                                "/api/auth/login",
                                                                "/api/auth/verify-otp",
                                                                "/api/auth/refresh",
                                                                "/api/auth/logout",
                                "/api/auth/resend-otp", "/api/v1/auth/resend-otp")
                                                .permitAll()
                                                .pathMatchers("/api/drivers/test").hasRole("CUSTOMER")
                                                .pathMatchers("/api/drivers/register").hasRole("CUSTOMER")
                                                .pathMatchers(HttpMethod.PATCH, "/api/drivers/registration")
                                                .hasAnyRole("CUSTOMER", "DRIVER")
                                                .pathMatchers(HttpMethod.POST, "/api/vehicles", "/api/vehicles/**")
                                                .hasAnyRole("CUSTOMER", "DRIVER")
                                                .pathMatchers(HttpMethod.GET, "/api/bookings/foods", "/api/bookings/foods/**")
                                                .permitAll()
                                                .pathMatchers("/api/bookings/foods", "/api/bookings/foods/**")
                                                .hasRole("BUSINESS")
                                                .pathMatchers("/api/bookings/restaurants",
                                                                "/api/bookings/restaurants/**")
                                                .hasRole("BUSINESS")
                                                .pathMatchers(HttpMethod.PATCH, "/api/trips/status").hasRole("DRIVER")
                                                .pathMatchers(HttpMethod.PATCH, "/api/trips/{tripId}/cancel")
                                                .hasAnyRole("CUSTOMER", "DRIVER")
                                                .pathMatchers(HttpMethod.GET, "/api/trips/driver/current").hasRole("DRIVER")
                                                .pathMatchers(HttpMethod.GET, "/api/trips/*/counterparty")
                                                .hasAnyRole("CUSTOMER", "DRIVER")
                                                .pathMatchers("/api/trips").hasAnyRole("CUSTOMER", "DRIVER")
                                                .pathMatchers(HttpMethod.GET,
                                                                "/api/businesses/registration/user/*",
                                                                "/api/businesses/registration/me",
                                                                "/api/businesses/registration/**",
                                                                "/api/businesses/me")
                                                .hasAnyRole("CUSTOMER", "BUSINESS", "ADMIN")
                                                .pathMatchers(HttpMethod.POST, "/api/businesses/registration").hasRole("CUSTOMER")
                                                .pathMatchers(HttpMethod.GET, "/api/businesses").hasRole("ADMIN")
                                                .pathMatchers(HttpMethod.PATCH, "/api/businesses/*/status").hasRole("ADMIN")
                                                .pathMatchers("/api/businesses/*/review").hasRole("ADMIN")
                                                .pathMatchers("/api/drivers/*/verification-status").hasRole("ADMIN")
                                                .pathMatchers("/api/drivers/candidates").hasRole("ADMIN")
                                                .pathMatchers(HttpMethod.GET, "/api/drivers/{driverId}")
                                                .hasAnyRole("ADMIN", "DRIVER", "CUSTOMER")
                                                .pathMatchers(HttpMethod.GET, "/api/drivers/*/location")
                                                .hasAnyRole("ADMIN", "DRIVER", "CUSTOMER")
                                                .pathMatchers(HttpMethod.POST, "/api/vouchers/claim")
                                                .hasRole("CUSTOMER")
                                                .pathMatchers(HttpMethod.POST, "/api/vouchers", "/api/vouchers/**")
                                                .hasAnyRole("ADMIN", "BUSINESS")
                                                .pathMatchers(HttpMethod.GET, "/api/vouchers/app").hasRole("CUSTOMER")
                                                .pathMatchers(HttpMethod.GET, "/api/vouchers/admin/**").hasRole("ADMIN")
                                                .pathMatchers(HttpMethod.GET, "/api/vouchers/restaurants/*")
                                                .hasAnyRole("CUSTOMER", "BUSINESS")
                                                .pathMatchers(HttpMethod.POST, "/api/payments/trip").hasRole("CUSTOMER")
                                                .pathMatchers(HttpMethod.PATCH, "/api/payments/trip/*/confirm").hasRole("DRIVER")
                                                .pathMatchers(HttpMethod.POST, "/api/payments/driver-payment-info").hasRole("DRIVER")
                                                .pathMatchers(HttpMethod.PATCH, "/api/payments/driver-payment-info").hasRole("DRIVER")
                                                .pathMatchers(HttpMethod.GET, "/api/payments/driver-payment-info").hasRole("DRIVER")
                                                .pathMatchers(HttpMethod.PUT, "/api/payments/driver-payment-info").hasRole("DRIVER")
                                                .pathMatchers(HttpMethod.POST, "/api/feedbacks", "/api/feedbacks/**").hasRole("CUSTOMER")
                                                .pathMatchers(HttpMethod.GET, "/api/feedbacks/**").hasAnyRole("CUSTOMER", "DRIVER")
                                                .pathMatchers(HttpMethod.GET, "/api/complaints", "/api/complaints/*").hasRole("ADMIN")
                                                .pathMatchers(HttpMethod.PATCH, "/api/complaints/*/status").hasRole("ADMIN")
                                                .pathMatchers(HttpMethod.POST, "/api/complaints", "/api/complaints/**").hasAnyRole("CUSTOMER", "DRIVER")
                                                .pathMatchers("/api/admin/**").hasRole("ADMIN")
                                                .pathMatchers("/api/bookings/foods/search/**").hasAnyRole("CUSTOMER", "BUSINESS")
                                                .anyExchange().authenticated())



                                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(
                                                new ReactiveJwtAuthenticationConverterAdapter(jwtConverter))))
                                .build();
        }
}
