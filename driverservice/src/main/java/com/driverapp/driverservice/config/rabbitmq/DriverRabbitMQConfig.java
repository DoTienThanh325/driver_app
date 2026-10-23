package com.driverapp.driverservice.config.rabbitmq;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DriverRabbitMQConfig {

    public static final String TRIP_TOPIC_EXCHANGE = "trip.topic.exchange";
    public static final String DRIVER_DIRECT_EXCHANGE = "driver.direct.exchange";
    public static final String FEEDBACK_DIRECT_EXCHANGE = "feedback.direct.exchange";
    public static final String SAGA_COMPENSATING_EXCHANGE = "saga.compensating.exchange";

    // Exchanges
    @Bean
    public TopicExchange tripTopicExchange() {
        return new TopicExchange(TRIP_TOPIC_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange driverDirectExchange() {
        return new DirectExchange(DRIVER_DIRECT_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange feedbackDirectExchange() {
        return new DirectExchange(FEEDBACK_DIRECT_EXCHANGE, true, false);
    }

    @Bean
    public DirectExchange compensatingExchange() {
        return new DirectExchange(SAGA_COMPENSATING_EXCHANGE, true, false);
    }

    // Availability Queue with DLQ
    @Bean
    public Queue driverAvailabilityQueue() {
        return QueueBuilder.durable("driver.availability-update.queue")
                .withArgument("x-dead-letter-exchange", SAGA_COMPENSATING_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "driver.availability.dlq")
                .build();
    }

    @Bean
    public Binding driverAvailabilityBinding(Queue driverAvailabilityQueue, TopicExchange tripTopicExchange) {
        return BindingBuilder.bind(driverAvailabilityQueue).to(tripTopicExchange).with("trip.*");
    }

    // SAGA DLQ Queue for Availability failure
    @Bean
    public Queue driverAvailabilityDlq() {
        return QueueBuilder.durable("driver.availability-update.dlq").build();
    }

    @Bean
    public Binding driverAvailabilityDlqBinding(Queue driverAvailabilityDlq, DirectExchange compensatingExchange) {
        return BindingBuilder.bind(driverAvailabilityDlq).to(compensatingExchange).with("driver.availability.dlq");
    }

    // SAGA Rollback Queue: Nhận tin báo lỗi cấp role từ UserService
    @Bean
    public Queue roleGrantDriverFailedQueue() {
        return QueueBuilder.durable("role.grant.driver.failed.queue").build();
    }

    @Bean
    public Binding roleGrantDriverFailedBinding(Queue roleGrantDriverFailedQueue, DirectExchange compensatingExchange) {
        return BindingBuilder.bind(roleGrantDriverFailedQueue).to(compensatingExchange).with("role.grant.driver.failed");
    }

    // Feedback Rating Update Queue
    @Bean
    public Queue feedbackRatingQueue() {
        return QueueBuilder.durable("feedback.rating-update.queue").build();
    }

    @Bean
    public Binding feedbackRatingBinding(Queue feedbackRatingQueue, DirectExchange feedbackDirectExchange) {
        return BindingBuilder.bind(feedbackRatingQueue).to(feedbackDirectExchange).with("feedback.submitted");
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
