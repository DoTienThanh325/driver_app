-- Khởi tạo 4 database cho các microservices trong hệ thống Transit & Meal Driver App
CREATE DATABASE driverapp_user_db;
CREATE DATABASE driverapp_driver_db;
CREATE DATABASE driverapp_feedback_db;
CREATE DATABASE driverapp_notification_db;

-- Cấp toàn quyền thao tác cho user postgres
GRANT ALL PRIVILEGES ON DATABASE driverapp_user_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE driverapp_driver_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE driverapp_feedback_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE driverapp_notification_db TO postgres;
