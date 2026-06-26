import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../_supabase';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('rsvps').select('id').limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, message: 'Supabase connected.' });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
