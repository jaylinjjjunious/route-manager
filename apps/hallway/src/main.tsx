import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Hallway from './Hallway';
import { legacyRoomLink } from './rooms';
import './styles.css';

const legacyLink = legacyRoomLink(window.location.hash);
if (legacyLink) window.location.replace(legacyLink);
else createRoot(document.getElementById('root')!).render(<StrictMode><Hallway /></StrictMode>);

window.addEventListener('hashchange', () => {
  const roomLink = legacyRoomLink(window.location.hash);
  if (roomLink) window.location.replace(roomLink);
});

// Ask the old root worker to fetch the parent's retirement script. Room workers
// now register only within /route-manager/; no storage or proof data is cleared.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration('/').then(registration => {
    if (registration?.scope === `${window.location.origin}/` && registration.active?.scriptURL === `${window.location.origin}/sw.js`) return registration.update();
  }).catch(() => undefined);
}
