# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Instala deps de prod + dev para permitir build (TS)
RUN npm ci
COPY . .
# Se for TypeScript:
# RUN npm run build

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Usuário sem privilégios
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
COPY --from=build /app /app
# Instala só prod (se seu build gerar dist e você quiser ainda mais slim, pode remover dev deps):
RUN npm ci --only=production
RUN chown -R nodeusr:nodegrp /app
USER nodeusr

# Ajuste se sua API ouve outra porta
ENV PORT=3001
EXPOSE 3001

# Se for JS puro: src/server.js
CMD ["node","src/server.js"]
# Se for TS compilado:
# CMD ["node","dist/server.js"]
