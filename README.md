How to start:

1. Open Terminal 1:
   `cd server`
   `npm run dev`

2. Open Terminal 2:
   `cd client`
   `npm run dev`

3. Open:
   `http://localhost:5173/`

Notes:
- The website runs on `http://localhost:5173/`.
- The API server runs on `http://localhost:4000/`.
- If you see `EADDRINUSE`, that port is already in use because that app is already running.
- The PostgreSQL `sslmode=require` message is a warning, not a startup failure.
