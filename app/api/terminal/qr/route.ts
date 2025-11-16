import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { terminalIP, data, label } = await request.json();

    if (!terminalIP) {
      return NextResponse.json(
        { error: 'Terminal IP required' },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'QR data required' },
        { status: 400 }
      );
    }

    const response = await fetch(`http://${terminalIP}/api/display/qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('admin:change-me').toString('base64')
      },
      body: JSON.stringify({ data, label }),
      cache: 'no-store'
    });

    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    console.error('Terminal QR proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to display QR code' },
      { status: 500 }
    );
  }
}
