FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg2 and postgis
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies (might fail if proxy blocks, you might need to configure PIP proxy)
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
