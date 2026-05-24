'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCharacter } from '@/hooks/useCharacter';
import { CharacterSheetView } from '@/components/character/CharacterSheetView';

export default function FichaPublicPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const {
    character,
    originalCharacter,
    loading,
    saving,
    canEdit,
    isAdmin,
    isEditing,
    setIsEditing,
    activeTab,
    setActiveTab,
    masters,
    updateField,
    updateStat,
    save,
    cancel,
    remove,
    restore,
    refresh,
    glosarioFiltrado,
    quickRemoveItem,
    quickRemoveTechnique
  } = useCharacter(id);

  if (loading || !character) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 border-4 border-oro/10 border-t-oro rounded-full animate-spin mb-8" />
        <h2 className="text-oro font-black uppercase tracking-[0.4em] text-xs xl:text-sm animate-pulse text-center">
          INVOCANDO EXPEDIENTE <span className="text-oro/40 italic">NINJA</span>...
        </h2>
      </div>
    );
  }

  return (
    <CharacterSheetView
      character={character}
      originalCharacter={originalCharacter}
      masters={masters}
      glosarioFiltrado={glosarioFiltrado}
      isEditing={isEditing}
      canEdit={canEdit}
      isAdmin={isAdmin}
      activeTab={activeTab}
      saving={saving}
      onUpdateField={updateField}
      onUpdateStat={updateStat}
      onSave={save}
      onCancel={cancel}
      onDelete={remove}
      onRestore={restore}
      onRefresh={refresh}
      onSetActiveTab={setActiveTab}
      onBack={() => router.back()}
      setIsEditing={setIsEditing}
      onQuickRemoveItem={quickRemoveItem}
      onQuickRemoveTechnique={quickRemoveTechnique}
    />
  );
}
