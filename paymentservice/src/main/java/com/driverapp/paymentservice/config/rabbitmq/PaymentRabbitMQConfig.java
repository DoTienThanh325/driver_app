package com.driverapp.paymentservice.config.rabbitmq;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PaymentRabbitMQConfig {

    public static final String TRIP_TOPIC_EXCHANGE = "trip.topic.exchange";
    public static final String SAGA_COMPENSATING_EXCHANGE = "saga.compensating.exchange";

    @Bean
    public TopicExchange tripTopicExchange() {
        return new TopicExchange(TRIP_TOPIC_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange compensatingExchange() {
        return new DirectExchange(SAGA_COMPENSATING_EXCHANGE, true, false);
    }

    // ── 1. Queue nhận sự kiện trip.created để khởi tạo PAY_DIRECTLY (gắn DLQ) ──
    @Bean
    public Queue tripPaymentInitQueue() {
        return QueueBuilder.durable("trip.payment-init.queue")
                .withArgument("x-dead-letter-exchange", SAGA_COMPENSATING_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "trip.payment-init.dlq")
                .build();
    }

    @Bean
    public Binding tripPaymentInitBinding(Queue tripPaymentInitQueue, TopicExchange tripTopicExchange) {
        return BindingBuilder.bind(tripPaymentInitQueue).to(tripTopicExchange).with("trip.created");
    }

    // DLQ khi tạo thanh toán thất bại
    @Bean
    public Queue tripPaymentInitDlq() {
        return QueueBuilder.durable("trip.payment-init.dlq").build();
    }

    @Bean
    public Binding tripPaymentInitDlqBinding(Queue tripPaymentInitDlq, DirectExchange compensatingExchange) {
        return BindingBuilder.bind(tripPaymentInitDlq).to(compensatingExchange).with("trip.payment-init.dlq");
    }

    // ── 2. Queue nhận sự kiện trip.driver-assigned để gán driverId vào TripPayment ──
    @Bean
    public Queue tripDriverAssignedQueue() {
        return QueueBuilder.durable("trip.driver-assigned.queue").build();
    }

    @Bean
    public Binding tripDriverAssignedBinding(Queue tripDriverAssignedQueue, TopicExchange tripTopicExchange) {
        return BindingBuilder.bind(tripDriverAssignedQueue).to(tripTopicExchange).with("trip.driver-assigned");
    }

    // ── 3. Queue nhận sự kiện trip.completed để chốt PAY_DIRECTLY ──
    @Bean
    public Queue tripPaymentCompleteQueue() {
        return QueueBuilder.durable("trip.payment-complete.queue")
                .withArgument("x-dead-letter-exchange", SAGA_COMPENSATING_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "trip.payment-complete.dlq")
                .build();
    }

    @Bean
    public Binding tripPaymentCompleteBinding(Queue tripPaymentCompleteQueue, TopicExchange tripTopicExchange) {
        return BindingBuilder.bind(tripPaymentCompleteQueue).to(tripTopicExchange).with("trip.completed");
    }

    @Bean
    public Queue tripPaymentCompleteDlq() {
        return QueueBuilder.durable("trip.payment-complete.dlq").build();
    }

    @Bean
    public Binding tripPaymentCompleteDlqBinding(Queue tripPaymentCompleteDlq, DirectExchange compensatingExchange) {
        return BindingBuilder.bind(tripPaymentCompleteDlq).to(compensatingExchange).with("trip.payment-complete.dlq");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter("com.driverapp.*");
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}
