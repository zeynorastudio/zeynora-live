import { NextResponse } from "next/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zeynora.com";

export async function GET() {
  const robotsTxt = `# Zeynora Robots.txt
# https://zeynora.com

User-agent: *
Allow: /

# Disallow admin routes
Disallow: /admin
Disallow: /admin/*
Disallow: /super-admin
Disallow: /super-admin/*

# Disallow API routes
Disallow: /api/
Disallow: /api/*

# Disallow auth routes
Disallow: /auth/
Disallow: /login
Disallow: /register

# Disallow checkout and cart (dynamic content)
Disallow: /checkout
Disallow: /cart

# Disallow account pages
Disallow: /account
Disallow: /account/*

# Sitemap location
Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
