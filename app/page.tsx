import { redirect } from 'next/navigation';

// Auth is enforced in proxy.ts (middleware): unauthenticated requests to `/`
// are redirected to /login before this runs, so authenticated users can be
// sent straight to the dashboard without a second session round trip here.
export default function Home() {
  redirect('/dashboard');
}
