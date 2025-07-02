ARG BUILD_FROM
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    python3-dev \
    py3-pip \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    cargo \
    rust \
    tzdata \
    curl \
    nginx \
    supervisor

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

# Copy Calendifier source code
COPY calendar_app/ ./calendar_app/
COPY version.py .
COPY main.py .
COPY assets/ ./assets/

# Copy add-on specific files
COPY homeassistant-addon/rootfs/ /

# Copy web interface
COPY homeassistant-addon/web/ ./web/

# Create necessary directories
RUN mkdir -p /data/calendifier \
    /var/log/supervisor \
    /var/log/nginx \
    /run/nginx

# Set permissions
RUN chmod a+x /etc/services.d/*/run \
    /etc/services.d/*/finish \
    /etc/cont-init.d/*

# Expose port
EXPOSE 8099

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8099/api/v1/health || exit 1

# Labels
LABEL \
    io.hass.name="Calendifier" \
    io.hass.description="Comprehensive calendar application with multi-language support" \
    io.hass.arch="${BUILD_ARCH}" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    maintainer="Oliver Ernster <oliver@calendifier.app>" \
    org.opencontainers.image.title="Calendifier Home Assistant Add-on" \
    org.opencontainers.image.description="Multi-language calendar with locale-aware holidays" \
    org.opencontainers.image.vendor="Calendifier" \
    org.opencontainers.image.authors="Oliver Ernster" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.url="https://github.com/oernster/calendifier" \
    org.opencontainers.image.source="https://github.com/oernster/calendifier" \
    org.opencontainers.image.documentation="https://github.com/oernster/calendifier/blob/main/docs/home_assistant_integration.md"