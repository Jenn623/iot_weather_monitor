# ── Stage único — imagen ligera de Python ─────────────────────
FROM python:3.11-slim

# Evita que Python genere archivos .pyc y buffers de stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instala dependencias primero (aprovecha caché de capas Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el código fuente
COPY main.py .

# Puerto que expone el backend
EXPOSE 8000

# Arranca uvicorn en modo producción (sin --reload)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]