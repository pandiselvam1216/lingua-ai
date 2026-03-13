# NeuraLingua Platform

NeuraLingua is an AI-powered English learning platform featuring interactive modules (Grammar, Listening, Speaking, Reading, Writing) and a comprehensive Admin Portal.

## Prerequisites
- **Python** 3.8+
- **Node.js** 16+
- **PostgreSQL** (Optional via `DATABASE_URL` , defaults to SQLite)

## Quick Start Guide

### 1. Backend Setup
The backend is a Flask application that serves the API and manages the database.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Database Seeding (First Time Only)**
    Populate the database with the admin user, modules, and content:
    ```bash
    python seed_db.py
    ```

4.  Run the server:
    ```bash
    python run.py
    ```
    *The backend will start at `http://localhost:5000`*

### 2. Frontend Setup
The frontend is a React + Vite application.

1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```
    *The application will be accessible at `http://localhost:5173`*

## Default Credentials
Use this account to access the Admin Portal and all features:

- **Email**: `admin@neuralingua.com`
- **Password**: `admin123`

## Features
- **Learning Modules**: Grammar, Listening, Speaking, Reading, Writing, Vocabulary, Critical Thinking.
- **Admin Portal**: Analytics, Student Management, Question Management.
- **AI Scoring**: Heuristic-based scoring for speaking and writing.
