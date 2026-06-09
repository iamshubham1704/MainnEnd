import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";

// Setup global active workers registry if it doesn't exist
const globalObj = global as typeof globalThis & { activeQueueWorkers?: Record<string, boolean> };
if (!globalObj.activeQueueWorkers) {
  globalObj.activeQueueWorkers = {};
}
const activeWorkers = globalObj.activeQueueWorkers as Record<string, boolean>;

// Background queue worker function
async function runQueueWorker(campaignId: string) {
  if (activeWorkers[campaignId]) {
    console.log(`Worker for campaign ${campaignId} is already running.`);
    return;
  }

  activeWorkers[campaignId] = true;
  console.log(`Starting background queue worker for campaign: ${campaignId}`);

  try {
    const { db } = await connectToDatabase();
    
    // Retrieve SMTP configurations
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465");

    if (!smtpUser || !smtpPass) {
      console.error("SMTP credentials (SMTP_USER/SMTP_PASS) are missing in .env. Queue aborted.");
      // Set remaining queued to failed
      await db.collection("recipients").updateMany(
        { campaignId: new ObjectId(campaignId), status: "queued" },
        { $set: { status: "failed", error: "SMTP credentials (SMTP_USER/SMTP_PASS) are missing in .env" } }
      );
      return;
    }

    // Configure Nodemailer SMTP transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for port 465 (secure), false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Fetch campaign details
    const campaign = await db
      .collection("campaigns")
      .findOne({ _id: new ObjectId(campaignId) });

    if (!campaign) {
      console.error(`Campaign ${campaignId} not found. Queue aborted.`);
      return;
    }

    while (true) {
      // Atomic status update to 'sending' to avoid double-processing
      const updateResult = await db.collection("recipients").findOneAndUpdate(
        { campaignId: new ObjectId(campaignId), status: "queued" },
        { $set: { status: "sending", error: "" } },
        { returnDocument: "after" }
      );

      // Support multiple MongoDB driver return structures
      const recipient = updateResult && (updateResult.value !== undefined ? updateResult.value : updateResult);

      if (!recipient) {
        // No more queued emails for this campaign
        console.log(`Queue completed for campaign: ${campaignId}`);
        break;
      }

      console.log(`Processing email for ${recipient.email} in campaign ${campaignId}`);

      try {
        // Personalize Subject Line
        let personalizedSubject = campaign.subject || "Application for Internship";
        personalizedSubject = personalizedSubject
          .replace(/\{\{name\}\}/gi, recipient.name || "Hiring Manager")
          .replace(/\{\{company\}\}/gi, recipient.company || "Company")
          .replace(/\{\{role\}\}/gi, recipient.role || "Internship");

        interface NodemailerAttachment {
          filename: string;
          content: Buffer;
          contentType?: string;
        }

        interface NodemailerEmailPayload {
          from: string;
          to: string;
          subject: string;
          html: string;
          attachments?: NodemailerAttachment[];
        }

        // Prepare email payload
        const emailPayload: NodemailerEmailPayload = {
          from: `"Shubham" <${smtpUser}>`, // Set the requested sender email address
          to: recipient.email,
          subject: personalizedSubject,
          html: recipient.personalizedBody.replace(/\n/g, "<br>"),
        };
 
         // Attach resume if stored
         if (campaign.resumeData && campaign.resumeName) {
           emailPayload.attachments = [
             {
               filename: campaign.resumeName,
               content: Buffer.from(campaign.resumeData, "base64"), // Convert base64 resume content to Buffer
               contentType: campaign.resumeType || "application/pdf",
             },
           ];
         }
 
         // Send request via Nodemailer
         await transporter.sendMail(emailPayload);
 
         // Successfully sent
         await db.collection("recipients").updateOne(
           { _id: recipient._id },
           { $set: { status: "sent", sentAt: new Date(), error: "" } }
         );
         console.log(`Successfully sent email to ${recipient.email}`);
 
       } catch (err) {
         const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
         console.error(`Failed to send email to ${recipient.email}:`, errorMsg);
         await db.collection("recipients").updateOne(
           { _id: recipient._id },
           { $set: { status: "failed", error: errorMsg } }
         );
       }

      // 1.5 seconds rate limit delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } catch (err) {
    console.error("Queue worker fatal error:", err);
  } finally {
    activeWorkers[campaignId] = false;
    console.log(`Background queue worker stopped for campaign: ${campaignId}`);
  }
}

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
      .toArray();

    const counts = {
      total: recipients.length,
      pending: 0,
      ready: 0,
      queued: 0,
      sending: 0,
      sent: 0,
      failed: 0,
    };

    recipients.forEach((r) => {
      if (r.status === "pending") counts.pending++;
      else if (r.status === "ready") counts.ready++;
      else if (r.status === "queued") counts.queued++;
      else if (r.status === "sending") counts.sending++;
      else if (r.status === "sent") counts.sent++;
      else if (r.status === "failed") counts.failed++;
    });

    return NextResponse.json({
      ...counts,
      isProcessing: !!activeWorkers[id],
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("GET queue status error:", errorMsg);
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

    const { action } = await request.json();

    if (action === "pause") {
      // Revert queued and sending status back to ready
      await db.collection("recipients").updateMany(
        {
          campaignId: new ObjectId(id),
          status: { $in: ["queued", "sending"] },
        },
        { $set: { status: "ready" } }
      );

      return NextResponse.json({
        message: "Campaign queue paused. Recipients returned to ready status.",
      });
    }

    if (action === "send_all") {
      // Queue all recipients who are ready or failed (for retry)
      const updateResult = await db.collection("recipients").updateMany(
        {
          campaignId: new ObjectId(id),
          status: { $in: ["ready", "failed"] },
        },
        { $set: { status: "queued", error: "" } }
      );

      // Trigger worker asynchronously
      runQueueWorker(id);

      return NextResponse.json({
        message: "Queue processing started.",
        queuedCount: updateResult.modifiedCount,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("POST queue action error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
