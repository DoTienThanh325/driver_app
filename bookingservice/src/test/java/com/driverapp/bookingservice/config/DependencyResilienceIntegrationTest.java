package com.driverapp.bookingservice.config;

import com.driverapp.bookingservice.client.AiMatchingClient;
import com.driverapp.bookingservice.client.DriverServiceClient;
import com.driverapp.bookingservice.exception.DependencyUnavailableException;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DependencyResilienceIntegrationTest {
    HttpServer server;
    HttpClientConfig clients;
    SimpleMeterRegistry meters;
    String base;
    final AtomicInteger calls = new AtomicInteger();
    volatile int status;
    volatile long delay;
    volatile boolean trickle;
    ExecutorService worker;

    @BeforeEach void setup() throws Exception {
        status = 503; delay = 0;
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        worker = Executors.newVirtualThreadPerTaskExecutor();
        server.setExecutor(worker);
        server.createContext("/", exchange -> {
            calls.incrementAndGet();
            try {
                Thread.sleep(delay);
                byte[] response = trickle ? new byte[100] : "[]".getBytes();
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(status, response.length);
                if (trickle) {
                    for (byte part : response) { exchange.getResponseBody().write(part); exchange.getResponseBody().flush(); Thread.sleep(30); }
                } else exchange.getResponseBody().write(response);
            } catch (Exception ignored) { } finally { exchange.close(); }
        });
        server.start();
        base = "http://127.0.0.1:" + server.getAddress().getPort();
        var properties = new OutboundHttpProperties();
        var policy = new OutboundHttpProperties.Policy();
        policy.setWindow(2); policy.setMinimumCalls(2); policy.setRead(Duration.ofMillis(100));
        policy.setOpenWait(Duration.ofMillis(100));
        properties.getClients().put("test", policy);
        meters = new SimpleMeterRegistry();
        clients = new HttpClientConfig(properties, mock(LoadBalancerInterceptor.class), meters);
    }
    @AfterEach void close() { clients.close(); server.stop(0); worker.shutdownNow(); meters.close(); }

    @Test void opensCircuitAndRecoversWithHalfOpenProbe() throws Exception {
        var http = clients.client("test", base, false);
        for (int i = 0; i < 4; i++) assertThrows(DependencyUnavailableException.class,
                () -> http.get().retrieve().toBodilessEntity());
        assertEquals(2, calls.get());
        Thread.sleep(150);
        status = 200;
        for (int i = 0; i < 5; i++) http.get().retrieve().toBodilessEntity();
        http.get().retrieve().toBodilessEntity();
        assertEquals(8, calls.get());
    }

    @Test void business4xxDoesNotOpenCircuitOrReturnSuccess() {
        status = 409;
        var http = clients.client("test", base, false);
        for (int i = 0; i < 5; i++) assertThrows(org.springframework.web.client.HttpClientErrorException.class,
                () -> http.get().retrieve().toBodilessEntity());
        assertEquals(5, calls.get());
        assertEquals(0, meters.get("resilience4j.circuitbreaker.calls").tag("name", "test-read").tag("kind", "failed").timer().count());
    }

    @Test void transportReadTimeoutIsBounded() {
        status = 200; delay = 700;
        var http = clients.client("test", base, false);
        long started = System.nanoTime();
        var error = assertThrows(DependencyUnavailableException.class, () -> http.get().retrieve().toBodilessEntity());
        assertEquals(504, error.getStatusCode().value());
        assertTrue(Duration.ofNanos(System.nanoTime() - started).toMillis() < 600);
    }

    @Test void totalDeadlineStopsSlowTricklingBodyEvenWhenReadTimeoutNeverExpires() {
        var p = new OutboundHttpProperties();
        var policy = new OutboundHttpProperties.Policy();
        policy.setRead(Duration.ofMillis(200)); policy.setTotal(Duration.ofMillis(300));
        p.getClients().put("trickle", policy);
        var factory = new HttpClientConfig(p, mock(LoadBalancerInterceptor.class), meters);
        status = 200; trickle = true;
        try {
            var http = factory.client("trickle", base, false);
            long start = System.nanoTime();
            var error = assertThrows(DependencyUnavailableException.class, () -> http.get().retrieve().toBodilessEntity());
            assertEquals(504, error.getStatusCode().value());
            assertTrue(Duration.ofNanos(System.nanoTime() - start).toMillis() < 900);
        } finally { factory.close(); }
    }

    @Test void bulkheadRejectsImmediatelyWithoutCountingDependencyFailure() throws Exception {
        var p = new OutboundHttpProperties();
        var policy = new OutboundHttpProperties.Policy(); policy.setConcurrency(1); policy.setRead(Duration.ofSeconds(2));
        p.getClients().put("limited", policy);
        var factory = new HttpClientConfig(p, mock(LoadBalancerInterceptor.class), meters);
        status = 200; delay = 500;
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var http = factory.client("limited", base, false);
            var first = executor.submit(() -> http.get().retrieve().toBodilessEntity());
            long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
            while (calls.get() == 0 && System.nanoTime() < until) Thread.sleep(5);
            assertEquals(1, calls.get());
            var error = assertThrows(DependencyUnavailableException.class, () -> http.get().retrieve().toBodilessEntity());
            assertEquals(503, error.getStatusCode().value());
            first.get(3, TimeUnit.SECONDS);
            assertEquals(1, calls.get());
            assertEquals(0, meters.get("resilience4j.circuitbreaker.calls").tag("name", "limited-read").tag("kind", "failed").timer().count());
        } finally { factory.close(); }
    }

    @Test void aiFallbackHappensAfterBreakerRecordsFailure() {
        var p = new OutboundHttpProperties();
        var policy = new OutboundHttpProperties.Policy(); policy.setWindow(2); policy.setMinimumCalls(2);
        p.getClients().put("ai-matching", policy);
        var factory = new HttpClientConfig(p, mock(LoadBalancerInterceptor.class), meters);
        try {
            var ai = new AiMatchingClient(factory, meters, base);
            for (int i = 0; i < 4; i++) assertTrue(ai.scoreCandidates(new com.driverapp.bookingservice.dto.ai.DriverScoringRequest("trip", 100.0, 10, 1, java.util.List.of())).isEmpty());
            assertEquals(2, calls.get());
            assertEquals(4, meters.get("dependency.fallback").tag("dependency", "ai-matching").counter().count());
        } finally { factory.close(); }
    }


    @Test void driverUnavailableIsNotEmptyNearbyOrSuccessfulAvailabilityUpdate() {
        var lb = mock(LoadBalancerInterceptor.class, CALLS_REAL_METHODS);
        try {
            doAnswer(call ->
                    ((org.springframework.http.client.ClientHttpRequestExecution)call.getArgument(2))
                            .execute(call.getArgument(0), call.getArgument(1))).when(lb).intercept(any(), any(), any());
            var factory = new HttpClientConfig(new OutboundHttpProperties(), lb, meters);
            try {
                var driver = new DriverServiceClient(factory, base);
                assertThrows(DependencyUnavailableException.class, () -> driver.getNearbyDrivers(21, 105, 3, null, 10));
                assertThrows(DependencyUnavailableException.class, () -> driver.updateDriverAvailability(UUID.randomUUID(), "AVAILABLE"));
                assertEquals(2, calls.get());
            } finally { factory.close(); }
        } catch (java.io.IOException ex) { throw new AssertionError(ex); }
    }
}
