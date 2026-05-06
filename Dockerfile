# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Instala dependencias (separado del código para aprovechar caché)
COPY package*.json ./
RUN npm install

# Copia el código fuente
COPY . .

# URL del backend — se inyecta en tiempo de build como ARG
# Ejemplo: docker build --build-arg VITE_API_URL=http://192.168.1.10:8000
ARG VITE_API_URL=http://iot-backend-service:8000
ENV VITE_API_URL=$VITE_API_URL

# Genera el build de producción
RUN npm run build

# ── Stage 2: Serve ─────────────────────────────────────────────
FROM nginx:alpine

# Copia el build generado al directorio de nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copia la configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]