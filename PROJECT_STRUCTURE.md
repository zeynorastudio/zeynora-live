# Zeynora - Next.js 15 Ecommerce Project Structure

## Folder Structure

```
zeynora/
├── app/
│   ├── (storefront)/          # Public storefront pages
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── admin/                 # Admin panel
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── super-admin/           # Super admin console
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Homepage placeholder
│   └── globals.css            # Global styles
│
├── components/
│   ├── admin/                 # Admin panel components
│   ├── store/                 # Storefront components
│   └── ui/                    # Shared UI components
│       └── Button.tsx         # Dummy Button component
│
├── lib/
│   ├── supabase/              # Supabase client/server helpers
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils.ts               # General utilities (cn helper)
│
├── hooks/                     # Global React hooks
├── types/                     # Global TypeScript types
├── utils/                     # Utility functions
├── styles/
│   └── globals.css            # Additional global styles
│
├── public/                    # Static assets
│
├── middleware.ts              # Next.js middleware
├── next.config.ts             # Next.js configuration (Turbopack + Vite compatibility)
├── tailwind.config.ts         # TailwindCSS configuration (luxury UI theme)
├── postcss.config.js          # PostCSS configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies
└── .env.example               # Environment variables template
```

## Key Features

### ✅ Next.js 15
- App Router architecture
- TypeScript support
- Turbopack enabled by default (`npm run dev`)
- Webpack fallback available (`npm run dev:webpack`)

### ✅ Styling
- TailwindCSS v3.4 with luxury UI theme
- PostCSS + Autoprefixer
- Custom luxury color palette (gold, black, silver)
- Dark mode support

### ✅ Dependencies Installed

**Core:**
- next@^15.1.6
- react@^19.0.0
- react-dom@^19.0.0
- typescript@^5
- tailwindcss@^3.4.17
- postcss@^8.5.6
- autoprefixer@^10.4.22

**UI:**
- lucide-react@^0.554.0
- framer-motion@^12.23.24
- tailwind-merge@^2.5.5
- clsx@^2.1.1

**State Management:**
- zustand@^5.0.8

**Forms & Validation:**
- react-hook-form@^7.66.1
- zod@^3.24.1

**Supabase:**
- @supabase/supabase-js@^2.83.0
- @supabase/auth-helpers-nextjs@^0.10.0
- @supabase/storage-js@^2.83.0

**Payments:**
- razorpay@^2.9.6

**Emails:**
- @sendgrid/mail@^8.1.6

**File Upload:**
- react-dropzone@^14.3.8

**Utilities:**
- lodash@^4.17.21
- date-fns@^4.1.0

## Configuration Files

### next.config.ts
- Turbopack enabled by default
- Vite-style import compatibility configured
- Webpack asset handling for images

### tailwind.config.ts
- Luxury color palette pre-configured
- Custom display font sizes
- Luxury shadow utilities
- Custom animations (fade-in, slide-up, slide-down)

### postcss.config.js
- TailwindCSS plugin
- Autoprefixer plugin

### tsconfig.json
- Path aliases configured (`@/*` → `./*`)
- Strict mode enabled
- Next.js plugin configured

### .env.example
Template includes:
- Supabase configuration
- Razorpay keys
- SendGrid API key
- Stripe keys (optional)
- App URL configuration

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Run development server:**
   ```bash
   npm run dev          # With Turbopack (default)
   npm run dev:webpack  # With Webpack (fallback)
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Project Status

✅ All dependencies installed successfully
✅ Folder structure created
✅ Configuration files set up
✅ Initial layouts and components created
✅ No linting errors

The project is ready for development!




