import { NextResponse } from "next/server";
import { getCurrentUser } from "@/utils/current-user";

export async function POST(req: Request) {
    const user = await getCurrentUser();
    if (!user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, headline, message, propertyName, roomType, discountedRate } =
        await req.json();

    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json(
            { error: "RESEND_API_KEY is not configured in .env.local" },
            { status: 500 }
        );
    }

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: "LikeHome <onboarding@resend.dev>",
            to: [user.email],
            subject: `[TEST PREVIEW] ${subject}`,
            html: `
        <h2>LikeHome · ${propertyName}</h2>
        <h3>${headline}</h3>
        <p>${message}</p>
        <p><strong>${roomType}</strong> — $${discountedRate} / night</p>
      `,
        }),
    });

    if (!res.ok) {
        return NextResponse.json({ error: "Email delivery failed" }, { status: 500 });
    }

    return NextResponse.json({ sentTo: user.email });
}