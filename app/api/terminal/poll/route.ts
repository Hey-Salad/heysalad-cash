import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Device polls for pending commands
export async function POST(request: NextRequest) {
  try {
    // Use service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { terminalId, deviceInfo } = await request.json();

    if (!terminalId) {
      return NextResponse.json(
        { error: 'Terminal ID required' },
        { status: 400 }
      );
    }

    // Update terminal last_seen
    await supabase
      .from('terminals')
      .upsert({
        terminal_id: terminalId,
        last_seen: new Date().toISOString(),
        device_info: deviceInfo || {},
        status: 'online'
      }, {
        onConflict: 'terminal_id'
      });

    // Get pending command
    const { data: command, error } = await supabase
      .from('terminal_commands')
      .select('*')
      .eq('terminal_id', terminalId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error fetching command:', error);
      return NextResponse.json(
        { error: 'Failed to fetch command' },
        { status: 500 }
      );
    }

    if (!command) {
      return NextResponse.json({ command: null });
    }

    // Mark command as processing
    await supabase
      .from('terminal_commands')
      .update({ status: 'processing' })
      .eq('id', command.id);

    return NextResponse.json({
      command: {
        id: command.id,
        type: command.command_type,
        data: command.command_data
      }
    });
  } catch (error) {
    console.error('Poll error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
