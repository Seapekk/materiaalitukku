"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { login, type AuthState } from "../actions";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    login,
    {}
  );

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">{t("loginTitle")}</h1>
      <form action={formAction} className="space-y-4 bg-white p-6 rounded-lg border border-slate-200">
        <label className="block">
          <span className="text-sm font-medium">{t("email")}</span>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full border border-slate-300 rounded px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">{t("password")}</span>
          <input
            name="password"
            type="password"
            required
            className="mt-1 w-full border border-slate-300 rounded px-3 py-2"
          />
        </label>
        {state.error && (
          <p className="text-sm text-red-600">{t(state.error)}</p>
        )}
        <button
          disabled={pending}
          className="w-full bg-emerald-700 text-white rounded py-2 font-medium hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
        >
          {t("loginButton")}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-emerald-700 underline">
          {t("registerButton")}
        </Link>
      </p>
    </div>
  );
}
