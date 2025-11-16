import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

// Web app creates command for terminal to execute
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { terminalId, commandType, commandData } = await request.json();

    if (!terminalId || !commandType) {
      return NextResponse.json(
        { error: 'Terminal ID and command type required' },
        { status: 400 }
      );
    }

    // Create command in database
    const { data: command, error } = await supabase
      .from('terminal_commands')
      .insert({
        terminal_id: terminalId,
        command_type: commandType,
        command_data: commandData || {},
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating command:', error);
      return NextResponse.json(
        { error: 'Failed to create command' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commandId: command.id
    });
  } catch (error) {
    console.error('Command creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
