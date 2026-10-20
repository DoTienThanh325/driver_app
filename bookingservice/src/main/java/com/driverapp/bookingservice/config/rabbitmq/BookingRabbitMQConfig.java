package com.driverapp.bookingservice.config.rabbitmq;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@SuppressWarnings({"deprecation", "removal"})
public class BookingRabbitMQConfig {

    public static final String TRIP_TOPIC_EXCHANGE = "trip.topic.exchange";
    public static final String BUSINESS_DIRECT_EXCHANGE = "business.direct.exchange";
    public static final String SAGA_COMPENSATING_EXCHANGE = "saga.compensating.exchange";

    // Exchanges
    @Bean
    public TopicExchange tripTopicExchange() {
        return new TopicExchange(TRIP_TOPIC_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange businessDirectExchange() {
        return new DirectExchange(BUSINESS_DIRECT_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange compensatingExchange() {
        return new DirectExchange(SAGA_COMPENSATING_EXCHANGE, true, false);
    }

    // SAGA Compensating Queues & Bindings
    @Bean
    public Queue driverAvailabilityFailedQueue() {
        return QueueBuilder.durable("driver.availability-update.failed.queue").build();
    }

    @Bean
    public Binding driverAvailabilityFailedBinding(Queue driverAvailabilityFailedQueue, DirectExchange compensatingExchange) {
        return BindingBuilder.bind(driverAvailabilityFailedQueue).to(compensatingExchange).with("driver.availability.failed");
    }

    @Bean
    public Queue roleGrantBusinessFailedQueue() {
        return QueueBuilder.durable("role.grant.business.failed.queue").build();
    }

    @Bean
    public Binding roleGrantBusinessFailedBinding(Queue roleGrantBusinessFailedQueue, DirectExchange compensatingExchange) {
        return BindingBuilder.bind(roleGrantBusinessFailedQueue).to(compensatingExchange).with("role.grant.business.failed");
    }

    @Bean
    public Queue paymentCompleteFailedQueue() {
        return QueueBuilder.durable("payment.complete.failed.queue").build();
    }

    @Bean
    public Binding paymentCompleteFailedBinding(Queue paymentCompleteFailedQueue, DirectExchange compensatingExchange) {
        return BindingBuilder.bind(paymentCompleteFailedQueue).to(compensatingExchange).with("payment.complete.failed");
    }

    @Bean
    public Queue tripPaymentInitFailedQueue() {
        return QueueBuilder.durable("trip.payment-init.failed.queue").build();
    }

    @Bean
    public Binding tripPaymentInitFailedBinding(Queue tripPaymentInitFailedQueue, DirectExchange compensatingExchange) {
        return BindingBuilder.bind(tripPaymentInitFailedQueue).to(compensatingExchange).with("trip.payment-init.failed");
    }

    // Message Converter
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
