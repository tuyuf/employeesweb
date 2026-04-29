# Employees Management Dashboard

A full-featured employee management dashboard built with Next.js 16, featuring employee and department browsing with detailed history views, analytics, and pagination.

## Prerequisites

- Node.js 20+
- PostgreSQL running locally

## Setup

1. **Clone the repository**

```bash
git clone https://github.com/tuyuf/employeesweb.git
cd employeesweb
```

2. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` and set your PostgreSQL connection string:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/employees_db?schema=public"
```

3. **Install dependencies**

```bash
npm install
```

4. **Sync Prisma schema to PostgreSQL**

```bash
npx prisma db push
```

This creates all tables and generates the Prisma client.

5. **Import sample data**

The project uses the [employees sample database](https://github.com/datacharmer/test_db). Load it into PostgreSQL via pgloader:

```bash
# Start temporary MySQL with the sample data, then convert to PostgreSQL
pgloader mysql://root@localhost/employees postgresql://USER:PASS@localhost:5432/employees_db
```

6. **Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **UI Library:** shadcn/ui (base-ui primitives)
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Icons:** Lucide React
- **Animation:** Motion
