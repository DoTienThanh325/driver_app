package com.driverapp.apigateway.config;

import java.time.Duration;
import io.netty.channel.ChannelOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

@Configuration
public class JwtDecoderConfig {
    @Bean
    ReactiveJwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwks,
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuer,
            @Value("${resilience.jwks.connect-ms:500}") int connect,
            @Value("${resilience.jwks.read:1s}") Duration read) {
        var http = HttpClient.create().option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connect)
                .responseTimeout(read).disableRetry(true);
        var web = WebClient.builder().clientConnector(new ReactorClientHttpConnector(http)).build();
        var decoder = NimbusReactiveJwtDecoder.withJwkSetUri(jwks).webClient(web).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(issuer));
        return decoder;
    }
}
