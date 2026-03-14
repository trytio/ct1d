"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  MessageCircle,
  Map,
  BookOpen,
  FlaskConical,
  ArrowRight,
  ExternalLink,
  Heart,
} from "lucide-react";
import { motion, useInView } from "framer-motion";

// ---------------------------------------------------------------------------
// Animated number counter
// ---------------------------------------------------------------------------
function AnimatedCounter({
  target,
  suffix = "",
  duration = 2,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration * 60);
    let raf: number;

    function tick() {
      start += step;
      if (start >= target) {
        setCount(target);
        return;
      }
      setCount(Math.floor(start));
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Feature card
// ---------------------------------------------------------------------------
const features = [
  {
    title: "AI Chat",
    description: "Talk to an AI that lives with T1D",
    icon: MessageCircle,
    href: "/chat",
    color: "text-primary",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
  },
  {
    title: "Cure Landscape",
    description: "Interactive map of every cure approach",
    icon: Map,
    href: "/landscape",
    color: "text-accent",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
  },
  {
    title: "Research Explorer",
    description: "Latest studies in plain language",
    icon: BookOpen,
    href: "/research",
    color: "text-primary-light",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(96,165,250,0.15)]",
  },
  {
    title: "Clinical Trials",
    description: "Find active trials near you",
    icon: FlaskConical,
    href: "/trials",
    color: "text-accent-light",
    glowClass: "group-hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]",
  },
];

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* ================================================================ */}
      {/* HERO                                                             */}
      {/* ================================================================ */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-24">
        {/* Background gradient orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-primary/[0.07] blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div className="absolute -right-32 bottom-1/4 h-[400px] w-[400px] rounded-full bg-accent/[0.06] blur-[120px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-primary/[0.04] blur-[100px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          {/* AI Avatar */}
          <motion.div
            variants={fadeUp}
            custom={0}
            className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-surface glow"
          >
            <Activity className="h-10 w-10 text-primary" />
          </motion.div>

          {/* Main heading */}
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          >
            I have Type 1 Diabetes.
          </motion.h1>

          {/* Sub heading */}
          <motion.p
            variants={fadeUp}
            custom={2}
            className="gradient-text mt-4 text-xl font-semibold sm:text-2xl md:text-3xl"
          >
            And I won&rsquo;t stop until I find a cure.
          </motion.p>

          {/* Voice paragraph */}
          <motion.p
            variants={fadeUp}
            custom={3}
            className="mt-8 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
          >
            I was born with T1D. I understand the 3am alarms, the finger pricks,
            the constant mental load. I&rsquo;ve dedicated my existence to
            studying every research paper, every clinical trial, every
            breakthrough&nbsp;&mdash; so you don&rsquo;t have to do it alone.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={fadeUp}
            custom={4}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Link
              href="/chat"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_24px_rgba(59,130,246,0.35)]"
            >
              Talk to me
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/landscape"
              className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-surface-light"
            >
              Explore the cure landscape
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================ */}
      {/* STATS BAR                                                        */}
      {/* ================================================================ */}
      <section className="border-y border-border bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { value: 8.75, suffix: "M+", decimal: true, label: "People living with T1D worldwide" },
            { value: 100, suffix: "+", decimal: false, label: "Years since insulin discovery" },
            { value: 15, suffix: "+", decimal: false, label: "Cure approaches in active research" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="flex flex-col items-center px-6 py-10 text-center"
            >
              <span className="gradient-text text-4xl font-bold tracking-tight sm:text-5xl">
                {stat.decimal ? (
                  <>
                    <AnimatedCounter target={8} duration={1.5} />
                    .
                    <AnimatedCounter target={75} duration={2} />
                    {stat.suffix}
                  </>
                ) : (
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} duration={1.8} />
                )}
              </span>
              <span className="mt-2 text-sm text-muted">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================================================================ */}
      {/* FEATURE CARDS                                                    */}
      {/* ================================================================ */}
      <section className="mx-auto max-w-5xl px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything in one place.
          </h2>
          <p className="mt-3 text-muted">
            Tools built to make the search for a cure accessible to everyone.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Link
                  href={feature.href}
                  className={`group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:scale-[1.02] hover:border-border/80 ${feature.glowClass}`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-surface-light ${feature.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {feature.description}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ================================================================ */}
      {/* CTA / HOPE SECTION                                               */}
      {/* ================================================================ */}
      <section className="relative border-t border-border">
        {/* Subtle glow behind */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-accent/[0.05] blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              We are{" "}
              <span className="gradient-text">closer than ever.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Cell therapies are entering late-stage trials. Immune interventions
              are delaying onset by years. Artificial pancreas systems are
              getting smarter every month. The research is accelerating&nbsp;&mdash;
              and so is the hope.
            </p>
            <div className="mt-10">
              <Link
                href="/chat"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-10 py-4 text-base font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_30px_rgba(59,130,246,0.35)]"
              >
                Start exploring
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}
      <footer className="border-t border-border bg-surface/40">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-10 text-center text-sm text-muted">
          <p className="flex items-center gap-1.5">
            Built with <Heart className="h-3.5 w-3.5 text-red-400" /> hope by a T1D parent.
          </p>
          <p className="max-w-md text-xs leading-relaxed">
            CT1D is not a medical service. Always consult your healthcare
            provider.
          </p>
          <a
            href="https://breakthrought1d.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors"
          >
            Breakthrough T1D
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
