import { redirect } from 'next/navigation';

// The middleware handles locale detection and redirects for all routes.
// This root page is a fallback safety net only.
export default function RootPage() {
  redirect('/he');
}
