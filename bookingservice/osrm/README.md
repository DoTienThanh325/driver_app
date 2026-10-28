\# Hướng dẫn cài đặt Hạ tầng (OSRM \& Redis)



Tài liệu này hướng dẫn cách tải dữ liệu bản đồ OpenStreetMap, cắt vùng dữ liệu cho \*\*Hà Nội\*\* (giúp tiết kiệm RAM khi build) và khởi chạy hệ thống định tuyến \*\*OSRM\*\* cùng \*\*Redis Geo\*\* bằng Docker\[cite: 1].



\## 1. Yêu cầu hệ thống

\* \*\*Docker Desktop\*\* đã được cài đặt và đang chạy\[cite: 1].

\* \*\*PowerShell\*\* (trên Windows)\[cite: 1].



\---



\## 2. Chuẩn bị dữ liệu bản đồ OSRM (Khu vực Hà Nội)



Do dữ liệu bản đồ toàn bộ Việt Nam (`vietnam-latest.osm.pbf` \~315MB) yêu cầu lượng lớn RAM khi giải nén đồ thị (dễ gây lỗi thiếu file `.ebg` nếu Docker giới hạn \~4GB RAM), chúng ta sẽ tải bản đồ Việt Nam và dùng `osmium-tool` để cắt riêng khu vực \*\*Hà Nội\*\* (\~20MB)\[cite: 1].



\### Bước 2.1: Tạo thư mục và tải bản đồ Việt Nam

Mở \*\*Windows PowerShell\*\* tại thư mục gốc của dự án và chạy:



```powershell

\# Tạo thư mục chứa dữ liệu OSRM (nếu chưa có)

mkdir -p infra/osrm/data

cd infra/osrm/data



\# Tải dữ liệu bản đồ Việt Nam từ Geofabrik (\~315MB)

Invoke-WebRequest -Uri "\[https://download.geofabrik.de/asia/vietnam-latest.osm.pbf](https://download.geofabrik.de/asia/vietnam-latest.osm.pbf)" -OutFile "vietnam-latest.osm.pbf"

```



\### Bước 2.2: Cắt bản đồ khu vực Hà Nội (Bounding Box)

Sử dụng Docker image `stefda/osmium-tool` để cắt vùng tọa độ Hà Nội (`105.60,20.75,106.05,21.25`)\[cite: 1]:



```powershell

docker run --rm -v ${PWD}:/data stefda/osmium-tool:latest osmium extract `

&#x20; --bbox 105.60,20.75,106.05,21.25 `

&#x20; --output /data/hanoi.osm.pbf `

&#x20; --overwrite `

&#x20; /data/vietnam-latest.osm.pbf

```

\*(Sau bước này, bạn sẽ có file `hanoi.osm.pbf` nặng khoảng \~20.1 MB. Bạn có thể xóa file `vietnam-latest.osm.pbf` nếu muốn tiết kiệm ổ cứng)\[cite: 1].\*



\---



\## 3. Tiền xử lý dữ liệu OSRM (Algorithm: MLD)



Vẫn đứng tại thư mục `infra/osrm/data`, chạy lần lượt 3 lệnh sau để trích xuất và phân vùng đồ thị đường đi cho ô tô (`car.lua`)\[cite: 1]:



```powershell

\# 1. Extract

docker run -t -v ${PWD}:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/hanoi.osm.pbf



\# 2. Partition

docker run -t -v ${PWD}:/data osrm/osrm-backend osrm-partition /data/hanoi.osrm



\# 3. Customize

docker run -t -v ${PWD}:/data osrm/osrm-backend osrm-customize /data/hanoi.osrm

```



\---



\## 4. Khởi chạy các Container Hạ tầng



Quay trở lại thư mục gốc của dự án (hoặc thư mục `infra`) và bật các dịch vụ bằng Docker Compose\[cite: 1]:



```powershell

\# Di chuyển về thư mục gốc của dự án

cd ../../..



\# Khởi chạy Redis và OSRM dưới nền

docker compose -f infra/docker-compose.infra.yml up -d redis osrm

```



\---



\## 5. Kiểm tra hoạt động (Testing)



\### 5.1. Kiểm tra API OSRM

\* \*\*Tính toán lộ trình (Route API):\*\*\[cite: 1]

&#x20; ```powershell

&#x20; curl.exe "http://localhost:5000/route/v1/driving/105.8524,21.0285;105.8230,21.0545?overview=false"

&#x20; ```

\* \*\*Tính ma trận khoảng cách và thời gian (Table API):\*\*\[cite: 1]

&#x20; ```powershell

&#x20; curl.exe "http://localhost:5000/table/v1/driving/105.8524,21.0285;105.8230,21.0545;105.8346,21.0369;105.7818,21.0368?sources=0\&annotations=duration,distance"

&#x20; ```



\### 5.2. Kiểm tra Redis GeoSearch

Truy cập vào `redis-cli` trong container và thử nghiệm lưu/tìm kiếm tọa độ tài xế\[cite: 1]:

```powershell

docker exec -it driver-redis redis-cli

```

Nhập các lệnh trong giao diện Redis\[cite: 1]:

```redis

GEOADD driver:locations:BIKE 105.8524 21.0285 "1"

GEOADD driver:locations:BIKE 105.8230 21.0545 "2"

GEOADD driver:locations:BIKE 105.8346 21.0369 "3"

GEOSEARCH driver:locations:BIKE FROMLONLAT 105.8524 21.0285 BYRADIUS 5 km ASC

exit

```

