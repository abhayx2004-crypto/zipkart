FROM node:22-alpine

WORKDIR /app

# Build from the repository root:
# docker build -t userservice -f apps/userservice/Dockerfile .
# Do not use apps/userservice as the build context; this Dockerfile copies
# shared workspace packages from ./packages.

RUN printf '%s\n' '{"private":true,"workspaces":["apps/*","packages/*"]}' > package.json

COPY apps/userservice/package.json ./apps/userservice/package.json
COPY packages/logger/package.json ./packages/logger/package.json
COPY packages/redis/package.json ./packages/redis/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json

RUN npm install \
  --workspace=userservice \
  --workspace=@repo/logger \
  --workspace=@repo/redis \
  --include-workspace-root=false

COPY apps/userservice ./apps/userservice
COPY packages/logger ./packages/logger
COPY packages/redis ./packages/redis
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config

RUN npm run build --workspace=userservice

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace=userservice"]
