# =========================================================================
# ETAPA 1: Descargar dependencias
# =========================================================================
FROM node:22-alpine AS deps
WORKDIR /app

# Copia los manifiestos de dependencias
COPY package*.json ./

# Instalación limpia y reproducible (ignora scripts en etapa deps para evitar que nuxt prepare falle sin fuentes)
RUN npm ci --ignore-scripts

# =========================================================================
# ETAPA 2: Compilación de la aplicación (Nuxt 4 / Nitro)
# =========================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Copia dependencias desde la etapa previa y el código fuente
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compilar la aplicación Nuxt 4 para producción
RUN npm run build

# =========================================================================
# ETAPA 3: Imagen de producción de ejecución (Runner)
# =========================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Crear usuario de sistema no-root por seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxtjs

# Copiar exclusivamente los artefactos compilados por Nitro
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output

USER nuxtjs

EXPOSE 3000

# Punto de entrada de Nitro SSR
CMD ["node", ".output/server/index.mjs"]
