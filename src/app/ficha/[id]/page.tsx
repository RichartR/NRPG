'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCharacter } from '@/hooks/useCharacter';
import { CharacterSheetView } from '@/components/character/CharacterSheetView';
import { RefreshCw } from 'lucide-react';

export default function FichaPublicPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  
  const {
    character,
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
    remove
  } = useCharacter(id);

  if (loading || !character) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <CharacterSheetView 
      character={character}
      masters={masters}
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
      onSetActiveTab={setActiveTab}
      onBack={() => router.back()}
      setIsEditing={setIsEditing}
    />
  );
}
