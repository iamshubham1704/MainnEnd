"use client";

import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (token) {
      fetchCampaigns();
    }
  }, [token]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/campaign", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          router.push("/auth/login");
        } else {
          setError("Failed to fetch campaigns.");
        }
        return;
      }

      const data = await response.json();
      setCampaigns(data);
    } catch (err) {
      setError("An error occurred while fetching campaigns.");
      console.error(err);
    } finally {
      setCampaignsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Mailnend</h1>
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-600">{user.email}</p>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">Your Campaigns</h2>
          <Link
            href="/"
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Create Campaign
          </Link>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-8">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {campaignsLoading ? (
          <p className="text-lg text-gray-600">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 mb-4">No campaigns yet.</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign._id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {campaign.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Subject: {campaign.subject}
                </p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(campaign.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
