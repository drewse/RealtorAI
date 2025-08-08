FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root user for setup
USER root

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies as root to avoid permission issues
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy application files
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /app/.cache /app/logs && \
    chown -R pptruser:pptruser /app && \
    chmod -R 755 /app && \
    chmod +x /app/index.js

# Switch to pptruser for security
USER pptruser

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_CACHE_DIR=/app/.cache

# Expose port
EXPOSE 8080

# Health check using Node.js instead of curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD npm run health

# Start the application
CMD ["npm", "start"]
