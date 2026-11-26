package com.driverapp.bookingservice;

import com.driverapp.bookingservice.config.GlobalExceptionHandler;
import com.driverapp.bookingservice.config.SecurityConfig;
import com.driverapp.bookingservice.controller.TripController;
import com.driverapp.bookingservice.dto.request.CreateTripRequest;
import com.driverapp.bookingservice.dto.request.UpdateTripStatusRequest;
import com.driverapp.bookingservice.dto.response.AcceptTripResponse;
import com.driverapp.bookingservice.dto.response.CreateTripResponse;
import com.driverapp.bookingservice.models.enums.TripStatus;
import com.driverapp.bookingservice.service.TripService;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TripController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class TripControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TripService tripService;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    private final UUID userId = UUID.randomUUID();

    @Nested
    class CreateTripEndpointTests {

        private static final String VALID_BODY = """
                {
                  "pickUpLatitude": 21.0285,
                  "pickUpLongitude": 105.8542,
                  "pickUpAddress": "Hồ Gươm",
                  "destinationAddress": "Mỹ Đình",
                  "destinationLatitude": 21.0285,
                  "destinationLongitude": 105.7642,
                  "shippingType": "PASSENGER",
                  "vehicleType": "MOTORBIKE",
                  "shippFare": 30000
                }
                """;

        // [TC-CT-01] POST /api/trips hợp lệ với JWT -> 201 Created, trích xuất đúng customerId từ jwt.sub
        @Test
        void returns201AndExtractsCustomerIdFromJwt() throws Exception {
            when(tripService.createTrip(eq(userId), any(CreateTripRequest.class)))
                    .thenReturn(new CreateTripResponse("Tạo chuyến thành công", "trip-101"));

            mockMvc.perform(post("/api/trips")
                            .with(jwt().jwt(j -> j.subject(userId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(VALID_BODY))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.message").value("Tạo chuyến thành công"))
                    .andExpect(jsonPath("$.tripId").value("trip-101"));
        }

        // [TC-CT-02] POST /api/trips không có JWT -> 401 Unauthorized, không gọi service
        @Test
        void returns401WhenUnauthenticated() throws Exception {
            mockMvc.perform(post("/api/trips")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(VALID_BODY))
                    .andExpect(status().isUnauthorized());

            verifyNoInteractions(tripService);
        }

        // [TC-CT-03] POST /api/trips thiếu/sai field @Valid -> 400 Bad Request với format Validation Error
        @Test
        void returns400ValidationErrorWhenRequiredFieldsAreMissingOrInvalid() throws Exception {
            String invalidBody = """
                    {
                      "pickUpLatitude": 21.0,
                      "pickUpLongitude": 105.8,
                      "pickUpAddress": "",
                      "destinationAddress": "",
                      "destinationLatitude": 21.1,
                      "destinationLongitude": 105.9,
                      "shippingType": "FOOD_DELIVERY",
                      "vehicleType": null,
                      "shippFare": null,
                      "foods": [
                        { "foodId": null, "size": "", "quantity": 0 }
                      ]
                    }
                    """;

            mockMvc.perform(post("/api/trips")
                            .with(jwt().jwt(j -> j.subject(userId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(invalidBody))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Validation Error"))
                    .andExpect(jsonPath("$.details.pickUpAddress").exists())
                    .andExpect(jsonPath("$.details.destinationAddress").exists())
                    .andExpect(jsonPath("$.details.vehicleType").exists())
                    .andExpect(jsonPath("$.details.shippFare").exists());

            verifyNoInteractions(tripService);
        }

        // [TC-CT-04] POST /api/trips bị service ném 409 CONFLICT (đang có chuyến tìm xe) -> trả HTTP 409
        @Test
        void returns409WhenCustomerAlreadyHasSearchingTrip() throws Exception {
            when(tripService.createTrip(eq(userId), any(CreateTripRequest.class)))
                    .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Dang co chuyen di tim tai xe"));

            mockMvc.perform(post("/api/trips")
                            .with(jwt().jwt(j -> j.subject(userId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(VALID_BODY))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.status").value(409))
                    .andExpect(jsonPath("$.message").value("Dang co chuyen di tim tai xe"));
        }
    }

    @Nested
    class AcceptTripEndpointTests {

        // [TC-CT-05] POST /api/trips/{tripId}/accept hợp lệ -> 200 OK với status DRIVER_ASSIGNED
        @Test
        void returns200WhenDriverAcceptsTripSuccessfully() throws Exception {
            when(tripService.acceptTrip("trip-1", userId))
                    .thenReturn(new AcceptTripResponse("trip-1", "DRIVER_ASSIGNED", "Nhận chuyến thành công"));

            mockMvc.perform(post("/api/trips/trip-1/accept")
                            .with(jwt().jwt(j -> j.subject(userId.toString()))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.tripId").value("trip-1"))
                    .andExpect(jsonPath("$.status").value("DRIVER_ASSIGNED"));
        }

        // [TC-CT-06] POST /api/trips/{tripId}/accept bị tranh chuyến hoặc bấm lại khi mạng chậm -> trả HTTP 409
        @Test
        void returns409WhenTripAlreadyClaimedOrRetriedOnSlowNetwork() throws Exception {
            when(tripService.acceptTrip("trip-1", userId))
                    .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Chuyến đi đã được tài xế khác nhận"));

            mockMvc.perform(post("/api/trips/trip-1/accept")
                            .with(jwt().jwt(j -> j.subject(userId.toString()))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.status").value(409));
        }

        // [TC-CT-07] POST /api/trips/{tripId}/accept không có JWT -> 401 Unauthorized
        @Test
        void returns401WhenUnauthenticated() throws Exception {
            mockMvc.perform(post("/api/trips/trip-1/accept"))
                    .andExpect(status().isUnauthorized());

            verifyNoInteractions(tripService);
        }
    }

    @Nested
    class UpdateTripStatusEndpointTests {

        // [TC-CT-07] PATCH /api/trips/status hợp lệ -> 200 OK
        @Test
        void returns200WhenDriverUpdatesStatusSuccessfully() throws Exception {
            doNothing().when(tripService).updateTripStatus(eq(userId), any(UpdateTripStatusRequest.class));

            mockMvc.perform(patch("/api/trips/status")
                            .with(jwt().jwt(j -> j.subject(userId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "tripId": "trip-1", "status": "DRIVER_ARRIVING" }
                                    """))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Cập nhật trạng thái chuyến đi thành công"));

            verify(tripService).updateTripStatus(userId, new UpdateTripStatusRequest("trip-1", TripStatus.DRIVER_ARRIVING));
        }

        // [TC-CT-08] PATCH /api/trips/status thiếu tripId hoặc status=null -> 400 Bad Request
        @Test
        void returns400WhenTripIdBlankOrStatusNull() throws Exception {
            mockMvc.perform(patch("/api/trips/status")
                            .with(jwt().jwt(j -> j.subject(userId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "tripId": "", "status": null }
                                    """))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Validation Error"))
                    .andExpect(jsonPath("$.details.tripId").exists())
                    .andExpect(jsonPath("$.details.status").exists());

            verifyNoInteractions(tripService);
        }

        // [TC-CT-09] PATCH /api/trips/status tài xế khác hoặc cố hủy chuyến -> 403 Forbidden
        @Test
        void returns403WhenDriverNotAssignedOrAttemptsCancel() throws Exception {
            doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài xế không có quyền hủy chuyến đi"))
                    .when(tripService).updateTripStatus(eq(userId), any(UpdateTripStatusRequest.class));

            mockMvc.perform(patch("/api/trips/status")
                            .with(jwt().jwt(j -> j.subject(userId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "tripId": "trip-1", "status": "CANCELLED" }
                                    """))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }

        // [TC-CT-11] PATCH /api/trips/status không có JWT -> 401 Unauthorized
        @Test
        void returns401WhenUnauthenticated() throws Exception {
            mockMvc.perform(patch("/api/trips/status")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    { "tripId": "trip-1", "status": "IN_PROGRESS" }
                                    """))
                    .andExpect(status().isUnauthorized());

            verifyNoInteractions(tripService);
        }
    }
}
