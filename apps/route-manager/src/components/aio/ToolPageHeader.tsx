import React from "react";
import { ChevronLeft } from "lucide-react";

interface ToolPageHeaderProps {
  onBack: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ToolPageHeader({
  onBack,
  title,
  subtitle,
  children,
  className = "",
}: ToolPageHeaderProps) {
  return (
    <header className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[var(--color-aio-line)] bg-[var(--color-aio-surface)] px-3 py-2 text-[14px] font-bold text-[var(--color-aio-text)] transition-colors hover:bg-[var(--color-aio-surface-2)] active:scale-[0.98] touch-manipulation"
          aria-label="Back to More"
        >
          <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
          <span className="hidden sm:inline">Back</span>
        </button>
        {(title || subtitle) && (
          <div className="min-w-0 flex-1">
            {title && (
              <h1 className="text-[24px] font-black leading-tight tracking-[-0.01em] text-[var(--color-aio-text)] truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1 text-[13px] font-medium text-[var(--color-aio-text-2)] truncate">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </header>
  );
}