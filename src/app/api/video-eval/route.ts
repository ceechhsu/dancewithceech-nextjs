import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email, youtubeUrl, notes } = await req.json();

  if (!email || !youtubeUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: "DanceWithCeech <no-reply@dancewithceech.com>",
    to: "dancewithceech@gmail.com",
    replyTo: email,
    subject: `[Video Eval Request] from ${email}`,
    text: `New free video evaluation request:\n\nEmail: ${email}\nYouTube URL: ${youtubeUrl}\nNotes: ${notes || "None"}\n\nReply directly to this email to send the evaluation back.`,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
