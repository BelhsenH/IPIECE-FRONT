import { Redirect } from 'expo-router';

// This prevents the (tabs) route group from being accessible
// and redirects to the main app flow instead
export default function TabsNotFound() {
  return <Redirect href="/(auth)/splash" />;
}