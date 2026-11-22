# OSRM cho Booking Service

OSRM cung cấp khoảng cách và thời gian di chuyển cho Booking Service. Docker Compose dùng profile `routing`, thuật toán MLD và bộ dữ liệu `bookingservice/osrm/data/hanoi.osrm`.

## Chuẩn bị dữ liệu Hà Nội

Chạy từ thư mục gốc backend trên Bash. Cần Docker, osmium-tool và curl. Có thể dùng bộ dữ liệu MLD đã chuẩn bị sẵn bằng cách đặt toàn bộ các tệp `hanoi.osrm*` vào `bookingservice/osrm/data/`.

```bash
mkdir -p bookingservice/osrm/data
cd bookingservice/osrm/data
curl -fL https://download.geofabrik.de/asia/vietnam-latest.osm.pbf -o vietnam-latest.osm.pbf
osmium extract --bbox 105.60,20.75,106.05,21.25 --overwrite \
  --output hanoi.osm.pbf vietnam-latest.osm.pbf

docker run --rm -v "$PWD:/data" osrm/osrm-backend:latest \
  osrm-extract -p /opt/car.lua /data/hanoi.osm.pbf
docker run --rm -v "$PWD:/data" osrm/osrm-backend:latest \
  osrm-partition /data/hanoi.osrm
docker run --rm -v "$PWD:/data" osrm/osrm-backend:latest \
  osrm-customize /data/hanoi.osrm
cd ../../..
```

## Khởi động và kiểm tra

Chạy từ thư mục gốc backend. Dùng file môi trường đã chuẩn bị theo [hướng dẫn chạy backend](../../README.md#cấu-hình-và-chạy-backend).

```bash
docker compose --env-file .env.pod --profile routing up -d osrm
curl -f 'http://localhost:5000/route/v1/driving/105.8524,21.0285;105.8230,21.0545?overview=false'
curl -f 'http://localhost:5000/table/v1/driving/105.8524,21.0285;105.8230,21.0545?annotations=duration,distance'
```

Tọa độ dùng thứ tự kinh độ, vĩ độ. Đặt `OSRM_URL=http://localhost:5000` khi Booking chạy trên host hoặc `OSRM_URL=http://osrm:5000` khi Booking chạy trong cùng mạng Compose. Nếu đã có máy chủ OSRM, dùng URL của máy chủ đó.
