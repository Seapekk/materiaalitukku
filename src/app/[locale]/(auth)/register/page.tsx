"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { register, type AuthState } from "../actions";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    register,
    {}
  );

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">{t("registerTitle")}</h1>
      {state.message ? (
        <p className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4">
          {t(state.message)}
        </p>
      ) : (
        <form action={formAction} className="space-y-4 bg-white p-6 rounded-lg border border-slate-200">
          <label className="block">
            <span className="text-sm font-medium">{t("displayName")}</span>
            <input
              name="displayName"
              type="text"
              required
              className="mt-1 w-full border border-slate-300 rounded px-3 py-2"
            />
          </label>
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
              minLength={8}
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
            {t("registerButton")}
          </button>
        </form>
      )}
      <p className="mt-4 text-sm text-slate-600">
        {t("haveAccount")}{" "}
        <Link href="/login" className="text-emerald-700 underline">
          {t("loginButton")}
        </Link>
      </p>
    </div>
  );
}
