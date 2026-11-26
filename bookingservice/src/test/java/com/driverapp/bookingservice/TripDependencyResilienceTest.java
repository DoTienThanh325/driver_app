package com.driverapp.bookingservice.config;

import com.driverapp.bookingservice.client.DriverServiceClient;
import com.driverapp.bookingservice.exception.DependencyUnavailableException;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;

import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TripDependencyResilienceTest {

    private HttpServer server;
    private ExecutorService worker;
    private HttpClientConfig httpClientConfig;
    private SimpleMeterRegistry meters;
    private String baseUrl;

    private final AtomicInteger serverCalls = new AtomicInteger();
    private volatile int responseStatus = 200;
    private volatile long responseDelayMs = 0;
    private volatile String responseBody = "{}";

    @BeforeEach
    void setup() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        worker = Executors.newVirtualThreadPerTaskExecutor();
        server.setExecutor(worker);
        server.createContext("/", exchange -> {
            serverCalls.incrementAndGet();
            try {
                if (responseDelayMs > 0) {
                    Thread.sleep(responseDelayMs);
                }
                byte[] bytes = responseBody.getBytes();
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(responseStatus, bytes.length);
                exchange.getResponseBody().write(bytes);
            } catch (Exception ignored) {
            } finally {
                exchange.close();
            }
        });
        server.start();
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
        meters = new SimpleMeterRegistry();
    }

    @AfterEach
    void tearDown() {
        if (httpClientConfig != null) {
            httpClientConfig.close();
        }
        server.stop(0);
        worker.shutdownNow();
        meters.close();
    }

    // [TC-CB-03a] DriverService trả 503 liên tiếp -> Circuit Breaker mở mạch (503 ngay lập tức), sau openWait tự phục hồi qua Half-Open
    @Test
    void driverService503OpensCircuitAndProtectsAcceptTripFlowThenRecovers() throws Exception {
        var properties = new OutboundHttpProperties();
        var policy = new OutboundHttpProperties.Policy();
        policy.setWindow(2);
        policy.setMinimumCalls(2);
        policy.setRead(Duration.ofMillis(200));
        policy.setOpenWait(Duration.ofMillis(120));
        properties.getClients().put("driver", policy);

        httpClientConfig = new HttpClientConfig(properties, passThroughLoadBalancer(), meters);
        DriverServiceClient driverClient = new DriverServiceClient(httpClientConfig, baseUrl);
        UUID driverId = UUID.randomUUID();

        responseStatus = 503;
        for (int i = 0; i < 4; i++) {
            DependencyUnavailableException ex = assertThrows(DependencyUnavailableException.class,
                    () -> driverClient.checkDriverAvailable(driverId));
            assertEquals(503, ex.getStatusCode().value());
        }
        // Chỉ 2 call thật chạm tới driverservice, 2 call sau bị Circuit Breaker ngắt ngay
        assertEquals(2, serverCalls.get());

        // Chờ openWait để chuyển sang Half-Open và phục hồi khi driverservice trả 200
        Thread.sleep(160);
        responseStatus = 200;
        responseBody = "{\"driverId\":\"" + driverId + "\",\"status\":\"AVAILABLE\"}";
        for (int i = 0; i < 5; i++) {
            driverClient.checkDriverAvailable(driverId);
        }
        assertEquals(7, serverCalls.get());
    }

    // [TC-CB-03b] DriverService bị treo/chậm quá readTimeout -> cắt timeout nhanh và trả 504 GATEWAY_TIMEOUT
    @Test
    void driverServiceReadTimeoutBoundsAcceptTripWaitAndReturns504() throws Exception {
        var properties = new OutboundHttpProperties();
        var policy = new OutboundHttpProperties.Policy();
        policy.setRead(Duration.ofMillis(120));
        policy.setTotal(Duration.ofMillis(250));
        properties.getClients().put("driver", policy);

        httpClientConfig = new HttpClientConfig(properties, passThroughLoadBalancer(), meters);
        DriverServiceClient driverClient = new DriverServiceClient(httpClientConfig, baseUrl);

        responseStatus = 200;
        responseDelayMs = 800;

        long started = System.nanoTime();
        DependencyUnavailableException ex = assertThrows(DependencyUnavailableException.class,
                () -> driverClient.checkDriverAvailable(UUID.randomUUID()));

        assertEquals(504, ex.getStatusCode().value());
        assertTrue(Duration.ofNanos(System.nanoTime() - started).toMillis() < 600);
    }

    // [TC-CB-04] Quá số lượng request đồng thời (Bulkhead concurrency=1) -> từ chối ngay 503 mà không làm hỏng trạng thái Circuit Breaker
    @Test
    void bulkheadRejectsExcessConcurrentDriverChecksWith503WithoutTrippingCircuit() throws Exception {
        var properties = new OutboundHttpProperties();
        var policy = new OutboundHttpProperties.Policy();
        policy.setConcurrency(1);
        policy.setPoolWait(Duration.ofMillis(20));
        policy.setRead(Duration.ofSeconds(2));
        properties.getClients().put("driver", policy);

        httpClientConfig = new HttpClientConfig(properties, passThroughLoadBalancer(), meters);
        DriverServiceClient driverClient = new DriverServiceClient(httpClientConfig, baseUrl);
        UUID driverId = UUID.randomUUID();

        responseStatus = 200;
        responseDelayMs = 400;
        responseBody = "{\"driverId\":\"" + driverId + "\",\"status\":\"AVAILABLE\"}";

        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<?> inFlight = pool.submit(() -> driverClient.checkDriverAvailable(driverId));

            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
            while (serverCalls.get() == 0 && System.nanoTime() < deadline) {
                Thread.sleep(5);
            }
            assertEquals(1, serverCalls.get());

            DependencyUnavailableException rejected = assertThrows(DependencyUnavailableException.class,
                    () -> driverClient.checkDriverAvailable(driverId));
            assertEquals(503, rejected.getStatusCode().value());

            inFlight.get(3, TimeUnit.SECONDS);
            assertEquals(1, serverCalls.get());
            assertEquals(0, meters.get("resilience4j.circuitbreaker.calls")
                    .tag("name", "driver-read").tag("kind", "failed").timer().count());
        }
    }

    private LoadBalancerInterceptor passThroughLoadBalancer() {
        return new LoadBalancerInterceptor(null) {
            @Override
            public org.springframework.http.client.ClientHttpResponse intercept(
                    org.springframework.http.HttpRequest request,
                    byte[] body,
                    org.springframework.http.client.ClientHttpRequestExecution execution) throws java.io.IOException {
                return execution.execute(request, body);
            }
        };
    }
}
