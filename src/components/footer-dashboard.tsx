"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FooterConfig, FooterLink } from "@/lib/types";
import { saveFooterConfig, type FooterConfigInput } from "@/app/[locale]/admin/footer/actions";

const EMPTY_LINK: FooterLink = { title: "", url: "" };

function padLinks(links: FooterLink[]): FooterLink[] {
  const padded = [...links];
  while (padded.length < 3) padded.push({ ...EMPTY_LINK });
  return padded.slice(0, 3);
}

export function FooterDashboard({ config }: { config: FooterConfig }) {
  const router = useRouter();
  const [form, setForm] = useState<FooterConfigInput>({
    companyName: config.company_name,
    description: config.description,
    email: config.email,
    phone: config.phone,
    address: config.address,
    copyright: config.copyright,
    links: padLinks(config.links),
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const updateLink = (index: number, patch: Partial<FooterLink>) => {
    setForm((f) => ({
      ...f,
      links: f.links.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));
  };

  const submit = () => {
    startTransition(async () => {
      const res = await saveFooterConfig(form);
      if (res.error) setNotice("Something went wrong. Please try again.");
      else {
        setNotice("Saved.");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {notice && (
        <p className="admin-card border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {notice}
        </p>
      )}

      <div className="admin-card space-y-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <label className="admin-label">Company name (badge)</label>
            <input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Materiaalitukku.com B2B"
              className="admin-input h-9"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="admin-label">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="admin-input"
            />
          </div>
          <div className="space-y-1">
            <label className="admin-label">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="admin-input h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="admin-label">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="admin-input h-9"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="admin-label">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="admin-input h-9"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="admin-label">Copyright text</label>
            <input
              value={form.copyright}
              onChange={(e) => setForm({ ...form, copyright: e.target.value })}
              placeholder="All rights reserved."
              className="admin-input h-9"
            />
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="admin-label">Extra links (max 3)</label>
          {form.links.map((link, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={link.title}
                onChange={(e) => updateLink(i, { title: e.target.value })}
                placeholder="Link text"
                className="admin-input h-9 flex-1"
              />
              <input
                value={link.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                placeholder="https://…"
                className="admin-input h-9 flex-1"
              />
            </div>
          ))}
        </div>

        <button
          disabled={pending}
          onClick={submit}
          className="admin-btn admin-btn-primary"
        >
          Save
        </button>
      </div>
    </div>
  );
}
