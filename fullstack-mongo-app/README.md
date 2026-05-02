# Full-Stack Mongo App

A complete full-stack web app with:
- Backend: Node.js + Express + MongoDB (Mongoose)
- Frontend: React (Vite)
- Authentication: JWT (register/login/me)
- Feature: User-scoped Todo CRUD

## Project Structure

fullstack-mongo-app/
- backend/
  - src/
    - config/db.js
    - controllers/
    - middleware/auth.js
    - models/
    - routes/
    - server.js
  - .env.example
  - package.json
- frontend/
  - src/
    - components/
    - api.js
    - App.jsx
    - main.jsx
    - styles.css
  - index.html
  - vite.config.js
  - package.json

## 1) Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Update `.env`:

```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/fullstack_mongo_app
JWT_SECRET=replace_with_a_long_random_secret
```

Run backend:

```bash
npm run dev
```

Health endpoint:

- `GET http://localhost:5001/api/health`

## 2) Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

Open:

- `http://localhost:5173`

Vite proxy forwards `/api/*` calls to backend on `http://localhost:5001`.

## API Endpoints

Auth:
- `POST /api/auth/register` `{ name, email, password }`
- `POST /api/auth/login` `{ email, password }`
- `GET /api/auth/me` (Bearer token)

Todos (Bearer token required):
- `GET /api/todos`
- `POST /api/todos` `{ title }`
- `PATCH /api/todos/:id` `{ title?, completed? }`
- `DELETE /api/todos/:id`

## Authentication Flow

1. Register or login from frontend.
2. API returns JWT token.
3. Frontend stores token in localStorage.
4. Frontend sends `Authorization: Bearer <token>` on protected requests.

## Notes

- This app uses localStorage token storage for simplicity.
- For production, consider httpOnly cookies and CSRF protections.
