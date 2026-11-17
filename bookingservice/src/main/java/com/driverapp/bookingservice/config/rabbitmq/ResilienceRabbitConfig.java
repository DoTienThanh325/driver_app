package com.driverapp.bookingservice.config.rabbitmq;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.*;
import org.springframework.amqp.rabbit.connection.*;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.retry.RepublishMessageRecovererWithConfirms;
import org.springframework.boot.amqp.autoconfigure.SimpleRabbitListenerContainerFactoryConfigurer;
import org.springframework.context.annotation.*;

@Configuration
public class ResilienceRabbitConfig {
    @Bean
    Declarables resilienceParkingTopology() {
        var exchange = new DirectExchange("bookingservice.resilience.failure.exchange", true, false);
        var queue = QueueBuilder.durable("bookingservice.resilience.failure.queue").build();
        return new Declarables(exchange, queue, BindingBuilder.bind(queue).to(exchange).with("failed"));
    }
    @Bean
    SimpleRabbitListenerContainerFactory resilienceRabbitListenerContainerFactory(
            SimpleRabbitListenerContainerFactoryConfigurer configurer, ConnectionFactory connectionFactory,
            RabbitTemplate rabbitTemplate) {
        var factory = new SimpleRabbitListenerContainerFactory();
        configurer.configure(factory, connectionFactory);
        rabbitTemplate.setMandatory(true);
        var recoverer = new RepublishMessageRecovererWithConfirms(rabbitTemplate,
                "bookingservice.resilience.failure.exchange", "failed", CachingConnectionFactory.ConfirmType.CORRELATED);
        recoverer.setConfirmTimeout(2000);
        factory.setAdviceChain(RetryInterceptorBuilder.stateless().maxRetries(3)
                .backOffOptions(2000, 2.0, 10000).recoverer(recoverer).build());
        factory.setPrefetchCount(10);
        return factory;
    }
}
