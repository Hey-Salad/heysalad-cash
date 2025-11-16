import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

// List available terminals (for user's account)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get terminals that have been seen in the last 5 minutes (considered online)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: terminals, error } = await supabase
      .from('terminals')
      .select('*')
      .order('last_seen', { ascending: false });

    if (error) {
      console.error('Error fetching terminals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch terminals' },
        { status: 500 }
      );
    }

    // Mark terminals as online/offline based on last_seen
    const terminalsWithStatus = (terminals || []).map(terminal => ({
      ...terminal,
      status: terminal.last_seen && new Date(terminal.last_seen) > new Date(fiveMinutesAgo)
        ? 'online'
        : 'offline'
    }));

    return NextResponse.json({
      terminals: terminalsWithStatus
    });
  } catch (error) {
    console.error('List terminals error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
