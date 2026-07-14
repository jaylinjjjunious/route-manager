/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bike, Moon, Sun, Mail } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header id="app-header" className="sticky top-0 z-40 w-full border-b border-white/50 bg-white/58 backdrop-blur-2xl dark:border-white/10 dark:bg-[#111113]/70">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Name */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#0A84FF] to-[#007AFF] text-white shadow-[0_12px_30px_rgba(0,122,255,0.28)]">
            <Bike size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Route Manager</span>
            </h1>
            <p className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-none">
              Field Route Console
            </p>
          </div>
        </div>

        {/* Status Indicators & Theme Toggle */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* User Profile Info */}
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/62 border border-white/70 px-3.5 py-1.5 shadow-sm backdrop-blur-xl dark:bg-white/[0.06] dark:border-white/10">
            <Mail size={12} className="text-slate-400 dark:text-slate-500" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              jaylinjjjunious@gmail.com
            </span>
          </div>

          {/* Ebike Status Tag */}
          <div className="road-pill bg-white/62 border border-white/70 shadow-sm backdrop-blur-xl dark:bg-white/[0.06] dark:border-white/10 text-slate-700 dark:text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wide">
              Bike Ready
            </span>
          </div>

          {/* Theme Switcher Button */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="road-icon-button border-white/70 bg-white/70 text-slate-600 shadow-sm backdrop-blur-xl hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/10"
            title="Toggle color theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

      </div>
    </header>
  );
}



