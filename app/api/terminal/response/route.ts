import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Device sends command response
export async function POST(request: NextRequest) {
  try {
    // Use service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { commandId, success, response } = await request.json();

    if (!commandId) {
      return NextResponse.json(
        { error: 'Command ID required' },
        { status: 400 }
      );
    }

    // Update command with response
    const { error } = await supabase
      .from('terminal_commands')
      .update({
        status: success ? 'completed' : 'failed',
        response: response || {},
        processed_at: new Date().toISOString()
      })
      .eq('id', commandId);

    if (error) {
      console.error('Error updating command:', error);
      return NextResponse.json(
        { error: 'Failed to update command' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Response error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Web app polls for command response
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const commandId = searchParams.get('commandId');

    if (!commandId) {
      return NextResponse.json(
        { error: 'Command ID required' },
        { status: 400 }
      );
    }

    const { data: command, error } = await supabase
      .from('terminal_commands')
      .select('*')
      .eq('id', commandId)
      .single();

    if (error) {
      console.error('Error fetching command:', error);
      return NextResponse.json(
        { error: 'Failed to fetch command' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: command.status,
      response: command.response
    });
  } catch (error) {
    console.error('Get response error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
