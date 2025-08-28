# MySQL DB Manager

A modern, full-stack database management dashboard built with **Next.js 15**, **Prisma**, **TailwindCSS**, and **shadcn/ui**.

## ✨ Features

- **Authentication**
  - Custom auth (no NextAuth)
  - Register, login, logout, session cookies
  - Passwords hashed with bcrypt
  - Middleware-protected routes and APIs

- **Dashboard UI**
  - Responsive layout with sidebar + navbar
  - Dark/Light mode toggle
  - Toast notifications with `sonner`

- **Connections**
  - Add, edit, delete MySQL/MariaDB connections
  - Securely stored connection credentials
  - View all databases and tables

- **Tables**
  - Browse table list (via information_schema)
  - View table schema (columns, types, primary keys)
  - Inline cell editor for quick edits
  - Row operations:
    - Add new rows (auto-increment, UUID, datetime defaults supported)
    - Edit rows
    - Delete rows
    - Duplicate rows

- **Query Editor**
  - Run custom SQL queries
  - Only supports `SELECT` queries for safety
  - Results displayed in DataTable

- **Export / Import**
  - Export table data as **JSON** or **CSV**
  - Import data from **JSON** or **CSV**

- **DataTable Component**
  - Reusable table with:
    - Pagination
    - Search
    - Sorting
    - Responsive (horizontal scroll only, no page scroll)

- **Profile**
  - Update name and email
  - Change password (optional, leave blank to keep current)
  - Feedback via toast messages

## 🛠 Tech Stack

- [Next.js 15](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [MySQL2](https://www.npmjs.com/package/mysql2)
- [TailwindCSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [sonner](https://sonner.emilkowal.ski/)

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Apply migrations
pnpm prisma migrate dev

# Run dev server
pnpm dev
```
## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
# Prisma database connection (for app's own users & connections)
DATABASE_URL="mysql://username:password@localhost:3306/mysql_db_manager"

# Session password (32+ chars, unique per deployment)
SESSION_PASSWORD="your-32-characters-long-secret"

# Optional
NODE_ENV=development


App will be available at [http://localhost:3000](http://localhost:3000).