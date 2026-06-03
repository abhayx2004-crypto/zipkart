FROM node:22-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace config
COPY turbo.json ./

# Copy apps and packages
COPY apps ./apps

COPY packages ./packages

# Install dependencies
RUN npm install

# Build authservice
RUN npm run build --workspace=authservice

EXPOSE 8000

CMD ["npm", "run", "start", "--workspace=authservice"]