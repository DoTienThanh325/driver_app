package com.driverapp.bookingservice.config.rabbitmq;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BookingFeedbackRabbitMQConfig {

    public static final String FEEDBACK_DIRECT_EXCHANGE = "feedback.direct.exchange";
    public static final String RESTAURANT_RATING_QUEUE = "restaurant.rating-update.queue";
    public static final String FOOD_RATING_QUEUE = "food.rating-update.queue";

    public static final String ROUTING_KEY_RESTAURANT = "feedback.rating.restaurant";
    public static final String ROUTING_KEY_FOOD = "feedback.rating.food";

    @Bean
    public DirectExchange feedbackDirectExchange() {
        return new DirectExchange(FEEDBACK_DIRECT_EXCHANGE, true, false);
    }

    @Bean
    public Queue restaurantRatingQueue() {
        return QueueBuilder.durable(RESTAURANT_RATING_QUEUE).build();
    }

    @Bean
    public Binding restaurantRatingBinding(Queue restaurantRatingQueue, DirectExchange feedbackDirectExchange) {
        return BindingBuilder.bind(restaurantRatingQueue).to(feedbackDirectExchange).with(ROUTING_KEY_RESTAURANT);
    }

    @Bean
    public Queue foodRatingQueue() {
        return QueueBuilder.durable(FOOD_RATING_QUEUE).build();
    }

    @Bean
    public Binding foodRatingBinding(Queue foodRatingQueue, DirectExchange feedbackDirectExchange) {
        return BindingBuilder.bind(foodRatingQueue).to(feedbackDirectExchange).with(ROUTING_KEY_FOOD);
    }
}
