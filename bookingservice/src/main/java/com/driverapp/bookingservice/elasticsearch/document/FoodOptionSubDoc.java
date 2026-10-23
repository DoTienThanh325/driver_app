package com.driverapp.bookingservice.elasticsearch.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodOptionSubDoc {
    @Field(type = FieldType.Keyword)
    private String size;

    @Field(type = FieldType.Double)
    private double price;
}
