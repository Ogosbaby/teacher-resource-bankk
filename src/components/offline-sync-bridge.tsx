"use client";

import { useEffect } from "react";
import { isModelReady, isTermPassActive, provisionLocalModel, startSyncRetryLoop } from "@/lib/offline";

/**
 * Headless bridge that keeps the server in step with the device's term pass
 * and ensures the on-device AI model downloads automatically in the background.
 */
export function OfflineSyncBridge() {
  useEffect(() => {
    const stopSync = startSyncRetryLoop();

    // Auto-download local model in the background if term pass is active
    let stopProvision: (() => void) | undefined;
    if (isTermPassActive() && !isModelReady()) {
      stopProvision = provisionLocalModel();
    }

    return () => {
      stopSync();
      stopProvision?.();
    };
  }, []);

  return null;
}
