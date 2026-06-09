import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  try {
    const { id, recipientId } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id) || !ObjectId.isValid(recipientId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, company, role, personalizedBody, status, error } = body;

    const updateFields: Record<string, string | undefined> = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (company !== undefined) updateFields.company = company;
    if (role !== undefined) updateFields.role = role;
    if (personalizedBody !== undefined) {
      updateFields.personalizedBody = personalizedBody;
      // If we manually change the personalization or reset it, update the status accordingly
      if (status === undefined) {
        updateFields.status = personalizedBody.trim() !== "" ? "ready" : "pending";
      }
    }
    if (status !== undefined) updateFields.status = status;
    if (error !== undefined) updateFields.error = error;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const result = await db.collection("recipients").updateOne(
      {
        _id: new ObjectId(recipientId),
        campaignId: new ObjectId(id),
      },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Recipient updated successfully" });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("PUT recipient error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
) {
  try {
    const { id, recipientId } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id) || !ObjectId.isValid(recipientId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const result = await db.collection("recipients").deleteOne({
      _id: new ObjectId(recipientId),
      campaignId: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Recipient deleted successfully" });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("DELETE recipient error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
