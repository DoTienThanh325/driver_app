package com.driverapp.paymentservice.config;

import com.driverapp.paymentservice.exception.DependencyUnavailableException;
import io.github.resilience4j.circuitbreaker.*;
import io.github.resilience4j.bulkhead.*;
import io.github.resilience4j.micrometer.tagged.TaggedCircuitBreakerMetrics;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PreDestroy;
import java.io.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cloud.client.loadbalancer.LoadBalancerInterceptor;
import org.springframework.http.*;
import org.springframework.http.client.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@EnableConfigurationProperties(OutboundHttpProperties.class)
public class HttpClientConfig {
    private final java.util.concurrent.ScheduledThreadPoolExecutor deadlines = deadlineScheduler();
    private static java.util.concurrent.ScheduledThreadPoolExecutor deadlineScheduler() {
        var scheduler = new java.util.concurrent.ScheduledThreadPoolExecutor(1, task -> {
            var thread = new Thread(task, "outbound-http-deadline"); thread.setDaemon(true); return thread;
        });
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }
    private final OutboundHttpProperties properties;
    private final LoadBalancerInterceptor loadBalancer;
    private final Map<String, RestClient> clients = new ConcurrentHashMap<>();
    private final List<CloseableHttpClient> transports = Collections.synchronizedList(new ArrayList<>());
    private final CircuitBreakerRegistry breakers = CircuitBreakerRegistry.ofDefaults();
    private final BulkheadRegistry bulkheads = BulkheadRegistry.ofDefaults();
    private final MeterRegistry meters;

    public HttpClientConfig(OutboundHttpProperties properties, LoadBalancerInterceptor loadBalancer, MeterRegistry meters) {
        properties.getClients().forEach((name, policy) -> {
            if (policy.getMinimumCalls() > policy.getWindow()) throw new IllegalArgumentException("minimum-calls exceeds window: " + name);
        });
        this.properties = properties;
        this.loadBalancer = loadBalancer;
        this.meters = meters;
        TaggedCircuitBreakerMetrics.ofCircuitBreakerRegistry(breakers).bindTo(meters);
    }

    public RestClient client(String name, String baseUrl, boolean balanced) {
        // All names and base URLs come from application configuration, never user input.
        return clients.computeIfAbsent(name, ignored -> create(name, baseUrl, balanced));
    }

    private RestClient create(String name, String baseUrl, boolean balanced) {
        var p = properties.policy(name);
        if (p.getMinimumCalls() > p.getWindow()) throw new IllegalArgumentException("minimum-calls exceeds window: " + name);
        var manager = PoolingHttpClientConnectionManagerBuilder.create()
                .setMaxConnTotal(p.getConcurrency()).setMaxConnPerRoute(p.getConcurrency())
                .setDefaultConnectionConfig(ConnectionConfig.custom()
                        .setConnectTimeout(Timeout.ofMilliseconds(p.getConnect().toMillis()))
                        .setSocketTimeout(Timeout.ofMilliseconds(p.getRead().toMillis())).build()).build();
        var transport = HttpClients.custom().setConnectionManager(manager)
                .addExecInterceptorFirst("total-deadline", (request, scope, chain) -> {
                    var expired = new java.util.concurrent.atomic.AtomicBoolean();
                    if (!(scope.originalRequest instanceof org.apache.hc.client5.http.classic.methods.HttpUriRequestBase cancellable))
                        throw new IOException("HTTP transport does not support cancellation");
                    var timer = deadlines.schedule(() -> { expired.set(true); cancellable.cancel(); },
                            p.getTotal().toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
                    try {
                        var response = chain.proceed(request, scope);
                        var entity = response.getEntity();
                        if (entity == null) timer.cancel(false);
                        else response.setEntity(new org.apache.hc.core5.http.io.entity.HttpEntityWrapper(entity) {
                            @Override public InputStream getContent() throws IOException {
                                return new FilterInputStream(super.getContent()) {
                                    @Override public int read(byte[] bytes, int offset, int length) throws IOException {
                                        if (expired.get()) throw deadlineFailure(null);
                                        try {
                                            int count = super.read(bytes, offset, length);
                                            if (expired.get()) throw deadlineFailure(null);
                                            return count;
                                        } catch (IOException error) {
                                            if (expired.get()) throw deadlineFailure(error);
                                            throw error;
                                        }
                                    }
                                    @Override public int read() throws IOException {
                                        byte[] one = new byte[1];
                                        return read(one, 0, 1) == -1 ? -1 : one[0] & 0xff;
                                    }
                                    @Override public void close() throws IOException { timer.cancel(false); super.close(); }
                                };
                            }
                            @Override public void close() throws IOException { timer.cancel(false); super.close(); }
                        });
                        return response;
                    } catch (IOException error) {
                        timer.cancel(false);
                        if (expired.get()) throw deadlineFailure(error);
                        throw error;
                    } catch (RuntimeException | org.apache.hc.core5.http.HttpException error) {
                        timer.cancel(false); throw error;
                    }
                })
                .setDefaultRequestConfig(RequestConfig.custom()
                        .setConnectionRequestTimeout(Timeout.ofMilliseconds(p.getPoolWait().toMillis()))
                        .setResponseTimeout(Timeout.ofMilliseconds(p.getRead().toMillis())).build())
                .disableAutomaticRetries().disableRedirectHandling().build();
        transports.add(transport);
        var builder = RestClient.builder().baseUrl(baseUrl)
                .requestFactory(new HttpComponentsClientHttpRequestFactory(transport));
        if (balanced) builder.requestInterceptor(loadBalancer);
        builder.requestInterceptor((request, body, execution) -> {
            String operation = name + (HttpMethod.GET.equals(request.getMethod()) ? "-read" : "-write");
            if (!properties.isEnabled()) return execution.execute(request, body);
            var breaker = breakers.circuitBreaker(operation, CircuitBreakerConfig.custom()
                    .slidingWindowSize(p.getWindow()).minimumNumberOfCalls(p.getMinimumCalls())
                    .failureRateThreshold(50).slowCallRateThreshold(60).slowCallDurationThreshold(p.getSlow())
                    .waitDurationInOpenState(p.getOpenWait()).permittedNumberOfCallsInHalfOpenState(5)
                    .maxWaitDurationInHalfOpenState(Duration.ofSeconds(10))
                    .ignoreException(ex -> ex instanceof IgnoredResponse).build());
            var bulkhead = bulkheads.bulkhead(operation, BulkheadConfig.custom()
                    .maxConcurrentCalls(p.getConcurrency()).maxWaitDuration(Duration.ZERO).build());
            try {
                return bulkhead.executeSupplier(() -> breaker.executeSupplier(() -> {
                    try {
                        // Buffer small JSON responses so socket/body failures are observed before fallback.
                        // Release the pooled connection on every outcome, including status errors.
                        try (var response = execution.execute(request, body)) {
                            if (response.getStatusCode().is5xxServerError()) {
                                throw new DependencyUnavailableException(false, null);
                            }
                            byte[] bytes = response.getBody().readNBytes(8 * 1024 * 1024 + 1);
                            if (bytes.length > 8 * 1024 * 1024) throw new IOException("Dependency response exceeds 8 MiB");
                            var buffered = new BufferedResponse(response.getStatusCode(), response.getStatusText(), response.getHeaders(), bytes);
                            if (response.getStatusCode().is4xxClientError()) throw new IgnoredResponse(buffered);
                            return buffered;
                        }
                    } catch (IOException ex) { throw new UncheckedIOException(ex); }
                }));
            } catch (IgnoredResponse ignored) {
                return ignored.response;
            } catch (CallNotPermittedException | BulkheadFullException ex) {
                meters.counter("dependency.rejected", "dependency", name).increment();
                throw new DependencyUnavailableException(false, ex);
            } catch (UncheckedIOException ex) {
                throw new DependencyUnavailableException(isTimeout(ex), ex);
            }
        });
        return builder.build();
    }

    private static java.net.SocketTimeoutException deadlineFailure(Throwable cause) {
        var error = new java.net.SocketTimeoutException("Total outbound HTTP deadline exceeded");
        if (cause != null) error.initCause(cause);
        return error;
    }

    private static boolean isTimeout(Throwable failure) {
        for (Throwable t = failure; t != null; t = t.getCause()) {
            if (t instanceof java.net.SocketTimeoutException || t instanceof java.util.concurrent.TimeoutException
                    || t.getClass().getSimpleName().contains("Timeout")) return true;
        }
        return false;
    }

    private static final class IgnoredResponse extends RuntimeException {
        final ClientHttpResponse response;
        IgnoredResponse(ClientHttpResponse response) { this.response = response; }
    }

    private record BufferedResponse(HttpStatusCode status, String text, HttpHeaders headers, byte[] bytes)
            implements ClientHttpResponse {
        public HttpStatusCode getStatusCode() { return status; }
        public String getStatusText() { return text; }
        public HttpHeaders getHeaders() { return headers; }
        public InputStream getBody() { return new ByteArrayInputStream(bytes); }
        public void close() { }
    }

    @PreDestroy
    void close() {
        deadlines.shutdownNow();
        transports.forEach(client -> { try { client.close(); } catch (IOException ignored) { } });
    }
}
