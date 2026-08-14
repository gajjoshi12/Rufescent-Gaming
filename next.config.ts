import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every route in this prototype is client-rendered against the mock API,
  // so there is nothing to revalidate or cache on the server yet.
  reactStrictMode: true,
};

export default nextConfig;
