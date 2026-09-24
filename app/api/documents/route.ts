import { NextResponse } from "next/server";
import {
  storageUploadBase64,
  supabaseConfigured,
} from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const applicationId = String(body.applicationId || "TEMP");
    const hash = String(body.sha256 || crypto.randomUUID()).slice(0, 64);
    const bucket = String(body.bucket || "other");

    const filename = String(body.filename || "document.jpg").replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    const dataUrl = String(body.dataUrl || "");

    if (!dataUrl) {
      return NextResponse.json(
        { error: "Image data is required." },
        { status: 400 }
      );
    }

    if (!supabaseConfigured()) {
      return NextResponse.json({
        configured: false,
        storagePath: null,
      });
    }

    const storagePath = `${applicationId}/${bucket}/${hash}-${filename}`;

    await storageUploadBase64(storagePath, dataUrl);

    return NextResponse.json({
      configured: true,
      storagePath,
    });
  } catch (error) {
    console.error("DOCUMENT STORAGE ERROR:", error);

    return NextResponse.json(
      {
        configured: true,
        error:
          error instanceof Error
            ? error.message
            : "Document storage failed.",
      },
      { status: 500 }
    );
  }
}