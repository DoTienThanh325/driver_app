package com.driverapp.userservice.config.rabbitmq;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@SuppressWarnings({"deprecation", "removal"})
public class UserRabbitMQConfig {

    public static final String BUSINESS_DIRECT_EXCHANGE = "business.direct.exchange";
    public static final String DRIVER_DIRECT_EXCHANGE = "driver.direct.exchange";
    public static final String USER_DIRECT_EXCHANGE = "user.direct.exchange";
    public static final String SAGA_COMPENSATING_EXCHANGE = "saga.compensating.exchange";

    @Bean
    public DirectExchange businessDirectExchange() { return new DirectExchange(BUSINESS_DIRECT_EXCHANGE, true, false); }
    @Bean
    public DirectExchange driverDirectExchange() { return new DirectExchange(DRIVER_DIRECT_EXCHANGE, true, false); }
    @Bean
    public DirectExchange userDirectExchange() { return new DirectExchange(USER_DIRECT_EXCHANGE, true, false); }
    @Bean
    public DirectExchange compensatingExchange() { return new DirectExchange(SAGA_COMPENSATING_EXCHANGE, true, false); }

    // Business Role Queue & DLQ
    @Bean
    public Queue businessRoleQueue() {
        return QueueBuilder.durable("business.role-grant.queue")
                .withArgument("x-dead-letter-exchange", SAGA_COMPENSATING_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "business.role-grant.dlq")
                .build();
    }
    @Bean
    public Binding businessRoleBinding(Queue businessRoleQueue, DirectExchange businessDirectExchange) {
        return BindingBuilder.bind(businessRoleQueue).to(businessDirectExchange).with("business.reviewed");
    }
    @Bean
    public Queue businessRoleDlq() { return QueueBuilder.durable("business.role-grant.dlq").build(); }
    @Bean
    public Binding businessRoleDlqBinding(Queue businessRoleDlq, DirectExchange compensatingExchange) {
        return BindingBuilder.bind(businessRoleDlq).to(compensatingExchange).with("business.role-grant.dlq");
    }

    // Driver Role Queue & DLQ
    @Bean
    public Queue driverRoleQueue() {
        return QueueBuilder.durable("driver.role-grant.queue")
                .withArgument("x-dead-letter-exchange", SAGA_COMPENSATING_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", "driver.role-grant.dlq")
                .build();
    }
    @Bean
    public Binding driverRoleBinding(Queue driverRoleQueue, DirectExchange driverDirectExchange) {
        return BindingBuilder.bind(driverRoleQueue).to(driverDirectExchange).with("driver.approved");
    }
    @Bean
    public Queue driverRoleDlq() { return QueueBuilder.durable("driver.role-grant.dlq").build(); }
    @Bean
    public Binding driverRoleDlqBinding(Queue driverRoleDlq, DirectExchange compensatingExchange) {
        return BindingBuilder.bind(driverRoleDlq).to(compensatingExchange).with("driver.role-grant.dlq");
    }

    // SMS Queue
    @Bean
    public Queue smsOtpQueue() { return QueueBuilder.durable("user.sms-otp.queue").build(); }
    @Bean
    public Binding smsOtpBinding(Queue smsOtpQueue, DirectExchange userDirectExchange) {
        return BindingBuilder.bind(smsOtpQueue).to(userDirectExchange).with("sms.otp.send");
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
