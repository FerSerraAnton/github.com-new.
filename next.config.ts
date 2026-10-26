import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las páginas de la app son dinámicas (sesiones en tiempo real), no usamos Cache Components.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
