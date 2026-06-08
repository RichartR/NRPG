import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: characterId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Call the database function
    const { data, error } = await supabase.rpc('reiniciar_personaje', {
      p_personaje_id: Number(characterId)
    });

    if (error) {
      console.error('Error calling reiniciar_personaje RPC:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Reset Character API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
