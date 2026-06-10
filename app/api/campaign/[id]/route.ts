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

    const campaign = await db
      .collection("campaigns")
      .findOne({ _id: new ObjectId(id) });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("GET campaign error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const contentType = request.headers.get("content-type") || "";
    const updateFields: Record<string, string | null | undefined> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const name = formData.get("name") as string;
      const subject = formData.get("subject") as string;
      const template = formData.get("template") as string;
      const fromEmail = formData.get("fromEmail") as string;
      const smtpPass = formData.get("smtpPass") as string;
      const geminiApiKey = formData.get("geminiApiKey") as string;
      const resumeFile = formData.get("resume") as File | null;

      if (name) updateFields.name = name;
      if (subject) updateFields.subject = subject;
      if (template) updateFields.template = template;
      if (fromEmail !== null) updateFields.fromEmail = fromEmail;
      if (smtpPass !== null) updateFields.smtpPass = smtpPass;
      if (geminiApiKey !== null) updateFields.geminiApiKey = geminiApiKey;

      if (resumeFile && resumeFile.size > 0) {
        const bytes = await resumeFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        updateFields.resumeData = buffer.toString("base64");
        updateFields.resumeName = resumeFile.name;
        updateFields.resumeType = resumeFile.type;
      }
    } else {
      const body = await request.json();
      const { name, subject, template, fromEmail, smtpPass, geminiApiKey, resumeData, resumeName, resumeType } = body;
      
      if (name) updateFields.name = name;
      if (subject) updateFields.subject = subject;
      if (template) updateFields.template = template;
      if (fromEmail !== null) updateFields.fromEmail = fromEmail;
      if (smtpPass !== null) updateFields.smtpPass = smtpPass;
      if (geminiApiKey !== null) updateFields.geminiApiKey = geminiApiKey;
      if (resumeData) updateFields.resumeData = resumeData;
      if (resumeName) updateFields.resumeName = resumeName;
      if (resumeType) updateFields.resumeType = resumeType;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const result = await db
      .collection("campaigns")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Campaign updated successfully" });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("PUT campaign error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    // Delete campaign
    const campaignResult = await db
      .collection("campaigns")
      .deleteOne({ _id: new ObjectId(id) });

    if (campaignResult.deletedCount === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Delete associated recipients
    await db
      .collection("recipients")
      .deleteMany({ campaignId: new ObjectId(id) });

    return NextResponse.json({ message: "Campaign and recipients deleted successfully" });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("DELETE campaign error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
