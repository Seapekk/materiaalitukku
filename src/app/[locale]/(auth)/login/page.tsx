"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { login, type AuthState } from "../actions";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    login,
    {}
  );

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 font-mono text-2xl font-semibold uppercase tracking-tight">
        🔐 {t("loginTitle")}
      </h1>
      <form
        action={formAction}
        className="space-y-4 border border-slate-200 bg-white p-6"
      >
        <label className="block">
          <span className="label-mono">{t("email")}</span>
          <input
            name="email"
            type="email"
            required
            className="input-brutal mt-1 font-mono"
          />
        </label>
        <label className="block">
          <span className="label-mono">{t("password")}</span>
          <input
            name="password"
            type="password"
            required
            className="input-brutal mt-1 font-mono"
          />
        </label>
        {state.error && (
          <p className="border-2 border-red-300 bg-red-100 px-3 py-2 font-mono text-xs font-bold uppercase text-red-700">
            {t(state.error)}
          </p>
        )}
        <button
          disabled={pending}
          className="btn-brutal w-full bg-[#1450A3] py-2.5 text-white hover:bg-brand-mid"
        >
          {t("loginButton")} →
        </button>
      </form>
    </div>
  );
}
