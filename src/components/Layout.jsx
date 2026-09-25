import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { Home, Compass, Map, Languages, Shield, Briefcase, Sparkles, User, Menu, X, Phone, BadgeCheck, ScanLine, Coins, Clock, BookOpen } from 'lucide-react';
import Logo from './Logo';
import GlobeLanguage from './GlobeLanguage';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', labelKey: 'nav_home', icon: Home, end: true },
  { to: '/explore', labelKey: 'nav_explore', icon: Compass },
  { to: '/map', labelKey: 'nav_map', icon: Map },
  { to: '/translate', labelKey: 'nav_translate', icon: Languages },
  { to: '/safety', labelKey: 'nav_safety', icon: Shield },
  { to: '/trips', labelKey: 'nav_trips', icon: Briefcase },
  { to: '/verify', labelKey: 'nav_verify', icon: BadgeCheck },
  { to: '/scan', labelKey: 'nav_scan', icon: ScanLine },
  { to: '/currency', labelKey: 'nav_currency', icon: Coins },
  { to: '/timezone', labelKey: 'nav_timezone', icon: Clock },
  { to: '/guide', labelKey: 'nav_guide', icon: BookOpen },
  { to: '/assistant', labelKey: 'nav_assistant', icon: Sparkles }
];

const MOBILE_NAV = [
  { to: '/', labelKey: 'nav_home', icon: Home, end: true },
  { to: '/explore', labelKey: 'nav_explore', icon: Compass },
  { to: '/map', labelKey: 'nav_map', icon: Map },
  { to: '/translate', labelKey: 'nav_translate', icon: Languages },
  { to: '/profile', labelKey: 'nav_profile', icon: User }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-card border-r border-border z-30">
        <div className="flex items-center gap-2.5 px-6 py-6">
          <Logo size={36} />
          <div>
            <div className="font-heading font-bold text-lg leading-none text-navy">NaviOra</div>
            <div className="text-[10px] tracking-wide text-text-secondary mt-1">{t('tagline')}</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-primary text-primary-foreground shadow-soft' : 'text-text-secondary hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon size={18} />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-3">
          <GlobeLanguage />
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-mint flex items-center justify-center text-navy font-semibold text-sm">
              {(user?.full_name || user?.email || 'T')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.full_name || 'Traveler'}</div>
              <button onClick={() => logout()} className="text-xs text-text-secondary hover:text-emergency">{t('sign_out')}</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 glass border-b border-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-heading font-bold text-navy">NaviOra</span>
        </div>
        <div className="flex items-center gap-1">
          <GlobeLanguage />
          <button onClick={() => setMobileOpen(true)} aria-label="Menu" className="p-2 rounded-lg hover:bg-muted">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-card h-full p-5 animate-fade-in flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Logo size={32} />
                <span className="font-heading font-bold text-navy">NaviOra</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-muted"><X size={20} /></button>
            </div>
            <nav className="flex-1 space-y-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-text-secondary hover:bg-muted'
                  )}
                >
                  <item.icon size={18} />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
            <button onClick={() => logout()} className="mt-4 text-sm text-emergency font-medium text-left px-2">{t('sign_out')}</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64 pb-28 lg:pb-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-border flex items-center justify-around px-2 h-16 safe-bottom">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-text-secondary'
            )}
          >
            <item.icon size={20} />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* Floating quick actions: chatbot + emergency call (dials 100) */}
      {location.pathname !== '/assistant' && (
        <div className="fixed z-40 right-4 bottom-24 lg:right-8 lg:bottom-8 flex flex-col gap-3">
          <Link
            to="/assistant"
            aria-label="Open NaviOra AI chat"
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-soft-lg flex items-center justify-center hover:scale-105 transition-transform"
          >
            <Sparkles size={24} />
          </Link>
          <a
            href="tel:100"
            aria-label="Emergency call 100"
            className="w-14 h-14 rounded-full bg-emergency text-white shadow-soft-lg flex items-center justify-center hover:scale-105 transition-transform animate-pulse"
          >
            <Phone size={24} />
          </a>
        </div>
      )}
    </div>
  );
}