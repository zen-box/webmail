import React, { useState, useEffect } from 'react';
import { GradientSphere } from './GradientSphere';
import { useI18n } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { fetchConfig } from '../api/client';
import { SunIcon, MoonIcon, MonitorIcon } from './Icons';

interface LoginPageProps {
  onLoginSuccess: (user: { name: string; email: string; avatar: string }) => void;
  onCancel?: () => void;
  isAddingAccount?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onCancel,
  isAddingAccount = false,
}) => {
  const { t, lang, setLang } = useI18n();
  const { mode, setMode } = useTheme();

  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig().then((cfg) => {
      if (cfg && cfg.defaultServerUrl) {
        setServerUrl(cfg.defaultServerUrl.replace(/\/+$/, ''));
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: serverUrl.trim().replace(/\/+$/, ''),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setErrorMessage(data.error || 'Failed to authenticate with mail server.');
      }
    } catch (err: any) {
      setErrorMessage('Network connection error: ' + (err?.message || 'Server unreachable'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background p-4 select-none relative">
      {/* Top right quick controls: Lang & Theme */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <button
          type="button"
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          className="px-2.5 py-1 text-xs font-medium rounded-full bg-surface border border-separator/60 text-foreground hover:bg-default/50 transition-colors shadow-xs cursor-pointer"
        >
          {lang === 'zh' ? 'English' : '简体中文'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark')}
          className="p-1.5 rounded-full bg-surface border border-separator/60 text-foreground hover:bg-default/50 transition-colors shadow-xs cursor-pointer"
          title={t('theme')}
        >
          {mode === 'dark' ? (
            <MoonIcon className="size-3.5" />
          ) : mode === 'light' ? (
            <SunIcon className="size-3.5" />
          ) : (
            <MonitorIcon className="size-3.5" />
          )}
        </button>
      </div>

      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-40 -left-40 size-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-separator/50 bg-surface/90 backdrop-blur-xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header branding */}
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="size-14 rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center p-0.5">
            <GradientSphere from="#006FEE" via="#7828C8" to="#F31260" size={48} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              webmaill
            </h1>
            <p className="text-xs text-muted mt-1">
              {isAddingAccount ? t('addAccount') : 'webmaill'}
            </p>
          </div>
        </div>

        {/* Error message alert */}
        {errorMessage && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 animate-in fade-in">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="size-4 shrink-0 mt-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Login Form: Server URL is hidden and read from config.yml */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              {t('emailAddress')}
            </label>
            <div className="relative flex items-center">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                required
                autoFocus
                className="w-full rounded-xl border border-separator/60 bg-default/20 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:border-primary focus:bg-background focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">
              {t('password')}
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-xl border border-separator/60 bg-default/20 px-3.5 py-2.5 pr-10 text-xs text-foreground placeholder:text-muted/60 focus:border-primary focus:bg-background focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-muted hover:text-foreground cursor-pointer transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 mt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-xl bg-default/40 hover:bg-default/60 text-foreground py-2.5 px-4 text-xs font-medium transition-all cursor-pointer"
              >
                {t('discard')}
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-xl bg-[#006FEE] hover:bg-[#005BC4] active:bg-[#004BB0] text-white py-2.5 px-4 text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin size-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>{t('loggingIn')}</span>
                </>
              ) : (
                <span>{isAddingAccount ? t('addAccount') : t('login')}</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer branding with GitHub link */}
        <div className="mt-6 pt-4 border-t border-separator/40 text-[11px] text-muted text-center flex flex-col items-center justify-center gap-1">
          <a
            href="https://github.com/zen-box/webmail"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium tracking-wide text-muted hover:text-foreground transition-colors hover:underline cursor-pointer"
          >
            <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>webmail</span>
          </a>
        </div>
      </div>
    </div>
  );
};
