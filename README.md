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

The project uses the classic [employees sample database](https://github.com/datacharmer/test_db). Convert it from MySQL to PostgreSQL using Docker and pgloader:

**Prerequisites:** Docker, [pgloader](https://pgloader.io/)

**Step 1 — Start a temporary MySQL container**

```bash
docker run -d --name mysql-employees \
  -p 3306:3306 \
  -e MYSQL_ALLOW_EMPTY_PASSWORD=true \
  mysql:8
```

**Step 2 — Import the MySQL dump**

If you have the `employees.sql` file locally:

```bash
docker exec -i mysql-employees mysql -u root -e "CREATE DATABASE IF NOT EXISTS employees"
docker exec -i mysql-employees mysql -u root employees < employees.sql
```

Otherwise, clone from the upstream repository:

```bash
git clone https://github.com/datacharmer/test_db.git
mysql -h 127.0.0.1 -u root -e "CREATE DATABASE IF NOT EXISTS employees"
mysql -h 127.0.0.1 -u root employees < test_db/employees.sql
```

**Step 3 — Install pgloader**

```bash
brew install pgloader
```

**Step 4 — Convert to PostgreSQL**

```bash
pgloader mysql://root@localhost:3306/employees postgresql://USER:PASS@localhost:5432/employees_db
```

**Step 5 — Apply optimization indexes (optional)**

```bash
psql -U USER -d employees_db -f prisma/optimization_indexes.sql
```

**Step 6 — Clean up MySQL container (optional)**

```bash
docker stop mysql-employees && docker rm mysql-employees
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
