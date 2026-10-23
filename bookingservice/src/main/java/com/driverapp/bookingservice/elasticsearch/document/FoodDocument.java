package com.driverapp.bookingservice.elasticsearch.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.*;
import org.springframework.data.elasticsearch.core.geo.GeoPoint;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "foods_index")
@Setting(settingPath = "/elasticsearch/food-index-settings.json")
public class FoodDocument {

    @Id
    private String id;

    // Tìm kiếm món ăn theo tên (hỗ trợ tiếng Việt không dấu & gợi ý từ khóa)
    @MultiField(
        mainField = @Field(type = FieldType.Text, analyzer = "search_analyzer"),
        otherFields = {
            @InnerField(suffix = "keyword", type = FieldType.Keyword),
            @InnerField(suffix = "autocomplete", type = FieldType.Text, analyzer = "autocomplete_analyzer", searchAnalyzer = "search_analyzer")
        }
    )
    private String name;

    @Field(type = FieldType.Keyword)
    private String restaurantId;

    @Field(type = FieldType.Text, analyzer = "search_analyzer")
    private String restaurantName;

    @Field(type = FieldType.Keyword)
    private String restaurantAddress;

    // Lưu toạ độ quán ăn (geo_point) để phục vụ SẮP XẾP THEO KHOẢNG CÁCH
    @GeoPointField
    private GeoPoint restaurantLocation;

    @Field(type = FieldType.Nested)
    private List<FoodOptionSubDoc> options;

    @Field(type = FieldType.Date, format = {DateFormat.date_hour_minute_second, DateFormat.date_hour_minute_second_millis})
    private String createdAt;
}
