-- ============================================================================
-- V2: Hỗ trợ đa loại bằng lái xe và trạng thái duyệt cho từng phương tiện
-- ============================================================================

-- 1. Nâng cấp ràng buộc CHECK trên bảng driver_documents
ALTER TABLE driver_documents 
    DROP CONSTRAINT IF EXISTS driver_documents_document_type_check;

ALTER TABLE driver_documents 
    ADD CONSTRAINT driver_documents_document_type_check
    CHECK (document_type IN (
        'ID_CARD', 
        'DRIVER_LICENSE', 
        'DRIVER_LICENSE_MOTORBIKE', 
        'DRIVER_LICENSE_CAR'
    ));

-- 2. Data Migration: Chuyển đổi dữ liệu cũ DRIVER_LICENSE sang loại bằng cụ thể
-- Dựa vào loại xe đầu tiên mà tài xế đã đăng ký trong driver_vehicles
UPDATE driver_documents doc
SET document_type = CASE
    WHEN v.vehicle_type = 'CAR' THEN 'DRIVER_LICENSE_CAR'
    ELSE 'DRIVER_LICENSE_MOTORBIKE'
END
FROM (
    SELECT DISTINCT ON (driver_id) driver_id, vehicle_type
    FROM driver_vehicles
    ORDER BY driver_id, created_at ASC
) v
WHERE doc.driver_id = v.driver_id
  AND doc.document_type = 'DRIVER_LICENSE';

-- 3. Nâng cấp bảng driver_vehicles: Bổ sung trạng thái xét duyệt riêng cho từng xe
ALTER TABLE driver_vehicles 
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

ALTER TABLE driver_vehicles 
    DROP CONSTRAINT IF EXISTS driver_vehicles_status_check;

ALTER TABLE driver_vehicles 
    ADD CONSTRAINT driver_vehicles_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- 4. Đánh index để tăng tốc độ truy vấn danh sách xe và giấy tờ theo driver_id
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver_id ON driver_vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id_type ON driver_documents(driver_id, document_type);
