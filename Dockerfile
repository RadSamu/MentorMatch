FROM node:18-alpine

# Installiamo il client postgres (psql) per poter eseguire comandi sul DB dalla shell
RUN apk add --no-cache postgresql-client

WORKDIR /app

# 1. Copia e installa le dipendenze del backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# 2. Copia il codice sorgente del backend
COPY backend/ .

# 3. Copia il frontend (verrà servito come file statici dal backend)
COPY frontend/ ../frontend

# 4. Copia lo schema del database (per inizializzarlo su Render)
COPY database/ ../database

EXPOSE 3000

CMD ["npm", "start"]