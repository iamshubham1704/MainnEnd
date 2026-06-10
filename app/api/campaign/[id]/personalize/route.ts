import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let recipientId: string | undefined;
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const body = await request.json();
    recipientId = body.recipientId;
    const customApiKey = body.customApiKey;

    if (!recipientId || !ObjectId.isValid(recipientId)) {
      return NextResponse.json({ error: "Invalid recipient ID" }, { status: 400 });
    }

    // Fetch campaign
    const campaign = await db
      .collection("campaigns")
      .findOne({ _id: new ObjectId(id) });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get Gemini API Key (prioritize custom key from request, then DB, then environment)
    const geminiApiKey = customApiKey || campaign.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Gemini API key is required. Please set it in Settings or on the Campaign." },
        { status: 400 }
      );
    }

    // Fetch recipient
    const recipient = await db.collection("recipients").findOne({
      _id: new ObjectId(recipientId),
      campaignId: new ObjectId(id),
    });

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Update status to generating
    await db.collection("recipients").updateOne(
      { _id: new ObjectId(recipientId) },
      { $set: { status: "generating", error: "" } }
    );

    // Call Gemini API
    const prompt = `
You are a candidate applying for an internship.
Write a personalized cold email based on this base template:
"""
${campaign.template}
"""

Here are the details for the personalization:
- Recipient Name: ${recipient.name || "Hiring Manager"}
- Target Company: ${recipient.company || "your company"}
- Target Role: ${recipient.role || "Internship"}

Please write a highly tailored, polite, and professional email body. Replace placeholders like {{name}}, {{company}}, {{role}} with the actual details. Customize the content slightly to show genuine interest in ${recipient.company || "the company"} and the ${recipient.role || "internship"} role.
Keep it concise, clear, and high-impact.
Do not include any subject line. Start directly with the email greeting (e.g. "Dear ${recipient.name || "Hiring Manager"}," or "Hi ${recipient.name || "Team"},").
Do not write any introductory or concluding conversational text. Return ONLY the complete email text.
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    let response: Response | null = null;
    const retries = 3;
    let delay = 2000;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
            },
          }),
        });

        if (response.ok) {
          break;
        }

        // Retry on 503 Service Unavailable or 429 Too Many Requests
        if (response.status === 503 || response.status === 429) {
          console.warn(`Gemini API returned status ${response.status}. Attempt ${attempt} of ${retries}. Retrying in ${delay}ms...`);
          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
        }
        break;
      } catch (err) {
        console.error(`Attempt ${attempt} failed with network error:`, err);
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        throw err;
      }
    }

    if (!response || !response.ok) {
      const errText = response ? await response.text() : "";
      let errorMsg = (response ? response.statusText : "") || "Unknown network error";
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        } else if (typeof parsed.error === "string") {
          errorMsg = parsed.error;
        }
      } catch {
        if (errText) errorMsg = errText;
      }
      throw new Error(`Gemini API Error: ${errorMsg}`);
    }

    const resData = await response.json();
    let generatedBody = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean up markdown code blocks if the model wrapped it (e.g., ```html or ```)
    generatedBody = generatedBody
      .replace(/^```[a-zA-Z]*\n/, "")
      .replace(/\n```$/, "")
      .trim();

    if (!generatedBody) {
      throw new Error("Gemini returned an empty response.");
    }

    // Update recipient with generated body and status
    await db.collection("recipients").updateOne(
      { _id: new ObjectId(recipientId) },
      {
        $set: {
          personalizedBody: generatedBody,
          status: "ready",
          error: "",
        },
      }
    );

    return NextResponse.json({
      message: "Personalization generated successfully.",
      personalizedBody: generatedBody,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Personalization error:", errorMsg);
    
    // Log error to recipient document
    if (recipientId && ObjectId.isValid(recipientId)) {
      try {
        const { db } = await connectToDatabase();
        await db.collection("recipients").updateOne(
          { _id: new ObjectId(recipientId) },
          { $set: { status: "failed", error: errorMsg } }
        );
      } catch (e) {
        console.error("Failed to update recipient error status:", e);
      }
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
