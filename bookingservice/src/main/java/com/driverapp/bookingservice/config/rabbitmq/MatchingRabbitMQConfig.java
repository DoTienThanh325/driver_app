package com.driverapp.bookingservice.config.rabbitmq;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class MatchingRabbitMQConfig {

    public static final String MATCHING_DIRECT_EXCHANGE = "matching.direct.exchange";
    public static final String TRIP_MATCHING_QUEUE = "trip.matching.queue";

    public static final String MATCHING_OFFER_DELAY_QUEUE = "matching.offer.delay.queue";
    public static final String MATCHING_OFFER_DELAY_ROUTING_KEY = "matching.offer.delay";

    public static final String MATCHING_OFFER_TIMEOUT_QUEUE = "matching.offer.timeout.queue";
    public static final String MATCHING_OFFER_TIMEOUT_ROUTING_KEY = "matching.offer.timeout";

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

    // 2. Queue Delay 12 giây (TTL = 12000ms + DLX → tự động đẩy sang timeout queue)
    @Bean
    public Queue matchingOfferDelayQueue() {
        Map<String, Object> args = new HashMap<>();
        args.put("x-message-ttl", 12000);
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

    // 3. Queue Timeout — nhận message sau khi hết TTL 12 giây (Dead Letter Queue)
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
}
