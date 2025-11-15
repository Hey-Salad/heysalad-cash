import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json(
        { error: "SendGrid API key not configured" },
        { status: 500 }
      );
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      return NextResponse.json(
        { error: "SendGrid from email not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { to, subject, text, html } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    // Prepare email
    const msg = {
      to: to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: subject || "Test Email from HeySalad",
      text: text || "This is a test email from HeySalad.cash",
      html: html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #000;">HeySalad Test Email</h1>
          <p>This is a test email from HeySalad.cash</p>
          <p>If you're receiving this, the email system is working correctly! ✅</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent from HeySalad.cash<br>
            ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    };

    // Send email
    await sgMail.send(msg);

    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${to}`,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);

    if (error.response) {
      console.error("SendGrid error details:", error.response.body);
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send email",
        details: error.response?.body || null,
      },
      { status: 500 }
    );
  }
}

// GET endpoint for quick testing
export async function GET(req: NextRequest) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return NextResponse.json(
        { error: "SendGrid API key not configured" },
        { status: 500 }
      );
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      return NextResponse.json(
        { error: "SendGrid from email not configured" },
        { status: 500 }
      );
    }

    // Send test email to peter@heysalad.io
    const msg = {
      to: "peter@heysalad.io",
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: "🚀 HeySalad Test Email",
      text: "This is a test email from HeySalad.cash",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #000; margin: 0;">🥗 HeySalad</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
            <h2 style="color: #000; margin-top: 0;">Test Email Successful! ✅</h2>
            <p style="color: #333; line-height: 1.6;">
              This is a test email from <strong>HeySalad.cash</strong> to verify that the SendGrid integration is working correctly.
            </p>
            
            <div style="background: white; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h3 style="color: #000; margin-top: 0; font-size: 16px;">System Status:</h3>
              <ul style="color: #333; line-height: 1.8;">
                <li>✅ SendGrid API: Connected</li>
                <li>✅ Email Delivery: Working</li>
                <li>✅ HTML Formatting: Enabled</li>
                <li>✅ Timestamp: ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              You can now use this email system for:
            </p>
            <ul style="color: #666; font-size: 14px;">
              <li>Transaction receipts</li>
              <li>Welcome emails</li>
              <li>Payment notifications</li>
              <li>Account updates</li>
            </ul>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Sent from HeySalad.cash<br>
            ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    };

    await sgMail.send(msg);

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully to peter@heysalad.io",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error sending test email:", error);

    if (error.response) {
      console.error("SendGrid error details:", error.response.body);
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send test email",
        details: error.response?.body || null,
      },
      { status: 500 }
    );
  }
}
