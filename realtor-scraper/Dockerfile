FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root user to fix permissions
USER root

# Set working directory and fix ownership
WORKDIR /app
COPY package*.json ./
RUN mkdir -p /app/node_modules && chown -R pptruser:pptruser /app

# Switch back to pptruser before installing dependencies
USER pptruser
RUN npm install

# Copy rest of the files (still as pptruser)
COPY --chown=pptruser:pptruser . .

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
