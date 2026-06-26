import { NextResponse } from 'next/server';
import { getSupabaseAdmin, normalizePhone } from '../_supabase';

const allowedFields = [
  'attending',
  'travel_from',
  'guest_count',
  'additional_guests',
  'confirmed_guests',
  'comments',
];

export async function POST(request) {
  try {
    const { id, phone, updates } = await request.json();
    const phoneDigits = normalizePhone(phone);

    if (!id || !phoneDigits) {
      return NextResponse.json({ error: 'Falta información para guardar cambios.' }, { status: 400 });
    }

    const safeUpdates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updates || {}, field)) safeUpdates[field] = updates[field];
    }

    if (safeUpdates.guest_count !== undefined) {
      safeUpdates.guest_count = Math.max(1, Math.min(10, Number(safeUpdates.guest_count || 1)));
    }

    safeUpdates.updated_at = new Date().toISOString();

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('rsvps')
      .update(safeUpdates)
      .eq('id', id)
      .eq('phone_normalized', phoneDigits)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ rsvp: data });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Error guardando RSVP.' }, { status: 500 });
  }
}
