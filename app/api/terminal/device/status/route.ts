import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { terminalIP } = await request.json();

    if (!terminalIP) {
      return NextResponse.json(
        { error: 'Terminal IP required' },
        { status: 400 }
      );
    }

    const response = await fetch(`http://${terminalIP}/api/display/status`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('admin:change-me').toString('base64')
      },
      cache: 'no-store'
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Terminal proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to terminal' },
      { status: 500 }
    );
  }
}
