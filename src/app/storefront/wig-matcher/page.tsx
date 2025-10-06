import { Suspense } from 'react';
import WigMatchBlock from '../../(storefront)/components/WigMatchBlock';

interface SearchParams {
  theme?: 'light' | 'dark';
  maxResults?: string;
  showFilters?: string;
}

export default async function StorefrontWigMatcher({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const theme = params.theme === 'dark' ? 'dark' : 'light';
  const maxResults = parseInt(params.maxResults || '6');
  const showFilters = params.showFilters !== 'false';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
      padding: '1rem 0'
    }}>
      <Suspense fallback={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px' 
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #e91e63',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      }>
        <WigMatchBlock
          theme={theme}
          maxResults={maxResults}
          showFilters={showFilters}
        />
      </Suspense>
    </div>
  );
}