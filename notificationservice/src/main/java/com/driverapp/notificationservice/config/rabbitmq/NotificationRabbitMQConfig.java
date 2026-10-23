package com.driverapp.notificationservice.config.rabbitmq;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class NotificationRabbitMQConfig {

    public static final String TRIP_TOPIC_EXCHANGE = "trip.topic.exchange";

    @Bean
    public TopicExchange tripTopicExchange() {
        return new TopicExchange(TRIP_TOPIC_EXCHANGE, true, false);
    }

    @Bean
    public Queue tripNotificationQueue() {
        return QueueBuilder.durable("trip.notification.queue").build();
    }

    @Bean
    public Binding tripNotificationBinding(Queue tripNotificationQueue, TopicExchange tripTopicExchange) {
        return BindingBuilder.bind(tripNotificationQueue).to(tripTopicExchange).with("trip.*");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new JacksonJsonMessageConverter("com.driverapp.*");
    }
}
