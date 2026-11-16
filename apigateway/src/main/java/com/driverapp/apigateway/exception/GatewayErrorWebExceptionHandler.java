package com.driverapp.apigateway.exception;

import java.nio.charset.StandardCharsets;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.server.*;
import reactor.core.publisher.Mono;

@Component
@Order(-2)
public class GatewayErrorWebExceptionHandler implements WebExceptionHandler {
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        if (exchange.getResponse().isCommitted()) return Mono.error(ex);
        HttpStatusCode status = ex instanceof ResponseStatusException rse ? rse.getStatusCode() : HttpStatus.SERVICE_UNAVAILABLE;
        if (ex instanceof org.springframework.security.access.AccessDeniedException) status = HttpStatus.FORBIDDEN;
        String code = switch (status.value()) {
            case 429 -> "REQUEST_LIMIT_EXCEEDED";
            case 504 -> "DEPENDENCY_TIMEOUT";
            case 503 -> "SERVICE_UNAVAILABLE";
            default -> "REQUEST_FAILED";
        };
        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] body = ("{\"status\":" + status.value() + ",\"code\":\"" + code + "\"}").getBytes(StandardCharsets.UTF_8);
        return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(body)));
    }
}
