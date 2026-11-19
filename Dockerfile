FROM python:3.12-slim

WORKDIR /app

# Prevent Python from writing .pyc and buffer outputs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy dependency requirements
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

EXPOSE 5000

ENV HOST=0.0.0.0
ENV PORT=5000
ENV OLLAMA_URL=http://host.docker.internal:11434/api/chat
ENV OLLAMA_MODEL=qwen2.5:3b

CMD ["python", "app.py"]
