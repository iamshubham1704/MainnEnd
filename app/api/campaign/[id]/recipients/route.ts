import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const recipients = await db
      .collection("recipients")
      .find({ campaignId: new ObjectId(id) })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json(recipients);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("GET recipients error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const campaign = await db
      .collection("campaigns")
      .findOne({ _id: new ObjectId(id) });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await request.json();
    const recipientsList = Array.isArray(body) ? body : [body];

    if (recipientsList.length === 0) {
      return NextResponse.json({ error: "No recipients provided" }, { status: 400 });
    }

    interface IncomingRecipient {
      email: string;
      name?: string;
      company?: string;
      role?: string;
    }

    const baseTemplate = campaign.template || "";

    const validatedRecipients = (recipientsList as IncomingRecipient[])
      .filter((r: IncomingRecipient) => r.email && r.email.trim() !== "")
      .map((r: IncomingRecipient) => {
        const name = (r.name || "").trim();
        const company = (r.company || "").trim();
        const role = (r.role || "").trim();
        
        // Populate the base template with placeholders replaced by default
        const personalizedBody = baseTemplate
          .replace(/\{\{name\}\}/gi, name || "Hiring Manager")
          .replace(/\{\{company\}\}/gi, company || "Company")
          .replace(/\{\{role\}\}/gi, role || "Internship");

        return {
          campaignId: new ObjectId(id),
          email: r.email.trim(),
          name,
          company,
          role,
          personalizedBody,
          status: "ready", // Ready by default since it has the baseline template
          error: "",
          createdAt: new Date(),
        };
      });

    if (validatedRecipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipients found. Email is required." },
        { status: 400 }
      );
    }

    const result = await db
      .collection("recipients")
      .insertMany(validatedRecipients);

    return NextResponse.json({
      message: `${result.insertedCount} recipients added successfully.`,
      insertedIds: result.insertedIds,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("POST recipients error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
