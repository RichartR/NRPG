import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Mark the team as inactive and set its dissolution date
    const { data, error } = await supabase
      .from('reg_equipos_ninja')
      .update({
        activo: false,
        fecha_disolucion: new Date().toISOString()
      })
      .eq('id', Number(id))
      .select()
      .single();

    if (error) {
      console.error('Error al disolver equipo ninja:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API equipos-ninja DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
