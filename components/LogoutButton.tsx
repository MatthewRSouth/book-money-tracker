'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      style={{ color: '#616B7A' }}
      className="text-sm transition-colors hover:text-[#2C323B]"
    >
      Log out
    </button>
  );
}
