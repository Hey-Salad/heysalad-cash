import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's invoices
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching invoices:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch invoices' },
        { status: 500 }
      );
    }

    // Generate fresh signed URLs for each invoice
    const invoicesWithUrls = await Promise.all(
      (invoices || []).map(async (invoice) => {
        // Generate new signed URL (valid for 1 hour)
        const { data: urlData, error: urlError } = await supabase.storage
          .from('invoices')
          .createSignedUrl(invoice.storage_path, 3600);

        if (urlError) {
          console.error('Error creating signed URL for invoice', invoice.id, urlError);
        }

        return {
          ...invoice,
          pdf_url: urlData?.signedUrl || invoice.pdf_url
        };
      })
    );

    return NextResponse.json({
      invoices: invoicesWithUrls
    });
  } catch (error) {
    console.error('Error listing invoices:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
