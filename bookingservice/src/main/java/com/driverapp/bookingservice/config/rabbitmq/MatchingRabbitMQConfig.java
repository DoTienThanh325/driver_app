package com.driverapp.bookingservice.config.rabbitmq;

import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Configuration
public class MatchingRabbitMQConfig {

    public static final String MATCHING_DIRECT_EXCHANGE = "matching.direct.exchange";
    public static final String TRIP_MATCHING_QUEUE = "trip.matching.queue";

    public static final String MATCHING_OFFER_DELAY_QUEUE = "matching.offer.delay.queue";
    public static final String MATCHING_OFFER_DELAY_ROUTING_KEY = "matching.offer.delay";

    public static final String MATCHING_OFFER_TIMEOUT_QUEUE = "matching.offer.timeout.queue";
    public static final String MATCHING_OFFER_TIMEOUT_ROUTING_KEY = "matching.offer.timeout";

    public static final int OFFER_DELAY_TTL_MS = 25000; // 25 giây cho tài xế xem và nhận cuốc

    @Bean
    public DirectExchange matchingDirectExchange() {
        return new DirectExchange(MATCHING_DIRECT_EXCHANGE, true, false);
    }

    // 1. Queue nhận sự kiện trip.created để bắt đầu matching
    @Bean
    public Queue tripMatchingQueue() {
        return QueueBuilder.durable(TRIP_MATCHING_QUEUE).build();
    }

    @Bean
    public Binding tripMatchingBinding(Queue tripMatchingQueue, TopicExchange tripTopicExchange) {
        return BindingBuilder.bind(tripMatchingQueue)
                .to(tripTopicExchange)
                .with("trip.created");
    }

    // 2. Queue Delay 25 giây (TTL = 25000ms + DLX → tự động đẩy sang timeout queue)
    @Bean
    public Queue matchingOfferDelayQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-message-ttl", OFFER_DELAY_TTL_MS);
        args.put("x-dead-letter-exchange", MATCHING_DIRECT_EXCHANGE);
        args.put("x-dead-letter-routing-key", MATCHING_OFFER_TIMEOUT_ROUTING_KEY);
        return QueueBuilder.durable(MATCHING_OFFER_DELAY_QUEUE)
                .withArguments(args)
                .build();
    }

    @Bean
    public Binding matchingOfferDelayBinding(Queue matchingOfferDelayQueue, DirectExchange matchingDirectExchange) {
        return BindingBuilder.bind(matchingOfferDelayQueue)
                .to(matchingDirectExchange)
                .with(MATCHING_OFFER_DELAY_ROUTING_KEY);
    }

    // 3. Queue Timeout — nhận message sau khi hết TTL 25 giây (Dead Letter Queue)
    @Bean
    public Queue matchingOfferTimeoutQueue() {
        return QueueBuilder.durable(MATCHING_OFFER_TIMEOUT_QUEUE).build();
    }

    @Bean
    public Binding matchingOfferTimeoutBinding(Queue matchingOfferTimeoutQueue, DirectExchange matchingDirectExchange) {
        return BindingBuilder.bind(matchingOfferTimeoutQueue)
                .to(matchingDirectExchange)
                .with(MATCHING_OFFER_TIMEOUT_ROUTING_KEY);
    }
    @Bean
    public RabbitAdmin rabbitAdmin(ConnectionFactory connectionFactory) {
        RabbitAdmin admin = new RabbitAdmin(connectionFactory);
        admin.setIgnoreDeclarationExceptions(true);
        return admin;
    }

    @Bean
    public ApplicationRunner recreateDelayQueueIfTtlMismatch(RabbitAdmin rabbitAdmin) {
        return args -> {
            try {
                // Xóa queue delay cũ (nếu có TTL 12s) để RabbitMQ tái khởi tạo sạch sẽ với TTL 25s
                rabbitAdmin.deleteQueue(MATCHING_OFFER_DELAY_QUEUE);
                rabbitAdmin.declareQueue(matchingOfferDelayQueue());
                rabbitAdmin.declareBinding(matchingOfferDelayBinding(matchingOfferDelayQueue(), matchingDirectExchange()));
                log.info("[RabbitMQ] Đã thiết lập matching.offer.delay.queue với TTL 25s thành công.");
            } catch (Exception e) {
                log.warn("[RabbitMQ] Khởi tạo delay queue: {}", e.getMessage());
            }
        };
    }

    @Bean
    public Declarables matchingRoundTopology() {
        var exchange = new DirectExchange("matching.round.exchange", true, false);
        var work = QueueBuilder.durable("matching.round.queue").build();
        var delay = QueueBuilder.durable("matching.round.delay.queue")
                .ttl(5000).deadLetterExchange("matching.round.exchange").deadLetterRoutingKey("round").build();
        return new Declarables(exchange, work, delay,
                BindingBuilder.bind(work).to(exchange).with("round"),
                BindingBuilder.bind(delay).to(exchange).with("delay"));
    }
}
