FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root user to fix permissions
USER root

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies as root to avoid permission issues
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /app/.cache && \
    chown -R pptruser:pptruser /app && \
    chmod -R 755 /app

# Switch to pptruser for security
USER pptruser

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start the application
CMD ["npm", "start"]
