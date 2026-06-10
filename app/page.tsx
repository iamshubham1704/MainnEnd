"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface FAQItem {
  q: string;
  a: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleActionClick = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/auth/login");
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs: FAQItem[] = [
    {
      q: "How does the AI personalization work?",
      a: "ColdMail AI reads your uploaded resume text and analyzes the recipient's target role and company. Using Gemini 2.5 Flash, it highlights relevant projects and experiences from your profile and writes a highly relevant, customized message specifically tailored for each company."
    },
    {
      q: "Will my email address get flagged as spam?",
      a: "No. Standard newsletter blasts trigger spam filters. ColdMail AI avoids this by dispatching emails sequentially (one by one) with a built-in rate-limiting buffer of 1.5 seconds. This mimics authentic human sending patterns and keeps your email deliverability score high."
    },
    {
      q: "Is it safe to store my SMTP password here?",
      a: "Yes. We require you to use an App Password (a 16-character code generated specifically for this application under your provider's security settings) rather than your main email password. This can be revoked at any time, keeping your primary credentials fully secure."
    },
    {
      q: "Can I review and edit the generated emails before they are sent?",
      a: "Absolutely! After the AI personalizes your drafts, you can review each contact's custom email text in the list. You can manually adjust the content, add personal touches, and save the changes before triggering the sender queue."
    }
  ];

  return (
    <div className="min-h-screen bg-[#020205] text-[#f4f4f7] font-sans relative overflow-x-hidden flex flex-col justify-between">
      
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl -z-10" />

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#020205]/75 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Project Name / Brand */}
          <div className="flex items-center gap-2 select-none cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse glow-indigo" />
            <span className="text-base sm:text-lg font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-wide">
              ColdMail AI
            </span>
          </div>

          {/* Dynamic Action Button in Navbar */}
          <button
            onClick={handleActionClick}
            className="px-4 sm:px-5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all font-semibold text-xs sm:text-sm text-[#f4f4f7] active:scale-[0.98] cursor-pointer shadow-sm"
          >
            {user ? "Go to Dashboard" : "Login"}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-24 flex flex-col lg:flex-row items-center gap-12 sm:gap-16">
        
        {/* Left column - Text content */}
        <div className="flex-1 space-y-6 sm:space-y-8 text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight sm:leading-none bg-linear-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            AI-Powered Cold Outreach Designed for Internships
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Launch customized email campaigns built directly around your resume. Personalize every draft sequentially with AI to fit the hiring manager&apos;s company and role, then dispatch them safely.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button
              onClick={handleActionClick}
              className="py-3 px-8 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all font-bold text-white text-xs sm:text-sm shadow-lg shadow-indigo-950/40 active:scale-[0.98] cursor-pointer glow-indigo"
            >
              Get Started Free
            </button>
            <a
              href="#features"
              className="py-3 px-8 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all font-semibold text-xs sm:text-sm text-center active:scale-[0.98]"
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* Right column - Graphic Artwork */}
        <div className="flex-1 w-full max-w-md lg:max-w-none flex justify-center">
          <div className="relative group">
            {/* Soft glowing ambient shadow */}
            <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-indigo-500 to-purple-500 opacity-20 blur-xl group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
            <Image
              src="/images/hero_email_art.png"
              alt="ColdMail AI Digital Artwork"
              width={600}
              height={600}
              className="relative rounded-2xl border border-white/10 shadow-2xl w-full max-w-md object-cover transform hover:scale-[1.01] transition-transform duration-300"
            />
          </div>
        </div>
      </main>

      {/* How It Works Section */}
      <section className="border-t border-white/5 bg-[#04040a] py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-2.5xl sm:text-3.5xl font-extrabold text-white">
              How ColdMail AI Works
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Get from campaign setup to personalized outreach inbox placement in 4 simple steps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
              <div className="absolute top-4 right-4 text-3xl font-extrabold text-zinc-800/40 select-none">
                01
              </div>
              <h3 className="text-sm font-bold text-white mb-2 pt-6">Upload Resume</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Upload your resume PDF and enter your basic email template with placeholder variables like <code className="text-indigo-400">{"{{company}}"}</code> and <code className="text-indigo-400">{"{{role}}"}</code>.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
              <div className="absolute top-4 right-4 text-3xl font-extrabold text-zinc-800/40 select-none">
                02
              </div>
              <h3 className="text-sm font-bold text-white mb-2 pt-6">Import Contacts</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Copy and paste contact rows directly from Excel or Google Sheets (CSV/TSV formats). The system maps names, emails, companies, and roles instantly.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
              <div className="absolute top-4 right-4 text-3xl font-extrabold text-zinc-800/40 select-none">
                03
              </div>
              <h3 className="text-sm font-bold text-white mb-2 pt-6">AI Personalizer</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Run our personalization studio. Gemini writes customized paragraphs linking your actual experience to each targeted internship position.
              </p>
            </div>

            {/* Step 4 */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-all duration-300">
              <div className="absolute top-4 right-4 text-3xl font-extrabold text-zinc-800/40 select-none">
                04
              </div>
              <h3 className="text-sm font-bold text-white mb-2 pt-6">Safe Dispatch</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect your SMTP App Password. The queue sends emails one-by-one with safety intervals, attaching your resume to each outbound mail.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section id="features" className="border-t border-white/5 bg-[#020205] py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-2.5xl sm:text-3.5xl font-extrabold text-white">
              Platform Features
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Tools specifically engineered for student candidate campaigns.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Feature 1 */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4 hover:border-indigo-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center glow-indigo">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">Contextual AI Customization</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                No generic boilerplate copy. The AI maps the specific tech stack and project metrics from your resume to the requirements of the job description, writing unique paragraphs for each company.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4 hover:border-purple-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-center glow-purple">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">Anti-Spam Sequential Queue</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Maintains a strict 1.5s delay limit between each dispatch. This sequential behavior keeps emails out of Google promotions/spam tabs and places them directly into primary inboxes.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4 hover:border-emerald-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center glow-emerald">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">Resume Attachment Integration</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Connect a resume PDF to your email drafts automatically. The dispatcher attaches the document to every outgoing SMTP transmission seamlessly.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-4 hover:border-indigo-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center glow-indigo">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">Excel/CSV Bulk Importer</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Paste raw rows directly from Google Sheets or Excel. The intelligent parser maps columns to structural properties, cleaning up spacing automatically.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Frequently Asked Questions (FAQ) Section */}
      <section className="border-t border-white/5 bg-[#04040a] py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-2.5xl sm:text-3.5xl font-extrabold text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Clear answers to standard questions about ColdMail AI.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="glass-panel rounded-2xl overflow-hidden transition-all duration-300 border border-white/5"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex justify-between items-center p-5 text-left font-bold text-xs sm:text-sm text-white hover:bg-white/2 transition-colors focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    <svg
                      className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-48 border-t border-white/5" : "max-h-0"
                    }`}
                  >
                    <div className="p-5 text-xs sm:text-sm text-zinc-400 leading-relaxed bg-[#020205]/40">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#020205] py-8 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            &copy; 2026 ColdMail AI. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            All systems operational
          </div>
        </div>
      </footer>

    </div>
  );
}
