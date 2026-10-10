import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getFreshAccessToken } from './showerProofApi';

type ProofImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & { src: string; onError?: () => void };
export function AuthenticatedProofImage({ src, onError, ...props }: ProofImageProps) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let current = true;
    let objectUrl: string | undefined;
    const controller = new AbortController();
    setUrl(undefined);
    async function load() {
      try {
        const target = new URL(src, window.location.origin);
        if (target.origin !== window.location.origin || !target.pathname.startsWith('/shower-proof-assets/')) throw new Error('Invalid proof URL.');
        const token = await getFreshAccessToken();
        const response = await fetch(target.href, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Proof image unavailable.');
        const blob = await response.blob();
        if (current) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
      } catch { if (current) onError?.(); }
    }
    void load();
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (event !== "SIGNED_OUT") return;
      controller.abort(); setUrl(undefined);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    });
    return () => { current = false; controller.abort(); data.subscription.unsubscribe(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    // The error callback is inline in the parent; changing it must not restart a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  return url ? <img {...props} src={url} onError={onError} /> : <span role="status" aria-label="Loading proof image" className={props.className} />;
}
