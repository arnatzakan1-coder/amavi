"use client";
import { useActionState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import { loginAction, registerAction, oauthAction, type AuthState } from "@/app/actions/auth";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.37 12.73c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.98c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.75-.96 2.79 1.02.08 2.05-.52 2.68-1.27z" />
    </svg>
  );
}

export function AuthForm({ mode, next, oauth, registered = false }: { mode: "login" | "register"; next: string; oauth: { google: boolean; apple: boolean }; registered?: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? loginAction : registerAction, undefined);
  const err = state?.error;
  return (
    <div className="card p-6 sm:p-9 w-full max-w-md">
      <h1 className="text-4xl">{mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}</h1>
      {registered && <p role="status" className="mt-4 text-sm text-ok">{t.auth.registered}</p>}

      {(oauth.google || oauth.apple) && (
        <div className="mt-7 grid gap-3">
          {oauth.google && (
            <form action={oauthAction}>
              <input type="hidden" name="provider" value="google" />
              <input type="hidden" name="next" value={next} />
              <button className="btn btn-ghost w-full normal-case tracking-normal text-sm">
                <GoogleIcon /> {t.auth.google}
              </button>
            </form>
          )}
          {oauth.apple && (
            <form action={oauthAction}>
              <input type="hidden" name="provider" value="apple" />
              <input type="hidden" name="next" value={next} />
              <button className="btn btn-ghost w-full normal-case tracking-normal text-sm">
                <AppleIcon /> {t.auth.apple}
              </button>
            </form>
          )}
          <div className="flex items-center gap-3 text-xs text-muted my-1" aria-hidden>
            <span className="h-px flex-1 bg-line" /> {t.auth.or} <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      )}

      <form action={action} className="mt-7 grid gap-4" noValidate={false}>
        <input type="hidden" name="next" value={next} />
        {mode === "register" && (
          <div>
            <label htmlFor="name" className="field-label">{t.auth.name}</label>
            <input id="name" name="name" required maxLength={80} autoComplete="name" className="field" defaultValue={state?.fields?.name} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="field-label">{t.auth.email}</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className="field"
            defaultValue={state?.fields?.email}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? "auth-error" : undefined}
          />
        </div>
        <div>
          <label htmlFor="password" className="field-label">{t.auth.password}</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="field"
            aria-describedby="pw-hint"
            aria-invalid={err ? true : undefined}
          />
          <p id="pw-hint" className="mt-1.5 text-xs text-muted">{t.auth.passwordHint}</p>
        </div>
        {err && (
          <p id="auth-error" role="alert" className="field-error">
            {{ exists: t.auth.exists, invalid: t.auth.invalid, name: t.auth.nameRequired, email: t.auth.emailInvalid, password: t.auth.passwordShort, server: t.auth.serverError }[err]}
          </p>
        )}
        <button className="btn btn-gold mt-2" disabled={pending}>
          {pending ? t.common.loading : mode === "login" ? t.auth.login : t.auth.register}
        </button>
        {mode === "register" && <p className="text-xs text-muted">{t.auth.consent}</p>}
      </form>

      <p className="mt-6 text-sm text-cream/75">
        {mode === "login" ? t.auth.noAccount : t.auth.haveAccount}{" "}
        <Link className="text-champagne underline underline-offset-4" href={`/${mode === "login" ? "register" : "login"}?next=${encodeURIComponent(next)}`}>
          {mode === "login" ? t.auth.register : t.auth.login}
        </Link>
      </p>
      {!oauth.google && !oauth.apple && <p className="mt-4 text-xs text-muted-dark">{t.auth.oauthOff}</p>}
    </div>
  );
}
