import { useState, useEffect } from 'react';
import SearchOverlay from './SearchOverlay';

export default function SearchProvider() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(prev => !prev);
    document.addEventListener('open-search', handler);
    return () => document.removeEventListener('open-search', handler);
  }, []);

  return <SearchOverlay open={open} onClose={() => setOpen(false)} />;
}
