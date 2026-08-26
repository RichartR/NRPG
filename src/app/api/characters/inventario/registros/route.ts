import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

const ALLOWED_ITEM_IDS = [82, 393];

async function verifyOwnership(supabase: any, inventarioId: number, userId: string) {
  // Check if item exists and belongs to user's character or if user is admin
  const adminClient = createAdminClient();
  
  const { data: invItem, error: invError } = await adminClient
    .from('reg_personajes_inventario')
    .select('id, item_id, personaje_id, reg_characters(user_id)')
    .eq('id', inventarioId)
    .single();

  if (invError || !invItem) {
    return { authorized: false, error: 'Ítem de inventario no encontrado', invItem: null };
  }

  if (!ALLOWED_ITEM_IDS.includes(Number(invItem.item_id))) {
    return { authorized: false, error: 'Este objeto no admite registros de contenido', invItem: null };
  }

  // Check user profile role for admin
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const isAdmin = profile?.role === 'admin';
  const isOwner = (invItem.reg_characters as any)?.user_id === userId;

  if (!isOwner && !isAdmin) {
    return { authorized: false, error: 'No tienes permiso para modificar este objeto', invItem: null };
  }

  return { authorized: true, error: null, invItem };
}

// GET: Obtener registros de un inventario_id
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const inventarioIdRaw = searchParams.get('inventario_id');

  if (!inventarioIdRaw) {
    return NextResponse.json({ error: 'inventario_id es requerido' }, { status: 400 });
  }

  const inventarioId = Number(inventarioIdRaw);
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('reg_personajes_inventario_registros')
    .select('*')
    .eq('inventario_id', inventarioId)
    .order('slot_num', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

// POST: Crear un nuevo registro
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { inventario_id, slot_num, nombre, pantallazo_url } = body;

    if (!inventario_id || !nombre?.trim() || !pantallazo_url?.trim()) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (inventario_id, nombre, pantallazo_url)' }, { status: 400 });
    }

    const check = await verifyOwnership(supabase, Number(inventario_id), user.id);
    if (!check.authorized) {
      return NextResponse.json({ error: check.error }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Contar registros actuales
    const { data: existingSlots, error: countError } = await adminClient
      .from('reg_personajes_inventario_registros')
      .select('id, slot_num')
      .eq('inventario_id', inventario_id);

    if (countError) throw countError;

    if (existingSlots && existingSlots.length >= 10) {
      return NextResponse.json({ error: 'El objeto ya tiene el límite máximo de 10 registros' }, { status: 400 });
    }

    // Determinar el slot_num libre si no se pasa explícitamente
    let targetSlot = Number(slot_num);
    const occupiedSlots = new Set(existingSlots?.map(s => s.slot_num) || []);

    if (!targetSlot || targetSlot < 1 || targetSlot > 10 || occupiedSlots.has(targetSlot)) {
      // Asignar primer slot disponible del 1 al 10
      targetSlot = 1;
      while (targetSlot <= 10 && occupiedSlots.has(targetSlot)) {
        targetSlot++;
      }
    }

    if (targetSlot > 10) {
      return NextResponse.json({ error: 'No hay ranuras disponibles en el objeto' }, { status: 400 });
    }

    const { data: createdRecord, error: insertError } = await adminClient
      .from('reg_personajes_inventario_registros')
      .insert({
        inventario_id: Number(inventario_id),
        slot_num: targetSlot,
        nombre: nombre.trim(),
        pantallazo_url: pantallazo_url.trim()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, data: createdRecord });
  } catch (error: any) {
    console.error('Error al crear registro de inventario:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH: Actualización parcial de un registro existente
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, nombre, pantallazo_url } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de registro es requerido' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Obtener el registro para conocer su inventario_id
    const { data: existingRecord, error: fetchError } = await adminClient
      .from('reg_personajes_inventario_registros')
      .select('id, inventario_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const check = await verifyOwnership(supabase, Number(existingRecord.inventario_id), user.id);
    if (!check.authorized) {
      return NextResponse.json({ error: check.error }, { status: 403 });
    }

    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (nombre !== undefined && nombre !== null) updateFields.nombre = nombre.trim();
    if (pantallazo_url !== undefined && pantallazo_url !== null) updateFields.pantallazo_url = pantallazo_url.trim();

    const { data: updatedRecord, error: updateError } = await adminClient
      .from('reg_personajes_inventario_registros')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    console.error('Error al actualizar registro de inventario:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar un registro por ID
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let idRaw = searchParams.get('id');

    if (!idRaw) {
      try {
        const body = await request.json();
        idRaw = body.id;
      } catch {
        // Body reading optional if passed in query param
      }
    }

    if (!idRaw) {
      return NextResponse.json({ error: 'ID de registro es requerido' }, { status: 400 });
    }

    const recordId = Number(idRaw);
    const adminClient = createAdminClient();

    // Obtener el registro para verificar inventario_id
    const { data: existingRecord, error: fetchError } = await adminClient
      .from('reg_personajes_inventario_registros')
      .select('id, inventario_id')
      .eq('id', recordId)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const check = await verifyOwnership(supabase, Number(existingRecord.inventario_id), user.id);
    if (!check.authorized) {
      return NextResponse.json({ error: check.error }, { status: 403 });
    }

    const { error: deleteError } = await adminClient
      .from('reg_personajes_inventario_registros')
      .delete()
      .eq('id', recordId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, id: recordId });
  } catch (error: any) {
    console.error('Error al eliminar registro de inventario:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
