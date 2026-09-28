package com.driverapp.paymentservice.models;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@Document(collection = "user_vouchers")
public class UserVoucher {

    @Id
    private UUID id;

    private UUID userId;
    private List<UserVoucherItem> vouchers;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}