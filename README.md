# DropZone

A modern file management and sharing application built with React, TypeScript, and Vite.

## Installation

Follow these steps to set up the project locally:

1. **Clone the repository**
```bash
git clone https://github.com/galihrhgnwn/DropZone.git
```

2. **Navigate to the project directory**
```bash
cd DropZone
```

3. **Install dependencies**
```bash
npm install
```

4. **Set up environment variables**
Create a `.env` file in the root directory and add your configuration (Database, S3, etc.).

5. **Run database migrations**
```bash
npm run db:push
```

6. **Start the development server**
```bash
npm run dev
```

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Runs ESLint to check for code quality.
- `npm run test`: Runs the test suite using Vitest.
- `npm run db:push`: Pushes the database schema to the database.
