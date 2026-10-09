import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.allinone667.routeoptimizer',
  appName: 'All in One 667',
  webDir: 'dist-native',
  server: {
    // Live-site wrapper preview; App Store release remains a separate review.
    url: 'https://route-manager-phtj.onrender.com/',
    errorPath: 'connection-error.html',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
};

export default config;
