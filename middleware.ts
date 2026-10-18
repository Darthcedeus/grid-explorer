import {NextResponse} from 'next/server';
// Apply on Node as well as Workers; static Node responses do not consistently
// receive next.config headers in the current Vinext release.
export function middleware(){
 const response=NextResponse.next();
 response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com");
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
 return response;
}
export const config={matcher:'/:path*'};
