"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  template: string;
  fromEmail: string;
  smtpPass?: string;
  geminiApiKey: string;
  resumeName?: string;
  createdAt: string;
}

interface Recipient {
  _id: string;
  email: string;
  name: string;
  company: string;
  role: string;
  personalizedBody: string;
  status: "pending" | "generating" | "ready" | "queued" | "sending" | "sent" | "failed";
  error?: string;
  sentAt?: string;
}

interface QueueStats {
  total: number;
  pending: number;
  ready: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  isProcessing: boolean;
}

export default function Dashboard() {
  // Auth State
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();

  // Mobile Menu State
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Campaigns State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  
  // Campaign Form State
  const [campName, setCampName] = useState("");
  const [campSubject, setCampSubject] = useState("");
  const [campTemplate, setCampTemplate] = useState("");
  const [campFromEmail, setCampFromEmail] = useState("");
  const [campSmtpPass, setCampSmtpPass] = useState("");
  const [campGeminiKey, setCampGeminiKey] = useState("");
  const [campResume, setCampResume] = useState<File | null>(null);
  const [campResumeName, setCampResumeName] = useState("");
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);

  // Global Settings State
  const [globalGeminiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("global_gemini_api_key") || "";
    }
    return "";
  });
  const [globalSenderEmail, setGlobalSenderEmail] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("global_sender_email") || "";
    }
    return "";
  });
  const [globalSmtpPass, setGlobalSmtpPass] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("global_smtp_pass") || "";
    }
    return "";
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAppPasswordModal, setShowAppPasswordModal] = useState(false);

  // Recipients State
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [activeTab, setActiveTab] = useState<"recipients" | "personalize" | "dispatcher">("recipients");
  
  // Add Recipient State
  const [singleEmail, setSingleEmail] = useState("");
  const [singleName, setSingleName] = useState("");
  const [singleCompany, setSingleCompany] = useState("");
  const [singleRole, setSingleRole] = useState("");
  const [csvText, setCsvText] = useState("");
  const [showImportArea, setShowImportArea] = useState(false);

  // AI Generation State
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0 });

  // Queue State
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    ready: 0,
    queued: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    isProcessing: false,
  });
  const [logs, setLogs] = useState<string[]>([]);
  const isPollingQueue = useRef(false);

  // Preview & Edit Recipient State
  const [previewRecipient, setPreviewRecipient] = useState<Recipient | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [isSavingBody, setIsSavingBody] = useState(false);

  // Fetch recipients
  const fetchRecipients = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaign/${campaignId}/recipients`);
      if (res.ok) {
        const data = await res.json();
        setRecipients(data);
      }
    } catch (err) {
      console.error("Failed to load recipients", err);
    }
  };

  // Fetch queue statistics
  const fetchQueueStats = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaign/${campaignId}/send`);
      if (res.ok) {
        const data = await res.json();
        setQueueStats(data);
        
        // Populate logs dynamically based on statuses
        if (data.isProcessing) {
          const activeLog = `Email dispatcher running: ${data.sent} sent, ${data.failed} failed, ${data.queued} queued.`;
          setLogs(prev => {
            if (prev.length === 0 || prev[prev.length - 1] !== activeLog) {
              return [...prev.slice(-30), activeLog];
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error("Failed to load queue stats", err);
    }
  };

  // Select campaign workspace
  const selectCampaign = (campaign: Campaign) => {
    setActiveCampaign(campaign);
    setIsCreatingCampaign(false);
    
    // Fill campaign settings
    setCampName(campaign.name);
    setCampSubject(campaign.subject);
    setCampTemplate(campaign.template);
    setCampFromEmail(campaign.fromEmail || globalSenderEmail || user?.email || "");
    setCampSmtpPass(campaign.smtpPass || globalSmtpPass || "");
    setCampGeminiKey(campaign.geminiApiKey || "");
    setCampResumeName(campaign.resumeName || "");
    setCampResume(null);

    // Fetch related records
    fetchRecipients(campaign._id);
    fetchQueueStats(campaign._id);
    setLogs([]);
  };

  // Fetch all campaigns
  const fetchCampaigns = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/campaign", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        if (data.length > 0 && !activeCampaign) {
          selectCampaign(data[0]);
        }
      } else if (res.status === 401) {
        logout();
        router.push("/auth/login");
      }
    } catch (err) {
      console.error("Failed to load campaigns", err);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [isLoading, user, router]);

  // Load Initial Settings & Campaigns
  useEffect(() => {
    if (token) {
      Promise.resolve().then(() => {
        fetchCampaigns();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Poll queue status if queue is processing
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (activeCampaign && (queueStats.queued > 0 || queueStats.sending > 0 || queueStats.isProcessing)) {
      isPollingQueue.current = true;
      intervalId = setInterval(() => {
        fetchQueueStats(activeCampaign._id);
        fetchRecipients(activeCampaign._id);
      }, 2000);
    } else {
      isPollingQueue.current = false;
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeCampaign, queueStats.queued, queueStats.sending, queueStats.isProcessing]);

  // Handle Campaign Save / Edit
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName || !campSubject || !campTemplate) {
      alert("Please enter a name, subject and template.");
      return;
    }

    setIsSavingCampaign(true);
    const formData = new FormData();
    formData.append("name", campName);
    formData.append("subject", campSubject);
    formData.append("template", campTemplate);
    formData.append("fromEmail", campFromEmail);
    formData.append("smtpPass", campSmtpPass);
    formData.append("geminiApiKey", campGeminiKey);
    if (campResume) {
      formData.append("resume", campResume);
    }

    const url = activeCampaign && !isCreatingCampaign
      ? `/api/campaign/${activeCampaign._id}`
      : "/api/campaign";

    const method = activeCampaign && !isCreatingCampaign ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        alert(method === "POST" ? "Campaign created!" : "Campaign updated!");
        
        // Save to global local storage
        localStorage.setItem("global_sender_email", campFromEmail);
        localStorage.setItem("global_smtp_pass", campSmtpPass);
        setGlobalSenderEmail(campFromEmail);
        setGlobalSmtpPass(campSmtpPass);

        await fetchCampaigns();
        
        // If creating, select the new one. If updating, select it again to refresh
        const targetId = data.campaignId || (activeCampaign ? activeCampaign._id : "");
        if (targetId) {
          const resSingle = await fetch(`/api/campaign/${targetId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resSingle.ok) {
            const freshCampaign = await resSingle.json();
            selectCampaign(freshCampaign);
          }
        }
      } else {
        const errData = await res.json();
        alert(`Error saving campaign: ${errData.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save campaign");
    } finally {
      setIsSavingCampaign(false);
    }
  };

  // Create Campaign Mode
  const startNewCampaign = () => {
    setActiveCampaign(null);
    setIsCreatingCampaign(true);
    setCampName("");
    setCampSubject("");
    setCampTemplate("Hi {{name}},\n\nI hope this email finds you well.\n\nI am writing to express my interest in the {{role}} internship at {{company}}.\n\nBest regards,\n[Your Name]");
    setCampFromEmail(globalSenderEmail || user?.email || "");
    setCampSmtpPass(globalSmtpPass || "");
    setCampGeminiKey("");
    setCampResume(null);
    setCampResumeName("");
    setRecipients([]);
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign and all its recipients?")) return;

    try {
      const res = await fetch(`/api/campaign/${campaignId}`, { method: "DELETE" });
      if (res.ok) {
        alert("Campaign deleted!");
        setActiveCampaign(null);
        setIsCreatingCampaign(false);
        fetchCampaigns();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete campaign");
    }
  };

  // Add Single Recipient
  const handleAddSingleRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) return;
    if (!singleEmail) {
      alert("Email is required");
      return;
    }

    try {
      const res = await fetch(`/api/campaign/${activeCampaign._id}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: singleEmail,
          name: singleName,
          company: singleCompany,
          role: singleRole,
        }),
      });

      if (res.ok) {
        setSingleEmail("");
        setSingleName("");
        setSingleCompany("");
        setSingleRole("");
        fetchRecipients(activeCampaign._id);
        fetchQueueStats(activeCampaign._id);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Parse CSV/TSV input
  const handleCSVImport = async () => {
    if (!activeCampaign || !csvText) return;
    
    interface CSVRecipient {
      email: string;
      name?: string;
      company?: string;
      role?: string;
      [key: string]: string | undefined;
    }

    // A robust, native client-side CSV parser
    const lines = csvText.split(/\r?\n/);
    const parsed: CSVRecipient[] = [];
    let headers: string[] = ["email", "name", "company", "role"];
    let startIndex = 0;

    if (lines.length > 0) {
      const firstLine = lines[0].toLowerCase();
      if (firstLine.includes("email") || firstLine.includes("@")) {
        // Headers exist
        headers = lines[0].split(/[,\t]/).map(h => h.trim().toLowerCase());
        startIndex = 1;
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(/[,\t]/).map(c => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length === 0 || !cols[0]) continue;

      const row: CSVRecipient = { email: "" };
      headers.forEach((header, idx) => {
        let key = "email";
        if (header.includes("name")) key = "name";
        else if (header.includes("company") || header.includes("org")) key = "company";
        else if (header.includes("role") || header.includes("title") || header.includes("position")) key = "role";
        else if (header.includes("email") || header.includes("@")) key = "email";
        else key = header;

        row[key] = cols[idx] || "";
      });

      // Fallback positioning mapping if column names were weird
      if (!row.email) {
        const emailCol = cols.find(c => c.includes("@"));
        if (emailCol) {
          row.email = emailCol;
          row.name = cols[0] === emailCol ? (cols[1] || "") : cols[0];
          row.company = cols[2] || "";
          row.role = cols[3] || "";
        }
      }

      if (row.email) {
        parsed.push(row);
      }
    }

    if (parsed.length === 0) {
      alert("No valid email addresses found. Check CSV format.");
      return;
    }

    try {
      const res = await fetch(`/api/campaign/${activeCampaign._id}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      if (res.ok) {
        setCsvText("");
        setShowImportArea(false);
        fetchRecipients(activeCampaign._id);
        fetchQueueStats(activeCampaign._id);
        alert(`Successfully imported ${parsed.length} recipients.`);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
      alert("Import failed");
    }
  };

  // Delete recipient
  const handleDeleteRecipient = async (recipientId: string) => {
    if (!activeCampaign) return;
    try {
      const res = await fetch(`/api/campaign/${activeCampaign._id}/recipients/${recipientId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchRecipients(activeCampaign._id);
        fetchQueueStats(activeCampaign._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Preview Modal
  const openPreview = (recipient: Recipient) => {
    setPreviewRecipient(recipient);
    setEditedBody(recipient.personalizedBody || "");
  };

  // Save Manual Personalization edits
  const handleSavePreview = async () => {
    if (!activeCampaign || !previewRecipient) return;
    setIsSavingBody(true);

    try {
      const res = await fetch(`/api/campaign/${activeCampaign._id}/recipients/${previewRecipient._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizedBody: editedBody,
        }),
      });

      if (res.ok) {
        fetchRecipients(activeCampaign._id);
        fetchQueueStats(activeCampaign._id);
        setPreviewRecipient(null);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingBody(false);
    }
  };

  // Run AI personalization loop sequentially
  const handleGenerateAI = async () => {
    if (!activeCampaign) return;
    
    const targetApiKey = activeCampaign.geminiApiKey || globalGeminiKey || "";

    // Filter recipients with status 'pending', 'ready', or 'failed'
    const pending = recipients.filter(r => r.status === "pending" || r.status === "ready" || r.status === "failed");
    if (pending.length === 0) {
      alert("No pending or ready recipients to personalize.");
      return;
    }

    setIsGeneratingAI(true);
    setAiProgress({ current: 0, total: pending.length });

    // Sequentially process each recipient to avoid rate limit spikes and monitor real-time progress
    for (let i = 0; i < pending.length; i++) {
      const recipient = pending[i];
      
      // Update loading status locally for this index
      setRecipients(prev =>
        prev.map(r => r._id === recipient._id ? { ...r, status: "generating" } : r)
      );

      try {
        const realRes = await fetch(`/api/campaign/${activeCampaign._id}/personalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientId: recipient._id,
            customApiKey: targetApiKey,
          }),
        });

        if (realRes.ok) {
          const data = await realRes.json();
          setRecipients(prev =>
            prev.map(r => r._id === recipient._id ? { ...r, status: "ready", personalizedBody: data.personalizedBody } : r)
          );
        } else {
          const errData = await realRes.json();
          setRecipients(prev =>
            prev.map(r => r._id === recipient._id ? { ...r, status: "failed", error: errData.error } : r)
          );
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
        setRecipients(prev =>
          prev.map(r => r._id === recipient._id ? { ...r, status: "failed", error: errorMsg } : r)
        );
      }

      setAiProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsGeneratingAI(false);
    fetchRecipients(activeCampaign._id);
    fetchQueueStats(activeCampaign._id);
  };

  // Start Queue Email Dispatch
  const handleStartQueue = async () => {
    if (!activeCampaign) return;
    
    // Check if there are any ready or failed recipients
    const ready = recipients.filter(r => r.status === "ready" || r.status === "failed");
    if (ready.length === 0) {
      alert("No 'Ready' or 'Failed' emails to send. Please run AI Personalization first.");
      return;
    }

    try {
      const res = await fetch(`/api/campaign/${activeCampaign._id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_all" }),
      });

      if (res.ok) {
        setLogs(prev => [...prev, "Email dispatch loop triggered. Initializing queue..."]);
        fetchQueueStats(activeCampaign._id);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Pause Queue Email Dispatch
  const handlePauseQueue = async () => {
    if (!activeCampaign) return;

    try {
      const res = await fetch(`/api/campaign/${activeCampaign._id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });

      if (res.ok) {
        setLogs(prev => [...prev, "Queue paused. Remaining recipients reverted to Ready."]);
        fetchQueueStats(activeCampaign._id);
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save global settings
  const handleSaveGlobalSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("global_gemini_api_key", globalGeminiKey);
    localStorage.setItem("global_sender_email", globalSenderEmail);
    localStorage.setItem("global_smtp_pass", globalSmtpPass);
    setShowSettingsModal(false);
    alert("Global Settings saved locally.");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-zinc-800 text-zinc-400">Draft Pending</span>;
      case "generating":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-950/50 text-purple-300 animate-pulse border border-purple-500/20">Generating AI...</span>;
      case "ready":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-indigo-950/50 text-indigo-300 border border-indigo-500/20">Ready to Send</span>;
      case "queued":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-950/50 text-amber-300 border border-amber-500/20">Queued</span>;
      case "sending":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-950/50 text-blue-300 animate-pulse border border-blue-500/20">Sending...</span>;
      case "sent":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-950/50 text-emerald-300 border border-emerald-500/20">Sent Successfully</span>;
      case "failed":
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-rose-950/50 text-rose-300 border border-rose-500/20">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-zinc-800 text-zinc-400">{status}</span>;
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#020205] text-[#f4f4f7]">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  // Redirect to login happens in useEffect, but this is a safety check
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen bg-[#020205] text-[#f4f4f7] font-sans overflow-hidden">
      
      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Sidebar - Campaigns list */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-80 border-r border-white/5 bg-[#07070f] flex flex-col z-50 transform transition-transform duration-300 lg:transform-none ${
        showMobileMenu ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-indigo-500 animate-pulse glow-indigo" />
            <h1 className="text-base sm:text-lg font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              ColdMail AI
            </h1>
          </div>
          <button
            onClick={() => setShowMobileMenu(false)}
            className="lg:hidden p-1.5 rounded-lg border border-white/5 hover:bg-white/5 transition-all text-zinc-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-2">
          <button
            onClick={() => {
              startNewCampaign();
              setShowMobileMenu(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 px-4 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all font-semibold text-white text-xs sm:text-sm shadow-lg shadow-indigo-900/30 active:scale-[0.98]"
            id="new-campaign-btn"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create Campaign
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-white/5 hover:bg-white/5 transition-all text-zinc-400 hover:text-white text-xs"
              title="Global Settings"
              id="settings-btn"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden xs:inline">Settings</span>
            </button>
            <button
              onClick={() => {
                logout();
                router.push("/auth/login");
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-white/5 hover:bg-white/5 transition-all text-zinc-400 hover:text-red-400 text-xs"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden xs:inline">Logout</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4 space-y-2">
          <div className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-zinc-500 uppercase px-2 py-1">
            Campaigns ({campaigns.length})
          </div>
          {campaigns.length === 0 ? (
            <div className="text-xs text-zinc-500 text-center py-8">
              No campaigns yet. Add one to get started.
            </div>
          ) : (
            campaigns.map((c) => (
              <div
                key={c._id}
                onClick={() => {
                  selectCampaign(c);
                  setShowMobileMenu(false);
                }}
                className={`group flex items-center justify-between p-2 sm:p-3 rounded-xl cursor-pointer border transition-all ${
                  activeCampaign?._id === c._id
                    ? "bg-indigo-950/30 border-indigo-500/30 text-white"
                    : "border-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs sm:text-sm font-semibold truncate">{c.name}</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5 truncate">
                    {c.resumeName || "No Resume attached"}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCampaign(c._id);
                  }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition-all shrink-0"
                  title="Delete Campaign"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#05050d]">
        {/* Mobile hamburger menu */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#07070f]/50">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 transition-all text-zinc-400 hover:text-white"
            title="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-sm font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ColdMail AI
          </h1>
          <div className="w-9" />
        </div>

        {isCreatingCampaign || activeCampaign ? (
          <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">
            {/* Left sidebar: Campaign editing/creation form */}
            <section className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-white/5 bg-[#06060c] p-4 sm:p-6 overflow-y-auto flex flex-col">
              <h2 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {isCreatingCampaign ? "New Campaign" : "Campaign Settings"}
              </h2>

              <form onSubmit={handleSaveCampaign} className="space-y-4 sm:space-y-5 flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={campName}
                    onChange={(e) => setCampName(e.target.value)}
                    placeholder="e.g. Google Software Engineering Internship"
                    className="w-full px-3 py-2 text-sm glass-input font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Subject Line</label>
                  <input
                    type="text"
                    required
                    value={campSubject}
                    onChange={(e) => setCampSubject(e.target.value)}
                    placeholder="e.g. Software Engineer Internship Application - {{name}}"
                    className="w-full px-3 py-2 text-sm glass-input font-medium"
                  />
                  <p className="text-[10px] text-zinc-500">Supports placehoders: <code className="text-indigo-400">{"{{name}}"}</code>, <code className="text-indigo-400">{"{{company}}"}</code>, <code className="text-indigo-400">{"{{role}}"}</code></p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Sender Email (SMTP Account)</label>
                  <input
                    type="email"
                    required
                    value={campFromEmail}
                    onChange={(e) => setCampFromEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    className="w-full px-3 py-2 text-sm glass-input font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-400">SMTP Password (App Password)</label>
                    <button
                      type="button"
                      onClick={() => setShowAppPasswordModal(true)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium transition-colors"
                    >
                      How to get App Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={campSmtpPass}
                    onChange={(e) => setCampSmtpPass(e.target.value)}
                    placeholder="Enter your 16-character App Password"
                    className="w-full px-3 py-2 text-sm glass-input font-medium"
                  />
                  <p className="text-[10px] text-zinc-500">Provide the 16-character SMTP App Password for this email. Once saved, it will be kept as your default settings.</p>
                </div>



                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Resume PDF/Attachment</label>
                  <div className="mt-1 flex justify-center px-4 py-4 border border-dashed border-white/10 rounded-xl bg-white/1 hover:bg-white/2 transition-all cursor-pointer relative group">
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCampResume(file);
                          setCampResumeName(file.name);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-center">
                      <svg className="mx-auto h-8 w-8 text-zinc-500 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-1.5 text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                        {campResumeName ? campResumeName : "Upload Resume (PDF)"}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">PDF or Word files up to 5MB</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-zinc-400">Email Template Body</label>
                  <textarea
                    rows={10}
                    value={campTemplate}
                    onChange={(e) => setCampTemplate(e.target.value)}
                    placeholder="Draft your email template..."
                    className="w-full px-3 py-2 text-sm glass-input font-mono leading-relaxed"
                  />
                  <p className="text-[10px] text-zinc-500">Placeholders: <code className="text-indigo-400">{"{{name}}"}</code>, <code className="text-indigo-400">{"{{company}}"}</code>, <code className="text-indigo-400">{"{{role}}"}</code>. The AI will customize sentences around these details.</p>
                </div>

                <button
                  type="submit"
                  disabled={isSavingCampaign}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-semibold text-sm transition-all border border-white/5 active:scale-[0.98]"
                >
                  {isSavingCampaign ? "Saving Campaign..." : isCreatingCampaign ? "Create Campaign" : "Save Settings"}
                </button>
              </form>
            </section>

            {/* Right side: Workspace workspace */}
            <section className="flex-1 flex flex-col overflow-hidden min-h-0">
              {isCreatingCampaign ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center mb-4 sm:mb-6 glow-indigo">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">Campaign Setup Initiated</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 max-w-sm">
                    Enter the campaign metadata in the left panel and click &quot;Create Campaign&quot; to configure the workspace for your cold mail contacts and AI personalisation.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  
                  {/* Tabs bar */}
                  <div className="px-4 sm:px-8 border-b border-white/5 flex items-center justify-between bg-[#07070f]/50 overflow-x-auto">
                    <nav className="flex space-x-4 sm:space-x-6 flex-nowrap">
                      {([
                        { id: "recipients", label: `Contacts (${recipients.length})` },
                        { id: "personalize", label: "AI Personalizer" },
                        { id: "dispatcher", label: "Email Dispatcher" }
                      ] as const).map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`py-3 sm:py-4 border-b-2 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap ${
                            activeTab === tab.id
                              ? "border-indigo-500 text-white"
                              : "border-transparent text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {tab.label}
                          {tab.id === "dispatcher" && queueStats.isProcessing && (
                            <span className="absolute top-2 sm:top-3 right-[-8px] w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                          )}
                        </button>
                      ))}
                    </nav>

                    <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-white/2 border border-white/5 py-1 px-3 rounded-full shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Resend Queue Connected
                    </div>
                  </div>

                  {/* Tab contents */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-8 min-h-0">
                    
                    {/* Contacts Tab */}
                    {activeTab === "recipients" && (
                      <div className="space-y-6 animate-slide-in">
                        
                        {/* Manage Imports Section */}
                        <div className="glass-panel rounded-2xl p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">Add Contacts List</h3>
                            <button
                              onClick={() => setShowImportArea(!showImportArea)}
                              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              {showImportArea ? "Switch to manual add" : "Bulk Import (CSV/Excel)"}
                            </button>
                          </div>

                          {showImportArea ? (
                            <div className="space-y-3">
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                Paste comma-separated (CSV) or tab-separated (TSV) columns directly from Excel or Google Sheets. Format: <code className="text-indigo-400">email, name, company, role</code>. Header line is optional.
                              </p>
                              <textarea
                                rows={5}
                                value={csvText}
                                onChange={(e) => setCsvText(e.target.value)}
                                placeholder="john.doe@google.com, John Doe, Google, Software Engineering Intern&#10;jane.smith@meta.com, Jane Smith, Meta, Frontend Developer Intern"
                                className="w-full px-3 py-2 text-xs glass-input font-mono leading-relaxed"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleCSVImport}
                                  className="py-1.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow shadow-indigo-900"
                                >
                                  Import Bulk Contacts
                                </button>
                                <button
                                  onClick={() => {
                                    setCsvText("");
                                    setShowImportArea(false);
                                  }}
                                  className="py-1.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <form onSubmit={handleAddSingleRecipient} className="grid grid-cols-5 gap-3 items-end">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email address</label>
                                <input
                                  type="email"
                                  required
                                  value={singleEmail}
                                  onChange={(e) => setSingleEmail(e.target.value)}
                                  placeholder="e.g. manager@google.com"
                                  className="w-full px-3 py-1.5 text-xs glass-input font-semibold"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contact Name</label>
                                <input
                                  type="text"
                                  value={singleName}
                                  onChange={(e) => setSingleName(e.target.value)}
                                  placeholder="e.g. John Doe"
                                  className="w-full px-3 py-1.5 text-xs glass-input font-semibold"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Company</label>
                                <input
                                  type="text"
                                  value={singleCompany}
                                  onChange={(e) => setSingleCompany(e.target.value)}
                                  placeholder="e.g. Google"
                                  className="w-full px-3 py-1.5 text-xs glass-input font-semibold"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Target Role</label>
                                <input
                                  type="text"
                                  value={singleRole}
                                  onChange={(e) => setSingleRole(e.target.value)}
                                  placeholder="e.g. Frontend Intern"
                                  className="w-full px-3 py-1.5 text-xs glass-input font-semibold"
                                />
                              </div>
                              <button
                                type="submit"
                                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold text-white text-xs h-[30px]"
                              >
                                Add Contact
                              </button>
                            </form>
                          )}
                        </div>

                        {/* Contacts List Table */}
                        <div className="glass-panel rounded-2xl overflow-hidden">
                          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Recipient Contact List</h4>
                            <span className="text-[10px] text-zinc-500 font-semibold">{recipients.length} total contacts</span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-white/5 text-zinc-500 font-bold bg-white/1">
                                  <th className="py-3 px-6">Name</th>
                                  <th className="py-3 px-6">Email</th>
                                  <th className="py-3 px-6">Company / Role</th>
                                  <th className="py-3 px-6">Queue Status</th>
                                  <th className="py-3 px-6 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {recipients.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-12 text-center text-zinc-500">
                                      No recipients in this campaign. Import a list or write one above!
                                    </td>
                                  </tr>
                                ) : (
                                  recipients.map((r) => (
                                    <tr key={r._id} className="hover:bg-white/1 transition-colors group">
                                      <td className="py-3.5 px-6 font-semibold text-white">
                                        {r.name || <span className="text-zinc-600 italic">Not set</span>}
                                      </td>
                                      <td className="py-3.5 px-6 font-medium text-zinc-300">{r.email}</td>
                                      <td className="py-3.5 px-6">
                                        <div className="font-semibold text-zinc-300">{r.company || "General"}</div>
                                        <div className="text-[10px] text-indigo-400 mt-0.5">{r.role || "Internship"}</div>
                                      </td>
                                      <td className="py-3.5 px-6">
                                        {getStatusBadge(r.status)}
                                        {r.error && (
                                          <div className="text-[10px] text-rose-500 mt-1 max-w-[250px] whitespace-normal wrap-break-word" title={r.error}>
                                            Error: {r.error}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3.5 px-6 text-right space-x-2">
                                        <button
                                          onClick={() => openPreview(r)}
                                          className="py-1 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold text-[10px] transition-colors"
                                        >
                                          {r.personalizedBody ? "View Draft" : "Draft Email"}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRecipient(r._id)}
                                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-850 text-zinc-500 hover:text-rose-400 transition-all"
                                          title="Delete Recipient"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Personalizer Tab */}
                    {activeTab === "personalize" && (
                      <div className="space-y-6 animate-slide-in">
                        
                        {/* Generation panel */}
                        <div className="glass-panel rounded-2xl p-6 flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white">AI Personalization Studio</h3>
                            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
                              We will run each contact through Google&apos;s Gemini 1.5 Flash API to customize your email template. The AI will customize the email body uniquely for each contact, company and role.
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-3">
                            <button
                              onClick={handleGenerateAI}
                              disabled={isGeneratingAI || recipients.filter(r => r.status === "pending" || r.status === "ready" || r.status === "failed").length === 0}
                              className="py-2.5 px-6 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all font-semibold text-white text-xs shadow shadow-purple-950 flex items-center gap-2"
                            >
                              {isGeneratingAI ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Running AI ({aiProgress.current} / {aiProgress.total})
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Generate Personalizations ({recipients.filter(r => r.status === "pending" || r.status === "ready" || r.status === "failed").length} available)
                                </>
                              )}
                            </button>
                            <span className="text-[10px] text-zinc-500 font-medium">
                              Uses model: <code className="text-zinc-400">gemini-2.5-flash</code>
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {isGeneratingAI && (
                          <div className="w-full bg-zinc-950 border border-white/5 rounded-xl p-4 space-y-2.5 animate-pulse">
                            <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
                              <span>Generating personalized cold emails...</span>
                              <span>{Math.round((aiProgress.current / aiProgress.total) * 100)}%</span>
                            </div>
                            <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-linear-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300"
                                style={{ width: `${(aiProgress.current / aiProgress.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Personalization Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          {recipients.map((r) => (
                            <div
                              key={r._id}
                              className={`glass-panel rounded-2xl p-5 space-y-4 flex flex-col justify-between border ${
                                r.status === "ready"
                                  ? "border-emerald-500/15 bg-emerald-950/1"
                                  : r.status === "failed"
                                  ? "border-rose-500/15 bg-rose-950/1"
                                  : "border-white/5"
                              }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="text-xs font-bold text-white">{r.name || "Hiring Manager"}</h4>
                                    <p className="text-[10px] text-zinc-400 mt-0.5">{r.company} &bull; {r.role}</p>
                                  </div>
                                  {getStatusBadge(r.status)}
                                </div>

                                <div className="bg-black/35 rounded-xl p-4 text-[11px] font-mono text-zinc-300 h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-white/5">
                                  {r.personalizedBody ? r.personalizedBody : (
                                    r.status === "failed" ? (
                                      <span className="text-rose-400 font-semibold leading-relaxed">
                                        Generation Failed: {r.error || "Unknown Gemini API error occurred."}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-600 italic">No personalization generated yet. Run the generator or edit manually.</span>
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-2">
                                <span className="text-[10px] text-zinc-500">{r.email}</span>
                                <button
                                  onClick={() => openPreview(r)}
                                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                  {r.personalizedBody ? "Edit Draft" : "Draft Manually"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dispatcher Tab */}
                    {activeTab === "dispatcher" && (
                      <div className="space-y-6 animate-slide-in">
                        
                        {/* Queue Actions Summary Card */}
                        <div className="grid grid-cols-4 gap-4">
                          {[
                            { label: "Total Emails", value: queueStats.total, color: "text-white" },
                            { label: "Queued / Sending", value: queueStats.queued + queueStats.sending, color: "text-amber-400" },
                            { label: "Sent Successfully", value: queueStats.sent, color: "text-emerald-400" },
                            { label: "Failed Sends", value: queueStats.failed, color: "text-rose-400" }
                          ].map((stat, i) => (
                            <div key={i} className="glass-panel rounded-2xl p-5 border border-white/5 bg-white/1">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{stat.label}</div>
                              <div className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Dispatch Center Controller */}
                        <div className="glass-panel rounded-2xl p-8 flex items-center justify-between border border-white/5">
                          <div className="space-y-2">
                            <h3 className="text-sm font-bold text-white">Cold Mail Queue Dispatcher</h3>
                            <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                              Send all personalized emails with your resume attached. Our queue processing helper runs sequentially with a 1.5 seconds rate limit delay per email.
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            {queueStats.isProcessing ? (
                              <button
                                onClick={handlePauseQueue}
                                className="py-3 px-8 rounded-xl bg-amber-600 hover:bg-amber-500 font-semibold text-white text-xs transition-colors shadow shadow-amber-950 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Pause Dispatcher
                              </button>
                            ) : (
                              <button
                                onClick={handleStartQueue}
                                disabled={recipients.filter(r => r.status === "ready" || r.status === "failed").length === 0}
                                className="py-3 px-8 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 font-semibold text-white text-xs transition-all shadow shadow-emerald-950 flex items-center gap-2 animate-pulse glow-emerald"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Start Queue Dispatch ({recipients.filter(r => r.status === "ready" || r.status === "failed").length} ready)
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Progress Visualizer Panel */}
                        {(queueStats.isProcessing || queueStats.sent > 0 || queueStats.failed > 0) && (
                          <div className="glass-panel rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Queue Progress Status</h4>
                              <span className="text-xs font-bold text-white">
                                {queueStats.sent} / {queueStats.total} Sent ({Math.round(((queueStats.sent + queueStats.failed) / (queueStats.total || 1)) * 100)}%)
                              </span>
                            </div>

                            <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden border border-white/5">
                              <div
                                className="bg-linear-to-r from-emerald-500 to-indigo-500 h-full transition-all duration-500"
                                style={{ width: `${((queueStats.sent + queueStats.failed) / (queueStats.total || 1)) * 100}%` }}
                              />
                            </div>

                            {/* Live Console Output Log */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Queue Console Output Logs</span>
                              <div className="bg-black/40 border border-white/5 rounded-xl p-4 h-48 font-mono text-[11px] text-zinc-400 overflow-y-auto space-y-1.5">
                                {logs.length === 0 ? (
                                  <span className="text-zinc-600 italic">Logs will appear here once queue operations start...</span>
                                ) : (
                                  logs.map((log, idx) => (
                                    <div key={idx} className="flex gap-2 items-start animate-slide-in">
                                      <span className="text-indigo-400">[info]</span>
                                      <span className="leading-relaxed">{log}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-radial-gradient">
            <div className="w-20 h-20 rounded-3xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-center mb-8 glow-indigo animate-bounce">
              <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-linear-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent mb-3">
              AI Cold Mailer Workspace
            </h2>
            <p className="text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
              Launch a structured internship email campaign. Customize templates dynamically with AI, attach your resume, and send emails safely with built-in rate-limiting.
            </p>
            <button
              onClick={startNewCampaign}
              className="py-3 px-8 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all font-semibold text-white text-xs shadow-lg shadow-indigo-950 active:scale-[0.98]"
            >
              Get Started By Creating a Campaign
            </button>
          </div>
        )}
      </main>

      {/* Manual Preview/Edit email body modal */}
      {previewRecipient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass-panel w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col animate-slide-in border border-white/10">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Edit Personalized Email Draft</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Recieving: {previewRecipient.email}</p>
              </div>
              <button
                onClick={() => setPreviewRecipient(null)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="bg-white/2 border border-white/5 p-2 rounded-lg">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Contact Name</div>
                  <div className="font-semibold text-white mt-1">{previewRecipient.name || "Hiring Manager"}</div>
                </div>
                <div className="bg-white/2 border border-white/5 p-2 rounded-lg">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Target Company</div>
                  <div className="font-semibold text-white mt-1">{previewRecipient.company || "General"}</div>
                </div>
                <div className="bg-white/2 border border-white/5 p-2 rounded-lg">
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Target Role</div>
                  <div className="font-semibold text-white mt-1">{previewRecipient.role || "Internship"}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Personalized Email Text</label>
                <textarea
                  rows={12}
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs glass-input font-mono leading-relaxed bg-[#0b0b14]"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex gap-2 justify-end">
              <button
                onClick={() => setPreviewRecipient(null)}
                className="py-1.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSavePreview}
                disabled={isSavingBody}
                className="py-1.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow shadow-indigo-950"
              >
                {isSavingBody ? "Saving Draft..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden flex flex-col animate-slide-in border border-white/10">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Global Settings Configuration</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveGlobalSettings} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Global Sender Email</label>
                <input
                  type="email"
                  value={globalSenderEmail}
                  onChange={(e) => setGlobalSenderEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full px-3 py-2 text-sm glass-input font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-400">Global SMTP Password (App Password)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowAppPasswordModal(true);
                    }}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium transition-colors"
                  >
                    How to get App Password?
                  </button>
                </div>
                <input
                  type="password"
                  value={globalSmtpPass}
                  onChange={(e) => setGlobalSmtpPass(e.target.value)}
                  placeholder="Enter your 16-character App Password"
                  className="w-full px-3 py-2 text-sm glass-input font-medium"
                />
              </div>

              <div className="pt-2 border-t border-white/5 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="py-1.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow shadow-indigo-950"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* App Password Guide Modal */}
      {showAppPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden flex flex-col animate-slide-in border border-white/10">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">How to get Gmail App Password</h3>
              <button
                onClick={() => setShowAppPasswordModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-zinc-300 leading-relaxed">
              <ol className="list-decimal pl-4 space-y-3">
                <li>
                  Go to your <a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google Account</a>.
                </li>
                <li>
                  Select <strong>Security</strong> on the left navigation panel.
                </li>
                <li>
                  Under <em>&quot;How you sign in to Google,&quot;</em> ensure <strong>2-Step Verification</strong> is enabled.
                </li>
                <li>
                  Click on <strong>2-Step Verification</strong>, scroll to the bottom of the page, and select <strong>App passwords</strong>.
                </li>
                <li>
                  Enter a name for the app (e.g. <code>ColdMail AI</code>) and click <strong>Create</strong>.
                </li>
                <li>
                  Copy the generated <strong>16-character password</strong> from the yellow box and paste it here.
                </li>
              </ol>

              <div className="mt-4 p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl text-[10px] text-zinc-400">
                <strong>Note:</strong> Make sure there are no spaces when pasting the password into the SMTP Password field.
              </div>
            </div>

            <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setShowAppPasswordModal(false)}
                className="py-1.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow shadow-indigo-950"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
