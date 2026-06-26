import { NextResponse } from 'next/server';
import { cleanText, getSupabaseAdmin, normalizePhone } from '../_supabase';

function answerValue(answer) {
  if (!answer) return '';
  if (answer.type === 'text') return answer.text || '';
  if (answer.type === 'email') return answer.email || '';
  if (answer.type === 'phone_number') return answer.phone_number || '';
  if (answer.type === 'number') return answer.number;
  if (answer.type === 'boolean') return answer.boolean ? 'Sí' : 'No';
  if (answer.type === 'choice') return answer.choice?.label || '';
  if (answer.type === 'choices') return (answer.choices?.labels || []).join(', ');
  return '';
}

function findByTitle(answers, includes) {
  const terms = includes.map((x) => x.toLowerCase());
  const found = answers.find((answer) => {
    const title = (answer.field?.title || '').toLowerCase();
    return terms.every((term) => title.includes(term));
  });
  return answerValue(found);
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const answers = payload?.form_response?.answers || [];

    const fullName = cleanText(findByTitle(answers, ['nombre completo']));
    const phone = cleanText(findByTitle(answers, ['teléfono']) || findByTitle(answers, ['phone']));
    const phoneNormalized = normalizePhone(phone);

    if (!fullName || !phoneNormalized) {
      return NextResponse.json({ error: 'Typeform submission missing full name or phone.' }, { status: 400 });
    }

    const rsvp = {
      full_name: fullName,
      travel_from: cleanText(findByTitle(answers, ['desde dónde viaja'])),
      attending: cleanText(findByTitle(answers, ['vas a asistir'])),
      guest_count: Number(findByTitle(answers, ['cuántas personas']) || 1),
      additional_guests: cleanText(findByTitle(answers, ['invitados adicionales'])),
      confirmed_guests: cleanText(findByTitle(answers, ['confirmar su grupo'])),
      phone,
      phone_normalized: phoneNormalized,
      comments: cleanText(findByTitle(answers, ['pregunta']) || findByTitle(answers, ['comentario'])),
      typeform_response_id: payload?.form_response?.token || null,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from('rsvps')
      .select('id')
      .eq('phone_normalized', phoneNormalized)
      .ilike('full_name', fullName)
      .limit(1)
      .maybeSingle();

    let result;
    if (existing?.id) {
      result = await supabase.from('rsvps').update(rsvp).eq('id', existing.id).select('*').single();
    } else {
      result = await supabase.from('rsvps').insert(rsvp).select('*').single();
    }

    if (result.error) throw result.error;
    return NextResponse.json({ ok: true, rsvp: result.data });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Webhook error.' }, { status: 500 });
  }
}
