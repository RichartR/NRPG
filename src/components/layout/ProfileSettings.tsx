'use client';

import { useState } from 'react';
import { User, Image as ImageIcon, X } from 'lucide-react';
import { ProfileService } from '@/services/supabase/profile.service';
import { useToastStore } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ProfileSettingsProps {
  profile: any;
  userId: string;
}

export default function ProfileSettings({ profile, userId }: ProfileSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Prevent background scrolling when profile settings modal is open
  useScrollLock(isOpen);
  const [urlImg, setUrlImg] = useState(profile?.url_img || profile?.url_avatar || '');
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore(state => state.addToast);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    try {
      await ProfileService.updateProfile(userId, { url_img: urlImg });
      addToast('Imagen de perfil actualizada', 'success');
      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      addToast('Error al actualizar: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Gatillo: El área del perfil en la cabecera */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-4 px-4 xl:px-6 py-2.5 hover:bg-white/5 transition-all group rounded-lg"
      >
        <div className="relative">
          {profile?.url_img || profile?.url_avatar ? (
            <img
              src={profile.url_img || profile.url_avatar}
              alt={profile?.username || "Avatar"}
              className="w-10 xl:w-12 h-10 xl:h-12 rounded-none object-cover border border-oro/40 group-hover:border-oro transition-colors"
            />
          ) : (
            <div className="w-10 xl:w-12 h-10 xl:h-12 bg-oro/5 border border-oro/10 flex items-center justify-center">
              <User className="w-5 h-5 text-oro/20" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
            <ImageIcon className="w-4 h-4 text-oro" />
          </div>
        </div>
        <div className="text-left">
          <span className="block text-sm xl:text-lg 2xl:text-xl font-black text-oro uppercase tracking-widest group-hover:text-white transition-colors">
            {profile?.username}
          </span>
          <span className="block text-[8px] font-black text-oro/30 uppercase tracking-[0.3em]">Ajustes de Perfil</span>
        </div>
      </button>

      {/* Modal de Ajustes */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="w-full max-w-lg ninja-card-oro p-8 xl:p-12 relative animate-in fade-in zoom-in duration-300"
            style={{ clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)' }}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-oro/40 hover:text-oro transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4 mb-10">
              <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
              <h2 className="ninja-title text-xl sm:text-3xl">AJUSTES DE PERFIL</h2>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-oro/40 uppercase tracking-[0.4em] ml-2">URL de Imagen de Perfil</label>
                <div className="relative">
                  <input
                    type="text"
                    value={urlImg}
                    onChange={(e) => setUrlImg(e.target.value)}
                    className="w-full bg-black/60 border border-oro/20 py-5 px-8 text-oro font-bold outline-none focus:border-oro/60 transition-all placeholder:text-oro/10"
                    placeholder="https://..."
                    style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
                  />
                </div>
                <p className="text-[9px] text-oro/20 italic ml-2">Recomendado: 400x400px o superior. Formatos JPG, PNG, WEBP.</p>
              </div>

              {/* Preview */}
              <div className="flex justify-center py-6">
                <div className="w-32 h-32 ninja-card-oro border-oro/20 overflow-hidden relative">
                  {urlImg ? (
                    <img src={urlImg} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-oro/5">
                      <ImageIcon className="w-8 h-8 text-oro/10" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 ninja-btn-oro py-4 text-xs tracking-[0.3em] font-black"
                >
                  {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
