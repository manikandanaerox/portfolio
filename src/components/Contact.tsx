"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpIcon, FileTextIcon, CheckCircleIcon, GithubLogoIcon, LinkedinLogoIcon, YoutubeLogoIcon, EnvelopeSimpleIcon, type Icon } from "@phosphor-icons/react";
import { contact, profile } from "../content";
import { scrollToId } from "../lib/scroll";
import { Reveal } from "./Reveal";

const SOCIAL_ICONS: Record<string, Icon> = { GitHub: GithubLogoIcon, LinkedIn: LinkedinLogoIcon, YouTube: YoutubeLogoIcon };

type Errors = Partial<Record<"name" | "email" | "message", string>>;

function validate(d: { name: string; email: string; message: string }): Errors {
  const e: Errors = {};
  if (!d.name.trim()) e.name = "Please add your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = "Enter a valid email address.";
  if (d.message.trim().length < 10) e.message = "A sentence or two helps (10 characters minimum).";
  return e;
}

const input =
  "w-full rounded-[10px] border bg-surface px-4 py-3 text-ink placeholder:text-muted/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40";

export function Contact() {
  const [data, setData] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate(data);
    setErrors(e);
    if (Object.keys(e).length) return;
    // No backend: hand off to the visitor's mail client with everything prefilled.
    const subject = encodeURIComponent(`Hello from ${data.name}`);
    const body = encodeURIComponent(`${data.message}\n\n${data.name}\n${data.email}`);
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  const field = (k: keyof typeof data) => ({
    id: k,
    name: k,
    value: data[k],
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `${k}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setData((d) => ({ ...d, [k]: e.target.value }));
      if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
    },
    className: `${input} ${errors[k] ? "border-accent" : "border-line-strong"}`,
  });

  return (
    <section id="contact" className="relative flex min-h-[100dvh] flex-col justify-between pt-24 md:pt-36">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 px-5 md:grid-cols-12 md:px-10">
        <div className="md:col-span-7 lg:col-span-6">
          <Reveal>
            <p className="font-mono text-xs text-accent">Contact</p>
            <h2 className="display mt-3 text-[2.4rem] font-semibold leading-[1] md:text-5xl lg:text-6xl">{contact.headline}</h2>
            <p className="mt-5 max-w-[44ch] text-muted md:text-lg">{contact.sub}</p>
            <a
              href={`mailto:${profile.email}`}
              className="mt-6 inline-block font-mono text-base text-ink underline decoration-accent decoration-2 underline-offset-[6px] transition-colors hover:text-accent md:text-lg"
            >
              {profile.email}
            </a>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
              <span>{profile.location}</span>
              <a href={profile.cv} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-ink transition-colors hover:text-accent">
                <FileTextIcon size={16} weight="bold" />
                View CV (PDF)
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <AnimatePresence mode="wait" initial={false}>
              {sent ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-10 rounded-[18px] border border-line bg-surface p-6"
                  role="status"
                >
                  <CheckCircleIcon size={28} weight="duotone" className="text-accent" />
                  <p className="mt-3 text-lg font-medium">Your email app should be open with the message ready.</p>
                  <p className="mt-1 text-sm text-muted">
                    If nothing opened, write to{" "}
                    <a className="text-ink underline decoration-accent underline-offset-4" href={`mailto:${profile.email}`}>
                      {profile.email}
                    </a>
                    .
                  </p>
                  <button type="button" onClick={() => setSent(false)} className="mt-5 text-sm font-medium text-accent hover:underline">
                    Write another message
                  </button>
                </motion.div>
              ) : (
                <motion.form key="form" noValidate onSubmit={onSubmit} exit={{ opacity: 0 }} className="mt-10 grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label htmlFor="name" className="text-sm font-medium">Name</label>
                      <input type="text" autoComplete="name" placeholder="Your name" {...field("name")} />
                      {errors.name && <p id="name-error" className="text-sm text-accent">{errors.name}</p>}
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="email" className="text-sm font-medium">Email</label>
                      <input type="email" autoComplete="email" placeholder="you@company.com" {...field("email")} />
                      {errors.email && <p id="email-error" className="text-sm text-accent">{errors.email}</p>}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="message" className="text-sm font-medium">Message</label>
                    <textarea rows={4} placeholder="What are you building?" {...field("message")} />
                    {errors.message ? (
                      <p id="message-error" className="text-sm text-accent">{errors.message}</p>
                    ) : (
                      <p className="text-sm text-muted">Sending opens your email app with this message filled in.</p>
                    )}
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-accent px-5 py-3.5 text-sm font-semibold text-accent-ink transition-transform duration-300 ease-out-expo hover:-translate-y-0.5 active:translate-y-px"
                    >
                      <EnvelopeSimpleIcon size={17} weight="bold" />
                      Send message
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </Reveal>
        </div>
      </div>

      <footer className="mx-auto mt-24 w-full max-w-[1400px] px-5 pb-28 md:px-10 md:pb-8">
        <div className="flex flex-col gap-6 border-t border-line pt-8 md:flex-row md:items-center md:gap-10">
          <div className="text-sm text-muted">
            <p>
              © {new Date().getFullYear()} {profile.name}
            </p>
            <p className="mt-2 text-xs">All 3D scenes are drawn live in the browser, from my own models.</p>
          </div>
          <ul className="flex items-center gap-2">
            {profile.socials.map((s) => {
              const I = SOCIAL_ICONS[s.label];
              return (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="grid h-10 w-10 place-items-center rounded-[10px] border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
                  >
                    {I && <I size={18} />}
                  </a>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => scrollToId("home")}
                aria-label="Back to top"
                className="ml-2 grid h-10 w-10 place-items-center rounded-[10px] bg-ink text-bg transition-transform hover:-translate-y-0.5"
              >
                <ArrowUpIcon size={18} weight="bold" />
              </button>
            </li>
          </ul>
        </div>
      </footer>
    </section>
  );
}
