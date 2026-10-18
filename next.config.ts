import type { NextConfig } from "next";
// Inline scripts are currently required by hydration and the theme bootstrap.
// No unsafe-eval; workers and data requests use locally bundled assets.
const csp = ["default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self' data:", "connect-src 'self'", "worker-src 'self' blob:", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com"].join('; ');
const nextConfig: NextConfig = {
 output: process.env.GRID_SELF_HOSTED === '1' ? 'standalone' : undefined,
 poweredByHeader: false,
 async headers(){return [{source:'/:path*',headers:[
  {key:'Content-Security-Policy',value:csp},
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=()'}
 ]}];}
};
export default nextConfig;
