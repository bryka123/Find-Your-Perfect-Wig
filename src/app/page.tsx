import { redirect } from 'next/navigation';

export default function HomePage() {
  // In a real Shopify app, you'd check for authentication here
  // For now, redirect to dashboard
  redirect('/dashboard');
}