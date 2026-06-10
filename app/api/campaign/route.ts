import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: No token provided." },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token." },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const campaigns = await db
      .collection("campaigns")
      .find({ userId: new ObjectId(payload.userId) })
      .sort({ createdAt: -1 })
      .project({ resumeData: 0 })
      .toArray();

    return NextResponse.json(campaigns);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("GET campaigns error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: No token provided." },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token." },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const formData = await request.formData();
    
    const name = formData.get("name") as string;
    const subject = formData.get("subject") as string;
    const template = formData.get("template") as string;
    const fromEmail = formData.get("fromEmail") as string;
    const geminiApiKey = formData.get("geminiApiKey") as string;
    const resumeFile = formData.get("resume") as File | null;

    if (!name || !subject || !template) {
      return NextResponse.json(
        { error: "Name, subject, and template are required." },
        { status: 400 }
      );
    }

    let resumeData = "";
    let resumeName = "";
    let resumeType = "";

    if (resumeFile && resumeFile.size > 0) {
      const bytes = await resumeFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      resumeData = buffer.toString("base64");
      resumeName = resumeFile.name;
      resumeType = resumeFile.type;
    }

    const campaign = {
      userId: new ObjectId(payload.userId),
      name,
      subject,
      template,
      fromEmail: fromEmail || "onboarding@resend.dev",
      geminiApiKey: geminiApiKey || "",
      resumeData,
      resumeName,
      resumeType,
      createdAt: new Date(),
    };

    const result = await db.collection("campaigns").insertOne(campaign);

    return NextResponse.json({
      message: "Campaign created successfully.",
      campaignId: result.insertedId,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error saving campaign:", errorMsg);
    console.error("Full error:", error);
    return NextResponse.json(
      { 
        error: `Error saving campaign: ${errorMsg}`,
        details: process.env.NODE_ENV === "development" ? error : undefined,
      }, 
      { status: 500 }
    );
  }
}
