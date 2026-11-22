#!/usr/bin/env bash
set -e

# Chuyển vào đúng thư mục chứa script (backend/)
cd "$(dirname "$0")"

echo "=========================================================="
echo "🚀 Đang kiểm tra địa chỉ IP LAN máy chủ..."

# 1. Tự động lấy IP mạng LAN đang kết nối Internet
LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' || hostname -I | awk '{print $1}')

if [ -z "$LAN_IP" ]; then
  echo "⚠️ Không tìm thấy IP LAN, dùng fallback localhost"
  LAN_IP="localhost"
fi

NEW_ENDPOINT="http://${LAN_IP}:9000"

echo "🎯 IP LAN tìm thấy: $LAN_IP"
echo "📦 STORAGE_PUBLIC_ENDPOINT: $NEW_ENDPOINT"
echo "=========================================================="

# 2. Cập nhật tự động vào file .env và .env.pod nếu tồn tại
for ENV_FILE in ".env" ".env.pod"; do
  if [ -f "$ENV_FILE" ]; then
    sed -i "s|^STORAGE_PUBLIC_ENDPOINT=.*|STORAGE_PUBLIC_ENDPOINT=${NEW_ENDPOINT}|" "$ENV_FILE"
    echo "✅ Đã đồng bộ $ENV_FILE"
  fi
done

# 3. Export biến vào môi trường shell hiện tại
export STORAGE_PUBLIC_ENDPOINT="$NEW_ENDPOINT"

# 4. Xác định file env để chạy docker compose
ENV_FLAG=""
if [ -f ".env.pod" ]; then
  ENV_FLAG="--env-file .env.pod"
fi

echo "🐳 Đang khởi động các container Docker Backend..."
echo "Lệnh: docker compose $ENV_FLAG up -d $@"
docker compose $ENV_FLAG up -d "$@"

echo "=========================================================="
echo "🎉 Toàn bộ Backend đã chạy thành công với IP: $LAN_IP"
echo "📱 Ứng dụng Mobile giờ có thể kết nối tải ảnh qua MinIO:"
echo "   $NEW_ENDPOINT"
echo "=========================================================="