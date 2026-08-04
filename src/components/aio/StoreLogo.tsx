import React, { useState } from "react";
import type { Job } from "../../types";
import { resolveStoreLogo } from "../../services/storeLogos";
import { GradientIconTile } from "./primitives";
import { getJobIconMeta } from "./jobMeta";

export interface StoreLogoProps {
  job: Job;
  /** Optional stable companyId/storeId when the job already carries one. */
  companyId?: string | null;
}

/**
 * Square store-logo tile for the Today's Other Jobs Panel.
 *
 * Renders the matched store logo with object-contain so artwork is not
 * cropped, on a neutral surface that works with white-background and
 * transparent logos. Falls back to the existing generic icon when no store
 * matches or the logo image fails to load.
 */
export function StoreLogo({ job, companyId }: StoreLogoProps) {
  const match = resolveStoreLogo({
    companyId: companyId ?? null,
    texts: [job.storeName, job.notes],
  });
  const [failed, setFailed] = useState(false);

  if (!match || failed) {
    const meta = getJobIconMeta(job);
    return <GradientIconTile icon={meta.icon} gradient={meta.gradient} />;
  }

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[var(--color-aio-line)] bg-[var(--color-aio-surface-2)] p-1.5">
      <img
        src={match.logoPath}
        alt={`${match.displayName} logo`}
        className="h-full w-full object-contain"
        draggable={false}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
