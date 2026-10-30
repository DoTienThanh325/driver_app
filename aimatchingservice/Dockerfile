FROM python:3.11-slim

WORKDIR /app

# Cài đặt OpenMP runtime cần thiết cho LightGBM
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Huấn luyện mô hình từ dataset tổng hợp và lưu vào app/models/lgbm_acceptance_model.pkl
RUN python train/train_model.py data/matching_logs_synthetic.csv || true

EXPOSE 8087

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8087/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8087"]
