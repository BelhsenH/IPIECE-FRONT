import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to splash screen
    router.replace('/(auth)/splash');
  }, [router]);

  return null; // Don't render anything, just redirect
}