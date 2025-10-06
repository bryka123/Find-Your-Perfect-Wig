'use client';

import '@shopify/polaris/build/esm/styles.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#f6f6f7' }}>
      {children}
    </div>
  );
}
