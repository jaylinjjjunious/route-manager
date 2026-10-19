import { useCallback } from "react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

export interface OpenExternalOptions {
  url: string;
  presentationStyle?: "fullscreen" | "popover";
  toolbarColor?: string;
}

export function useExternalBrowser() {
  const open = useCallback(async ({ url, presentationStyle = "fullscreen", toolbarColor }: OpenExternalOptions) => {
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }

    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url, presentationStyle, toolbarColor });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const close = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await Browser.close();
    }
  }, []);

  return { open, close };
}

export function useCECheckIn() {
  const { open } = useExternalBrowser();
  const CE_CHECK_IN_URL = "https://cecheckin.com";

  const openCheckIn = useCallback(() => open({ url: CE_CHECK_IN_URL }), [open]);
  const openCheckInPath = useCallback((path: string) => open({ url: `${CE_CHECK_IN_URL}${path}` }), [open]);

  return { openCheckIn, openCheckInPath };
}