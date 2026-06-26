import { NextResponse } from 'next/server';
import { cleanText, getSupabaseAdmin, normalizePhone } from '../_supabase';

export async function POST(request) {
  try {
    const { full_name, phone } = await request.json();
    const name = cleanText(full_name);
    const phoneDigits = normalizePhone(phone);

    if (!name || !phoneDigits) {
      return NextResponse.json({ error: 'Ingrese su nombre completo y teléfono.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('rsvps')
      .select('*')
      .ilike('full_name', name)
      .eq('phone_normalized', phoneDigits)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'No encontramos un RSVP con ese nombre y teléfono.' }, { status: 404 });
    }

    return NextResponse.json({ rsvp: data });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Error buscando RSVP.' }, { status: 500 });
  }
}
