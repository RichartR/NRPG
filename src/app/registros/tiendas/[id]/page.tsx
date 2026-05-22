'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ShoppingBag, Sparkles, Plus, Trash2, Edit3, Coins,
  RotateCcw, X, Check, Loader2, ArrowLeft,
  Settings, Lock, Search, Filter, AlertCircle, ShoppingCart,
  ChevronRight, Minus
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { AuthService } from '@/services/supabase/auth.service';
import { MasterService } from '@/services/supabase/master.service';
import { TiendasService } from '@/services/supabase/tiendas.service';
import { AdminService } from '@/services/supabase/admin.service';
import { Character, Tienda, TiendaObjeto, Glosario } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default function TiendaDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToast } = useToastStore();

  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [objetos, setObjetos] = useState<TiendaObjeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [eventCoinName, setEventCoinName] = useState('Monedas de Evento');

  // User characters state
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [charLoading, setCharLoading] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | string | null>(null); // null means All, 'stats' means Stat Points

  // Modals / Admin forms
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBuyConfirmOpen, setIsBuyConfirmOpen] = useState<TiendaObjeto | null>(null);
  const [isSubmittingBuy, setIsSubmittingBuy] = useState(false);

  // Form State for Adding Item to Catalog
  const [glosarioActivo, setGlosarioActivo] = useState<Glosario[]>([]);
  const [selectedGlosarioId, setSelectedGlosarioId] = useState<number | null>(null);
  const [formObjeto, setFormObjeto] = useState<Partial<TiendaObjeto>>({
    coste_ryous: 0,
    coste_exp: 0,
    coste_moneda_evento: 0,
    mantener_requisitos: true,
    requisitos_personalizados: {
      rango: null,
      combates: 0,
      stats: { sm: 0, agi: 0, est: 0, fue: 0, gen: 0, int: 0, nin: 0, tai: 0 }
    }
  });

  // Form State for Creating Custom EXP Shop Item (Virtual Bridge Glosario)
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [formCustomGlosario, setFormCustomGlosario] = useState({
    nombre_es: '',
    nombre_jp: '',
    descripcion: '',
    categoria_id: 2, // Default: Objetos
    coste_exp: 0,
    coste_ryous: 0,
    requisitos: {
      rango: null as string | null,
      combates: 0,
      stats: { sm: 0, agi: 0, est: 0, fue: 0, gen: 0, int: 0, nin: 0, tai: 0 }
    }
  });

  const [isSavingItem, setIsSavingItem] = useState(false);

  // Experience shop stats buy state
  const [expCosts, setExpCosts] = useState<Record<string, number>>({});
  const [statPointsToBuy, setStatPointsToBuy] = useState<number>(1);
  const [isStatBuyConfirmOpen, setIsStatBuyConfirmOpen] = useState(false);
  const [isSubmittingStatBuy, setIsSubmittingStatBuy] = useState(false);

  useEffect(() => {
    if (id) {
      fetchShopData();
      checkAdmin();
      fetchEventCoinName();
      fetchUserCharacters();
    }
  }, [id]);

  const checkAdmin = async () => {
    try {
      const { data: { user } } = await AuthService.getUser();
      if (user) {
        const { data: profile } = await createClient().from('profiles').select('role').eq('id', user.id).single();
        setIsAdmin(profile?.role === 'admin');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEventCoinName = async () => {
    try {
      const val = await MasterService.getSystemConfig('moneda_evento_nombre');
      if (val) setEventCoinName(val);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserCharacters = async () => {
    setCharLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await AuthService.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('reg_characters')
        .select('*')
        .eq('user_id', user.id)
        .eq('activo', true)
        .eq('eliminado_voluntario', false);

      if (error) throw error;
      setCharacters(data || []);

      // Auto-select the active one or first one
      if (data && data.length > 0) {
        const active = data.find(c => c.activo) || data[0];
        setSelectedChar(active);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCharLoading(false);
    }
  };

  const fetchShopData = async () => {
    setLoading(true);
    try {
      const shopId = Number(id);
      const shop = await TiendasService.getTiendaById(shopId);
      setTienda(shop);

      if (shop.es_experiencia) {
        const costes = await TiendasService.getTiendaExperienciaCostes();
        setExpCosts(costes);
        setSelectedCategory('stats');
      } else {
        setSelectedCategory(null);
      }

      const items = await TiendasService.getTiendaObjetos(shopId);
      setObjetos(items);

      // If admin, load all active glosario items to allow linking
      const supabase = createClient();
      const { data: glosario } = await supabase
        .from('info_glosario')
        .select('*')
        .eq('activo', true)
        .order('nombre_es');
      setGlosarioActivo(glosario || []);
    } catch (err: any) {
      console.error(err);
      addToast('Error al cargar la tienda ninja', 'error');
      router.push('/registros/tiendas');
    } finally {
      setLoading(false);
    }
  };

  // Pre-populate fields when selecting glosario item in normal shop linking
  useEffect(() => {
    if (selectedGlosarioId) {
      const selected = glosarioActivo.find(g => g.id === selectedGlosarioId);
      if (selected) {
        setFormObjeto(prev => ({
          ...prev,
          coste_ryous: selected.coste_ryous || 0,
          coste_exp: selected.coste_exp || 0,
          coste_moneda_evento: 0,
          mantener_requisitos: true
        }));
      }
    }
  }, [selectedGlosarioId]);

  const handleSaveCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tienda) return;

    setIsSavingItem(true);
    try {
      const supabase = createClient();

      if (isCustomItem && tienda.es_experiencia) {
        // --- 1. Experience Shop Virtual Bridge Glosario Flow ---
        if (!formCustomGlosario.nombre_es.trim()) {
          addToast('El nombre de la mejora es obligatorio', 'error');
          return;
        }

        // Insert into info_glosario with es_tienda_exp = true and activo = false
        const { data: newGlosario, error: glosarioError } = await supabase
          .from('info_glosario')
          .insert([{
            nombre_es: formCustomGlosario.nombre_es.trim(),
            nombre_jp: formCustomGlosario.nombre_jp.trim() || null,
            descripcion: formCustomGlosario.descripcion.trim() || null,
            categoria_id: formCustomGlosario.categoria_id,
            coste_exp: formCustomGlosario.coste_exp,
            coste_ryous: formCustomGlosario.coste_ryous,
            requisitos: formCustomGlosario.requisitos,
            activo: false, // Non-eligible in general list
            es_tienda_exp: true // Identified as bridge glosario
          }])
          .select()
          .single();

        if (glosarioError) throw glosarioError;

        // Insert into reg_tiendas_objetos
        const { error: linkError } = await supabase
          .from('reg_tiendas_objetos')
          .insert([{
            tienda_id: tienda.id,
            glosario_id: newGlosario.id,
            coste_ryous: formCustomGlosario.coste_ryous,
            coste_exp: formCustomGlosario.coste_exp,
            coste_moneda_evento: 0,
            mantener_requisitos: true
          }]);

        if (linkError) throw linkError;
        addToast('Mejora especial creada e incorporada al catálogo', 'success');

      } else {
        // --- 2. Normal / Event Shop Linking Flow ---
        if (!selectedGlosarioId) {
          addToast('Debe seleccionar un objeto del glosario', 'error');
          return;
        }

        // Check if already in shop
        const exists = objetos.some(o => o.glosario_id === selectedGlosarioId);
        if (exists && !formObjeto.id) {
          addToast('Este objeto ya forma parte del catálogo de la tienda', 'error');
          return;
        }

        const cleanData: any = {
          tienda_id: tienda.id,
          glosario_id: selectedGlosarioId,
          coste_ryous: formObjeto.coste_ryous ?? 0,
          coste_exp: formObjeto.coste_exp ?? 0,
          coste_moneda_evento: formObjeto.coste_moneda_evento ?? 0,
          mantener_requisitos: formObjeto.mantener_requisitos ?? true,
          requisitos_personalizados: formObjeto.mantener_requisitos ? null : formObjeto.requisitos_personalizados
        };

        if (formObjeto.id) {
          cleanData.id = formObjeto.id;
        }

        await AdminService.saveTiendaObjeto(cleanData);
        addToast(formObjeto.id ? 'Artículo de catálogo actualizado' : 'Artículo añadido con éxito al catálogo', 'success');
      }

      setIsAddModalOpen(false);
      resetForms();
      fetchShopData();
    } catch (err: any) {
      console.error(err);
      addToast('Error al guardar el artículo en el catálogo', 'error');
    } finally {
      setIsSavingItem(false);
    }
  };

  const resetForms = () => {
    setSelectedGlosarioId(null);
    setIsCustomItem(false);
    setFormObjeto({
      coste_ryous: 0,
      coste_exp: 0,
      coste_moneda_evento: 0,
      mantener_requisitos: true,
      requisitos_personalizados: {
        rango: null,
        combates: 0,
        stats: { sm: 0, agi: 0, est: 0, fue: 0, gen: 0, int: 0, nin: 0, tai: 0 }
      }
    });
    setFormCustomGlosario({
      nombre_es: '',
      nombre_jp: '',
      descripcion: '',
      categoria_id: 2,
      coste_exp: 0,
      coste_ryous: 0,
      requisitos: {
        rango: null,
        combates: 0,
        stats: { sm: 0, agi: 0, est: 0, fue: 0, gen: 0, int: 0, nin: 0, tai: 0 }
      }
    });
  };

  const handleDeleteCatalogItem = async (id: number) => {
    try {
      await AdminService.deleteTiendaObjeto(id);
      addToast('Artículo retirado del catálogo', 'success');
      fetchShopData();
    } catch (err: any) {
      console.error(err);
      addToast('Error al retirar el artículo', 'error');
    }
  };

  const handleExecutePurchase = async () => {
    if (!selectedChar || !isBuyConfirmOpen) return;

    setIsSubmittingBuy(true);
    try {
      const result = await TiendasService.realizarCompra(selectedChar.id, isBuyConfirmOpen.id);
      if (result && result.success) {
        addToast(`¡Compra completada con éxito!`, 'success');
        setIsBuyConfirmOpen(null);
        // Refresh character data
        fetchUserCharacters();
        fetchShopData();
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error al procesar la compra', 'error');
    } finally {
      setIsSubmittingBuy(false);
    }
  };

  // Calculate experience shop cost
  const calculateTotalExpCost = (current: number, qty: number) => {
    let total = 0;
    const breakDown: { level: number; cost: number }[] = [];
    let isLevelBlocked = false;

    for (let i = 1; i <= qty; i++) {
      const nextLevel = current + i;
      const cost = expCosts[String(nextLevel)];

      if (cost === undefined || cost === null) {
        isLevelBlocked = true;
        breakDown.push({ level: nextLevel, cost: -1 });
      } else {
        total += cost;
        breakDown.push({ level: nextLevel, cost });
      }
    }

    return { total, breakDown, isLevelBlocked };
  };

  const handleIncrement = () => {
    if (!selectedChar) return;
    const currentStat = Number(selectedChar.puntos_stats) || 0;
    setStatPointsToBuy(prev => {
      const next = prev + 1;
      const { total, isLevelBlocked } = calculateTotalExpCost(currentStat, next);
      if (isLevelBlocked) {
        return prev;
      }
      if (total <= selectedChar.xp) {
        return next;
      }
      return prev;
    });
  };

  const handleDecrement = () => {
    setStatPointsToBuy(prev => Math.max(1, prev - 1));
  };

  const handleSelectMax = () => {
    if (!selectedChar) return;
    const current = Number(selectedChar.puntos_stats) || 0;
    let qty = 0;
    let total = 0;
    while (true) {
      const nextLevel = current + qty + 1;
      const cost = expCosts[String(nextLevel)];
      if (cost === undefined || cost === null) {
        break;
      }
      if (total + cost <= selectedChar.xp) {
        qty++;
        total += cost;
      } else {
        break;
      }
    }
    setStatPointsToBuy(Math.max(1, qty));
  };

  const handleExecuteStatPurchase = async () => {
    if (!selectedChar) return;
    const currentStat = Number(selectedChar.puntos_stats) || 0;
    const { total: totalCost, isLevelBlocked } = calculateTotalExpCost(currentStat, statPointsToBuy);

    if (isLevelBlocked) {
      addToast('Uno de los niveles a comprar no está configurado o está bloqueado', 'error');
      return;
    }
    if (selectedChar.xp < totalCost) {
      addToast('Experiencia insuficiente', 'error');
      return;
    }

    setIsSubmittingStatBuy(true);
    try {
      const result = await TiendasService.comprarPuntosStat(selectedChar.id, statPointsToBuy, totalCost);
      if (result && result.success) {
        addToast(`¡Has comprado +${statPointsToBuy} Puntos de Stat con éxito!`, 'success');
        setIsStatBuyConfirmOpen(false);
        setStatPointsToBuy(1);
        fetchUserCharacters();
        fetchShopData();
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error al procesar la compra de stats', 'error');
    } finally {
      setIsSubmittingStatBuy(false);
    }
  };

  // Helper validation to show requirements to user
  const validateRequirements = (obj: TiendaObjeto, char: Character | null) => {
    if (!char) return { allowed: false, reasons: ['Debe seleccionar un shinobi para realizar la compra'] };

    const reasons: string[] = [];
    let allowed = true;

    // 1. Costs validation
    if (char.ryous < obj.coste_ryous) {
      allowed = false;
      reasons.push(`Ryous insuficientes (Se necesitan ${obj.coste_ryous.toLocaleString()}, tienes ${char.ryous.toLocaleString()})`);
    }
    if (char.xp < obj.coste_exp) {
      allowed = false;
      reasons.push(`Experiencia insuficiente (Se necesitan ${obj.coste_exp.toLocaleString()}, tienes ${char.xp.toLocaleString()})`);
    }
    if (tienda?.es_evento && char.moneda_evento < obj.coste_moneda_evento) {
      allowed = false;
      reasons.push(`${tienda.nombre_moneda || eventCoinName} insuficientes (Se necesitan ${obj.coste_moneda_evento.toLocaleString()}, tienes ${char.moneda_evento.toLocaleString()})`);
    }

    // 2. Glosario Requirements validation
    const reqs = obj.mantener_requisitos ? obj.info_glosario?.requisitos : obj.requisitos_personalizados;

    if (reqs) {
      // Range check
      if (reqs.rango) {
        const ranges = ['D', 'C', 'B', 'A', 'S'];
        const charRangeIdx = ranges.indexOf(char.rango);
        const reqRangeIdx = ranges.indexOf(reqs.rango);
        if (charRangeIdx < reqRangeIdx) {
          allowed = false;
          reasons.push(`Rango Shinobi insuficiente (Se requiere rango ${reqs.rango}, tienes ${char.rango})`);
        }
      }

      // Combat points check
      if (reqs.combates && char.puntos_combate < reqs.combates) {
        allowed = false;
        reasons.push(`Puntos de Combate insuficientes (Se necesitan ${reqs.combates}, tienes ${char.puntos_combate})`);
      }

      // Stats check
      if (reqs.stats) {
        const charStats = char.stats_base || {};
        for (const statKey in reqs.stats) {
          const reqVal = reqs.stats[statKey];
          if (reqVal > 0) {
            const charVal = charStats[statKey.toUpperCase() as keyof typeof charStats] || 0;
            if (charVal < reqVal) {
              allowed = false;
              reasons.push(`Estadística ${statKey.toUpperCase()} insuficiente (Se requieren ${reqVal}, tienes ${charVal})`);
            }
          }
        }
      }
    }

    // 3. Unique technique check (technique categories are 1)
    if (obj.info_glosario?.categoria_id === 1) {
      // Check if character already has this technique
      const hasTec = char.personajes_tecnicas?.some(t => t.tecnica_id === obj.glosario_id);
      if (hasTec) {
        allowed = false;
        reasons.push(`El personaje ya domina esta técnica`);
      }
    }

    return { allowed, reasons };
  };

  // Filter and search catalog
  const filteredObjetos = objetos.filter(obj => {
    const glosario = obj.info_glosario;
    if (!glosario) return false;

    // Search
    const searchMatch =
      glosario.nombre_es.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (glosario.nombre_jp && glosario.nombre_jp.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!searchMatch) return false;

    // Category
    if (selectedCategory !== null && selectedCategory !== 'stats' && glosario.categoria_id !== selectedCategory) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col animate-in fade-in duration-500">
      {tienda && (
        <div className="max-w-[1750px] mx-auto w-full flex-1">
          <header className="w-full mb-8 ninja-card-oro p-6 xl:p-8 flex flex-col md:flex-row justify-between items-center gap-6 z-50">
            <Breadcrumbs
              items={[
                { label: 'Inicio', href: '/' },
                { label: 'Registros', href: '/registros' },
                { label: 'Tiendas Ninja', href: '/registros/tiendas' },
                { label: tienda.nombre }
              ]}
            />
            <button
              onClick={() => router.push('/registros/tiendas')}
              className="ninja-btn-ghost py-2 px-4 text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Tiendas</span>
            </button>
          </header>

          {/* Unified Banner & Buyer Selection Card */}
          <div className="mb-8 ninja-card-oro p-6 sm:p-8 xl:p-10 xl:pb-7">
            {/* Top Row: Shop Details & Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-oro/10">
              <div>
                <h1 className="ninja-title text-3xl sm:text-4xl xl:text-6xl mb-4">{tienda.nombre}</h1>
                <p className="text-gris-texto text-sm sm:text-base max-w-3xl leading-relaxed">{tienda.descripcion}</p>
              </div>

              {/* Admin create product button */}
              {isAdmin && (
                <button
                  onClick={() => {
                    resetForms();
                    setIsAddModalOpen(true);
                  }}
                  className="ninja-btn-oro py-3 px-6 text-xs font-black uppercase tracking-widest flex items-center gap-3"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tienda.es_experiencia ? 'Crear Mejora Especial' : 'Añadir al Catálogo'}</span>
                </button>
              )}
            </div>

            {/* Bottom Row: Shinobi Buyer Selection & Funds Panel */}
            <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6 animate-in slide-in-from-top-1 duration-500">
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
                <div className="space-y-3 text-center sm:text-left flex flex-col">
                  <span className="text-[10px] font-black text-oro/40 uppercase tracking-widest">Shinobi Comprador</span>
                  {charLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-oro" />
                  ) : characters.length > 0 ? (
                    <select
                      value={selectedChar?.id || ''}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedChar(characters.find(c => c.id === id) || null);
                      }}
                      className="ninja-input py-2 text-sm max-w-xs font-black text-oro bg-zinc-950"
                    >
                      {characters.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre_ninja} ({c.rango_jerarquico})</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-red-400 font-bold uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>No tienes shinobis activos</span>
                    </p>
                  )}
                </div>
              </div>

              {selectedChar && (
                <div className="flex flex-wrap justify-center sm:justify-end items-center gap-8 w-full md:w-auto">
                  {/* Ryous */}
                  <div className="text-center bg-zinc-950/40 px-6 py-2 border border-oro/5" style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
                    <span className="block text-[9px] font-black text-oro/40 uppercase tracking-widest">Fondos de Ryous</span>
                    <span className="text-lg font-black text-oro tracking-wider">{selectedChar.ryous.toLocaleString()} Ryous</span>
                  </div>
                  {/* EXP */}
                  <div className="text-center bg-zinc-950/40 px-6 py-2 border border-oro/5" style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
                    <span className="block text-[9px] font-black text-oro/40 uppercase tracking-widest">Puntos de EXP</span>
                    <span className="text-lg font-black text-oro tracking-wider">{selectedChar.xp.toLocaleString()} EXP</span>
                  </div>
                  {/* Moneda Evento */}
                  {tienda.es_evento && (
                    <div className="text-center bg-zinc-950/40 px-6 py-2 border border-oro/5" style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
                      <span className="block text-[9px] font-black text-oro/40 uppercase tracking-widest">
                        {tienda.nombre_moneda || eventCoinName}
                      </span>
                      <span className="text-lg font-black text-oro tracking-wider">
                        {selectedChar.moneda_evento.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search, Filters, Catalog */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1 space-y-6 ninja-card-oro p-6">
              <div className="pb-3 border-b border-oro/10">
                <h3 className="text-xs font-black text-oro uppercase tracking-widest">Filtrar Catálogo</h3>
              </div>

              {/* Search input */}
              {selectedCategory !== 'stats' && (
                <div className="relative animate-in fade-in duration-300">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-oro/40" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar artículo..."
                    className="ninja-input py-2.5 pl-11 pr-4 w-full text-xs"
                  />
                </div>
              )}

              {/* Categories buttons */}
              <div className="flex flex-col gap-2">
                {[
                  ...(tienda.es_experiencia ? [{ id: 'stats', label: 'Puntos de Stats' }] : []),
                  { id: null, label: 'Todos los Artículos' },
                  { id: 2, label: 'Objetos & Armas' },
                  { id: 1, label: 'Técnicas Shinobi' },
                  { id: 3, label: 'Kuchiyoses / Invocaciones' },
                  { id: 4, label: 'Pasivas & Mejoras' }
                ].map(cat => (
                  <button
                    key={cat.id ?? 'all'}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`py-3 px-4 text-left text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat.id
                        ? 'bg-oro text-black shadow-lg shadow-oro/10'
                        : 'border border-oro/5 hover:border-oro/20 text-oro/70 hover:text-oro bg-black/10'
                      }`}
                    style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog / Stats Console Grid */}
            <div className="lg:col-span-3">
              {selectedCategory === 'stats' && tienda.es_experiencia ? (
                <div className="w-full space-y-8 animate-in fade-in duration-500">
                  {!selectedChar ? (
                    <div className="py-20 text-center ninja-card-oro opacity-80 max-w-2xl mx-auto">
                      <AlertCircle className="w-16 h-16 text-oro/40 mx-auto mb-4 animate-pulse" />
                      <h3 className="text-lg font-black text-oro uppercase tracking-wider mb-2">Se requiere un Shinobi</h3>
                      <p className="text-xs text-gris-texto leading-relaxed px-6">
                        Selecciona un personaje en la barra superior para poder acceder a la compra de puntos de estadísticas y calcular sus costes dinámicos.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                      {/* Console section: Col span 7 */}
                      <div className="xl:col-span-7 space-y-8">
                        {/* Stat Buying Card */}
                        <div className="ninja-card-oro p-6 sm:p-8 space-y-6">
                          <div className="pb-4 border-b border-oro/10">
                            <div>
                              <h2 className="text-lg sm:text-xl font-black text-oro uppercase tracking-widest">
                                Consola de Compra de Stats
                              </h2>
                              <p className="text-[10px] text-gris-texto uppercase tracking-widest font-black">
                                1 Punto de Stat = Aumento permanente en tu ficha
                              </p>
                            </div>
                          </div>

                          {/* Progression Display */}
                          <div className="grid grid-cols-3 gap-4 items-center bg-zinc-950/60 p-6 border border-oro/5" style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}>
                            <div className="text-center">
                              <span className="block text-[8px] font-black text-oro/40 uppercase tracking-widest mb-1">Actual</span>
                              <div className="inline-flex items-center justify-center w-14 h-14 rounded-none border border-oro/20 bg-zinc-900 text-2xl font-black text-oro">
                                {selectedChar.puntos_stats || 0}
                              </div>
                            </div>

                            <div className="flex justify-center">
                              <ChevronRight className="w-8 h-8 text-oro/30 animate-pulse" />
                            </div>

                            <div className="text-center">
                              <span className="block text-[8px] font-black text-oro/40 uppercase tracking-widest mb-1">Objetivo</span>
                              <div className="inline-flex items-center justify-center w-14 h-14 rounded-none border-2 border-oro bg-zinc-900 text-2xl font-black text-oro shadow-[0_0_15px_rgba(212,175,55,0.15)] animate-pulse">
                                {(selectedChar.puntos_stats || 0) + statPointsToBuy}
                              </div>
                            </div>
                          </div>

                          {/* Quantity Selector */}
                          <div className="space-y-3">
                            <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">
                              Cantidad de Puntos a Comprar
                            </label>
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                              <div className="flex items-center bg-zinc-950 border border-oro/20 p-1 w-full sm:w-auto" style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
                                <button
                                  type="button"
                                  onClick={handleDecrement}
                                  disabled={statPointsToBuy <= 1}
                                  className="p-3 text-oro/60 hover:text-oro disabled:text-zinc-700 transition-all font-black text-lg"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  value={statPointsToBuy}
                                  onChange={(e) => {
                                    const val = Math.max(1, Number(e.target.value) || 1);
                                    const currentStat = Number(selectedChar.puntos_stats) || 0;
                                    const { total } = calculateTotalExpCost(currentStat, val);
                                    if (total <= selectedChar.xp) {
                                      setStatPointsToBuy(val);
                                    } else {
                                      // Set to maximum they can afford
                                      let qty = 0;
                                      let accum = 0;
                                      while (true) {
                                        const next = currentStat + qty + 1;
                                        const cost = expCosts[String(next)];
                                        if (cost === undefined || cost === null) break;
                                        if (accum + cost <= selectedChar.xp) {
                                          qty++;
                                          accum += cost;
                                        } else {
                                          break;
                                        }
                                      }
                                      setStatPointsToBuy(Math.max(1, qty));
                                    }
                                  }}
                                  className="w-20 text-center font-black text-oro text-lg bg-transparent border-none focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={handleIncrement}
                                  className="p-3 text-oro/60 hover:text-oro transition-all font-black text-lg"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={handleSelectMax}
                                className="w-full sm:w-auto ninja-btn-ghost py-3.5 px-6 text-[10px] font-black uppercase tracking-widest"
                              >
                                Calcular Máximo Posible
                              </button>
                            </div>
                          </div>

                          {/* Cost Aggregator Panel */}
                          {(() => {
                            const current = Number(selectedChar.puntos_stats) || 0;
                            const { total, breakDown, isLevelBlocked } = calculateTotalExpCost(current, statPointsToBuy);
                            const canAfford = selectedChar.xp >= total;

                            return (
                              <div className="space-y-4">
                                <div className="p-5 bg-zinc-950/80 border border-oro/10 space-y-4" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
                                  <div className="flex justify-between items-center pb-3 border-b border-oro/5">
                                    <span className="text-xs font-black text-oro/60 uppercase tracking-widest">Resumen de Compra</span>
                                    <span className="text-[10px] font-black text-oro/30 uppercase tracking-widest">+{statPointsToBuy} Puntos</span>
                                  </div>

                                  <div className="space-y-2 text-xs">
                                    {breakDown.map((item, idx) => (
                                      <div key={idx} className="flex justify-between font-bold text-oro/80">
                                        <span>Nivel {item.level}:</span>
                                        <span>
                                          {item.cost === -1 ? (
                                            <span className="text-red-400">Bloqueado / No Disp.</span>
                                          ) : (
                                            `${item.cost.toLocaleString()} EXP`
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="pt-3 border-t border-oro/5 flex justify-between items-center">
                                    <span className="text-xs font-black text-oro uppercase tracking-widest">Coste Total:</span>
                                    <span className={`text-xl font-black ${canAfford && !isLevelBlocked ? 'text-oro' : 'text-red-400'}`}>
                                      {isLevelBlocked ? '---' : `${total.toLocaleString()} EXP`}
                                    </span>
                                  </div>

                                  {!canAfford && !isLevelBlocked && (
                                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider text-right">
                                      Experiencia insuficiente (te faltan {(total - selectedChar.xp).toLocaleString()} EXP)
                                    </p>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  disabled={!canAfford || isLevelBlocked || statPointsToBuy <= 0}
                                  onClick={() => setIsStatBuyConfirmOpen(true)}
                                  className={`w-full py-4 font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all ${canAfford && !isLevelBlocked && statPointsToBuy > 0
                                      ? 'ninja-btn-oro shadow-lg shadow-oro/5'
                                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50 bg-black/20'
                                    }`}
                                  style={(!canAfford || isLevelBlocked || statPointsToBuy <= 0) ? { clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' } : undefined}
                                >
                                  <span>Adquirir Puntos de Stat</span>
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Cost Reference Panel: Col span 5 */}
                      <div className="xl:col-span-5 space-y-6">
                        <div className="ninja-card-oro p-6">
                          <div className="pb-3 border-b border-oro/10 mb-4">
                            <h3 className="text-xs font-black text-oro uppercase tracking-widest">
                              Tabla de Costes de Estadísticas
                            </h3>
                          </div>
                          <p className="text-[10px] text-gris-texto mb-4 uppercase tracking-wider font-bold">
                            Lista oficial de costes de EXP según los puntos de stat objetivo del Shinobi:
                          </p>

                          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {Object.entries(expCosts)
                              .map(([lvlStr, cost]) => ({ lvl: Number(lvlStr), cost }))
                              .sort((a, b) => a.lvl - b.lvl)
                              .map(({ lvl, cost }) => {
                                const charLvl = Number(selectedChar.puntos_stats) || 0;
                                const isCurrent = charLvl === lvl;

                                // Check if this level is part of the current purchase target range
                                const isTargeted = lvl > charLvl && lvl <= charLvl + statPointsToBuy;

                                // Check status
                                let badgeColor = '';
                                let badgeText = '';

                                if (lvl <= charLvl) {
                                  badgeColor = 'border-zinc-800 text-zinc-500 bg-zinc-950/20';
                                  badgeText = 'Adquirido';
                                } else if (isTargeted) {
                                  badgeColor = 'border-oro/30 text-oro bg-oro/10 animate-pulse';
                                  badgeText = 'Comprando';
                                } else if (lvl === charLvl + 1) {
                                  badgeColor = 'border-amber-600/30 text-amber-500 bg-amber-950/10';
                                  badgeText = 'Siguiente';
                                } else {
                                  badgeColor = 'border-zinc-800 text-zinc-400 bg-zinc-950/40';
                                  badgeText = 'Pendiente';
                                }

                                return (
                                  <div
                                    key={lvl}
                                    className={`flex justify-between items-center p-3 border transition-all text-xs font-bold ${isTargeted
                                        ? 'border-oro/30 bg-zinc-900/80 shadow-md shadow-oro/5'
                                        : 'border-oro/5 bg-zinc-950/20'
                                      }`}
                                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`w-8 text-center text-[10px] font-black py-0.5 px-1 border ${isTargeted ? 'border-oro text-oro bg-black' : 'border-oro/15 text-oro/70 bg-black/40'
                                        }`}>
                                        {lvl}
                                      </span>
                                      <span className={lvl <= charLvl ? 'text-zinc-500 line-through' : 'text-oro/90'}>
                                        {cost === 0 ? 'Coste 0 / Especial' : `${cost.toLocaleString()} EXP`}
                                      </span>
                                    </div>

                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${badgeColor}`}>
                                      {badgeText}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Normal Catalog Grid */
                filteredObjetos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {filteredObjetos.map(obj => {
                      const glosario = obj.info_glosario;
                      if (!glosario) return null;
                      const { allowed, reasons } = validateRequirements(obj, selectedChar);
                      const isTecnica = glosario.categoria_id === 1;
                      const itemReqs = obj.mantener_requisitos ? glosario.requisitos : obj.requisitos_personalizados;

                      return (
                        <div
                          key={obj.id}
                          className={`ninja-card-oro p-6 xl:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-oro/5 hover:-translate-y-0.5 ${allowed ? '' : 'opacity-80 hover:opacity-100'
                            }`}
                        >
                          <div className="space-y-4">
                            {/* Item Card Header */}
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className="text-[9px] font-black text-oro/40 uppercase tracking-widest">
                                  {isTecnica ? 'TÉCNICA SHINOBI' : 'ARTÍCULO / MEJORA'}
                                </span>
                                <h3 className="text-lg sm:text-xl font-black text-oro uppercase tracking-wider">
                                  {glosario.nombre_es} {glosario.nombre_jp && <span className="text-xs text-oro/55 font-normal">({glosario.nombre_jp})</span>}
                                </h3>
                              </div>

                              {/* Admin actions inside card */}
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteCatalogItem(obj.id)}
                                  className="p-2 border border-red-500/20 hover:border-red-500 hover:bg-red-500/10 text-red-400 transition-all"
                                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                                  title="Retirar del catálogo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Requirements panel if any */}
                            {itemReqs && (() => {
                              const hasRango = !!itemReqs.rango;
                              const hasCombates = itemReqs.combates > 0;
                              const hasStats = itemReqs.stats && Object.values(itemReqs.stats).some((v: any) => v > 0);

                              if (!hasRango && !hasCombates && !hasStats) return null;

                              return (
                                <div className="p-4 sm:p-5 bg-black/60 border border-oro/10 space-y-3" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
                                  <span className="block text-[10px] font-black text-oro/60 uppercase tracking-widest">
                                    Requisitos de Adquisición
                                  </span>

                                  <div className="flex flex-wrap gap-2">
                                    {hasRango && (() => {
                                      const ranges = ['D', 'C', 'B', 'A', 'S'];
                                      const charRangeIdx = selectedChar ? ranges.indexOf(selectedChar.rango) : -1;
                                      const reqRangeIdx = ranges.indexOf(itemReqs.rango);
                                      const isMet = !selectedChar || charRangeIdx >= reqRangeIdx;

                                      return (
                                        <span
                                          className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-sm border transition-colors ${isMet
                                              ? 'bg-black/40 border-oro/10 text-oro/80'
                                              : 'bg-rojo-oscuro/20 border-rojo-sangre/30 text-rojo-sangre'
                                            }`}
                                        >
                                          <span>Rango: <strong className="font-black text-oro">{itemReqs.rango}</strong></span>
                                        </span>
                                      );
                                    })()}

                                    {hasCombates && (() => {
                                      const isMet = !selectedChar || selectedChar.puntos_combate >= itemReqs.combates;

                                      return (
                                        <span
                                          className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-sm border transition-colors ${isMet
                                              ? 'bg-black/40 border-oro/10 text-oro/80'
                                              : 'bg-rojo-oscuro/20 border-rojo-sangre/30 text-rojo-sangre'
                                            }`}
                                        >
                                          <span>Combates: <strong className="font-black text-oro">{itemReqs.combates}</strong></span>
                                        </span>
                                      );
                                    })()}

                                    {hasStats && Object.entries(itemReqs.stats)
                                      .filter(([_, v]: any) => v > 0)
                                      .map(([k, v]: any) => {
                                        const charStats = selectedChar?.stats_base || {};
                                        const charVal = charStats[k.toUpperCase() as keyof typeof charStats] || 0;
                                        const isMet = !selectedChar || charVal >= v;

                                        return (
                                          <span
                                            key={k}
                                            className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-sm border transition-colors ${isMet
                                                ? 'bg-black/40 border-oro/10 text-oro/80'
                                                : 'bg-rojo-oscuro/20 border-rojo-sangre/30 text-rojo-sangre'
                                              }`}
                                          >
                                            <span>{k.toUpperCase()}: <strong className="font-black text-oro">{v}</strong></span>
                                          </span>
                                        );
                                      })
                                    }
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="mt-6 pt-6 border-t border-oro/10 flex items-center justify-between gap-6">
                            <div className="space-y-1">
                              <span className="block text-[8px] font-black text-oro/30 uppercase tracking-widest">Precio</span>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {obj.coste_ryous > 0 && (
                                  <span className="text-sm font-black text-oro">{obj.coste_ryous.toLocaleString()} Ryous</span>
                                )}
                                {obj.coste_exp > 0 && (
                                  <span className="text-sm font-black text-oro">{obj.coste_exp.toLocaleString()} EXP</span>
                                )}
                                {tienda.es_evento && obj.coste_moneda_evento > 0 && (
                                  <span className="text-sm font-black text-oro">
                                    {obj.coste_moneda_evento.toLocaleString()} {tienda.nombre_moneda || eventCoinName}
                                  </span>
                                )}
                                {obj.coste_ryous === 0 && obj.coste_exp === 0 && (!tienda.es_evento || obj.coste_moneda_evento === 0) && (
                                  <span className="text-sm font-black text-emerald-400">Gratuito</span>
                                )}
                              </div>
                            </div>

                            <button
                              disabled={!allowed}
                              onClick={() => setIsBuyConfirmOpen(obj)}
                              className={`px-5 py-3 font-black text-xs uppercase tracking-widest text-center transition-all ${allowed
                                  ? 'ninja-btn-oro'
                                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50 bg-black/20'
                                }`}
                              style={!allowed ? { clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' } : undefined}
                            >
                              <span>Comprar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-40 text-center ninja-card-oro border-dashed opacity-60">
                    <ShoppingBag className="w-16 h-16 text-oro/20 mx-auto mb-4" />
                    <p className="text-sm font-black text-oro/20 uppercase tracking-[0.4em] italic">No hay artículos que coincidan con los filtros</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM BUY MODAL */}
      {isBuyConfirmOpen && selectedChar && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="w-full max-w-md ninja-card-oro p-8 relative text-center"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
          >
            <h2 className="text-xl font-black text-oro uppercase tracking-wider mb-2">¿Confirmar Adquisición?</h2>

            <p className="text-xs text-gris-texto mb-6">
              Estás a punto de comprar <strong className="font-bold text-oro">{isBuyConfirmOpen.info_glosario?.nombre_es}</strong> para tu shinobi <strong className="font-bold text-oro">{selectedChar.nombre_ninja}</strong>.
            </p>

            {/* Recurso deduction list */}
            <div
              className="p-4 bg-zinc-950/80 border border-oro/5 space-y-2 text-left mb-6 text-xs text-oro/80"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              <span className="block text-[8px] font-black text-oro/30 uppercase tracking-widest mb-1.5">Deducciones de Recursos</span>
              {isBuyConfirmOpen.coste_ryous > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Coste en Ryous:</span>
                  <span className="text-oro">-{isBuyConfirmOpen.coste_ryous.toLocaleString()} Ryous</span>
                </div>
              )}
              {isBuyConfirmOpen.coste_exp > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Coste en Experiencia:</span>
                  <span className="text-oro">-{isBuyConfirmOpen.coste_exp.toLocaleString()} EXP</span>
                </div>
              )}
              {tienda?.es_evento && isBuyConfirmOpen.coste_moneda_evento > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Coste en {tienda.nombre_moneda || eventCoinName}:</span>
                  <span className="text-oro">-{isBuyConfirmOpen.coste_moneda_evento.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsBuyConfirmOpen(null)}
                className="flex-1 ninja-btn-ghost py-3 font-black text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecutePurchase}
                disabled={isSubmittingBuy}
                className="flex-1 ninja-btn-oro py-3 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest"
              >
                {isSubmittingBuy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Confirmar Compra</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAT BUY CONFIRM MODAL */}
      {isStatBuyConfirmOpen && selectedChar && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="w-full max-w-md ninja-card-oro p-8 relative text-center"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
          >
            <h2 className="text-xl font-black text-oro uppercase tracking-wider mb-2">¿Confirmar Aumento de Stats?</h2>

            <p className="text-xs text-gris-texto mb-6 leading-relaxed">
              Estás a punto de comprar <strong className="font-bold text-oro">+{statPointsToBuy} Puntos de Stat</strong> permanentes para tu shinobi <strong className="font-bold text-oro">{selectedChar.nombre_ninja}</strong>.
            </p>

            {/* Recurso deduction list */}
            {(() => {
              const current = Number(selectedChar.puntos_stats) || 0;
              const { total } = calculateTotalExpCost(current, statPointsToBuy);

              return (
                <div
                  className="p-4 bg-zinc-950/80 border border-oro/5 space-y-2 text-left mb-6 text-xs text-oro/80"
                  style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                >
                  <span className="block text-[8px] font-black text-oro/30 uppercase tracking-widest mb-1.5">Progreso y Deducción</span>
                  <div className="flex justify-between font-bold">
                    <span>Stats Actuales:</span>
                    <span className="text-oro">{current} Puntos</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Stats Finales:</span>
                    <span className="text-oro">{current} &rarr; {current + statPointsToBuy} Puntos</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-oro/5 pt-2 mt-2">
                    <span>Deducción de EXP:</span>
                    <span className="text-red-400">-{total.toLocaleString()} EXP</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsStatBuyConfirmOpen(false)}
                className="flex-1 ninja-btn-ghost py-3 font-black text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteStatPurchase}
                disabled={isSubmittingStatBuy}
                className="flex-1 ninja-btn-oro py-3 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest"
              >
                {isSubmittingStatBuy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Adquirir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN ADD/CREATE MODAL */}
      {isAddModalOpen && tienda && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          <div
            className="w-full max-w-2xl ninja-card-oro p-8 relative flex flex-col max-h-[90vh] overflow-y-auto"
            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-oro/40 hover:text-oro transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl sm:text-2xl font-black text-oro uppercase tracking-wider mb-6 pb-2 border-b border-oro/10">
              {tienda.es_experiencia ? 'Crear Artículo Especial (Tienda Exp)' : 'Añadir Artículo de Catálogo'}
            </h2>

            {/* Toggle custom experience item flow for special shop */}
            {tienda.es_experiencia && (
              <div className="mb-6 flex gap-4 border-b border-oro/5 pb-4">
                <button
                  type="button"
                  onClick={() => setIsCustomItem(true)}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border transition-all ${isCustomItem
                      ? 'bg-oro text-black border-oro'
                      : 'border-oro/10 text-oro/60 hover:text-oro bg-black/20'
                    }`}
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  Nuevo Artículo Personalizado
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomItem(false)}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border transition-all ${!isCustomItem
                      ? 'bg-oro text-black border-oro'
                      : 'border-oro/10 text-oro/60 hover:text-oro bg-black/20'
                    }`}
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  Vincular Artículo Glosario Existente
                </button>
              </div>
            )}

            <form onSubmit={handleSaveCatalogItem} className="space-y-6">

              {/* FLOW 1: CUSTOM BRIDGE GLOSARIO ITEM */}
              {tienda.es_experiencia && isCustomItem ? (
                <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Nombre (ES)</label>
                      <input
                        type="text"
                        value={formCustomGlosario.nombre_es}
                        onChange={(e) => setFormCustomGlosario({ ...formCustomGlosario, nombre_es: e.target.value })}
                        className="ninja-input py-2 w-full"
                        placeholder="Ej. Mejora de Chakra Nivel 1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Nombre (JP) - Opcional</label>
                      <input
                        type="text"
                        value={formCustomGlosario.nombre_jp}
                        onChange={(e) => setFormCustomGlosario({ ...formCustomGlosario, nombre_jp: e.target.value })}
                        className="ninja-input py-2 w-full"
                        placeholder="Ej. Chakura Appu"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Descripción / Efecto</label>
                    <textarea
                      value={formCustomGlosario.descripcion}
                      onChange={(e) => setFormCustomGlosario({ ...formCustomGlosario, descripcion: e.target.value })}
                      className="ninja-input py-2 w-full min-h-[60px]"
                      placeholder="Ej. Incrementa el chakra base del shinobi de forma permanente..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Categoría de Ficha</label>
                      <select
                        value={formCustomGlosario.categoria_id}
                        onChange={(e) => setFormCustomGlosario({ ...formCustomGlosario, categoria_id: Number(e.target.value) })}
                        className="ninja-input py-2 w-full bg-zinc-950"
                      >
                        <option value={2}>Objetos (Inventario)</option>
                        <option value={1}>Técnicas Shinobi</option>
                        <option value={4}>Pasivas & Mejoras</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Coste EXP</label>
                      <input
                        type="number"
                        value={formCustomGlosario.coste_exp}
                        onChange={(e) => setFormCustomGlosario({ ...formCustomGlosario, coste_exp: Number(e.target.value) })}
                        className="ninja-input py-2 w-full"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Coste Ryous</label>
                      <input
                        type="number"
                        value={formCustomGlosario.coste_ryous}
                        onChange={(e) => setFormCustomGlosario({ ...formCustomGlosario, coste_ryous: Number(e.target.value) })}
                        className="ninja-input py-2 w-full"
                        min={0}
                      />
                    </div>
                  </div>

                  {/* Requirements Custom for Experience Bridge Item */}
                  <div className="p-4 bg-zinc-950/80 border border-oro/10 space-y-4" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
                    <span className="block text-xs font-black text-oro/80 uppercase tracking-widest">Requisitos del Objeto Puente</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-oro/60 uppercase tracking-widest">Rango Requerido</label>
                        <select
                          value={formCustomGlosario.requisitos.rango || ''}
                          onChange={(e) => setFormCustomGlosario({
                            ...formCustomGlosario,
                            requisitos: { ...formCustomGlosario.requisitos, rango: e.target.value || null }
                          })}
                          className="ninja-input py-2 w-full bg-zinc-950"
                        >
                          <option value="">Sin límite</option>
                          <option value="D">Rango D</option>
                          <option value="C">Rango C</option>
                          <option value="B">Rango B</option>
                          <option value="A">Rango A</option>
                          <option value="S">Rango S</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-oro/60 uppercase tracking-widest">Puntos de Combate</label>
                        <input
                          type="number"
                          value={formCustomGlosario.requisitos.combates}
                          onChange={(e) => setFormCustomGlosario({
                            ...formCustomGlosario,
                            requisitos: { ...formCustomGlosario.requisitos, combates: Number(e.target.value) }
                          })}
                          className="ninja-input py-2 w-full"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* FLOW 2: LINK EXISTING GLOSARIO ELEMENT */
                <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Seleccionar Elemento del Glosario Activo</label>
                    <select
                      value={selectedGlosarioId || ''}
                      onChange={(e) => setSelectedGlosarioId(Number(e.target.value))}
                      className="ninja-input py-2.5 w-full bg-zinc-950 text-oro font-black"
                      required
                    >
                      <option value="">-- Elige un artículo --</option>
                      {glosarioActivo.map(g => (
                        <option key={g.id} value={g.id}>{g.nombre_es} ({g.info_glosario_categorias?.nombre || 'Objeto'})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Sobrescribir Ryous</label>
                      <input
                        type="number"
                        value={formObjeto.coste_ryous}
                        onChange={(e) => setFormObjeto({ ...formObjeto, coste_ryous: Number(e.target.value) })}
                        className="ninja-input py-2 w-full"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Sobrescribir EXP</label>
                      <input
                        type="number"
                        value={formObjeto.coste_exp}
                        onChange={(e) => setFormObjeto({ ...formObjeto, coste_exp: Number(e.target.value) })}
                        className="ninja-input py-2 w-full"
                        min={0}
                      />
                    </div>
                    {tienda.es_evento && (
                      <div className="space-y-2 animate-in slide-in-from-top-1">
                        <label className="block text-xs font-black text-oro/60 uppercase tracking-widest">Coste {tienda.nombre_moneda || eventCoinName}</label>
                        <input
                          type="number"
                          value={formObjeto.coste_moneda_evento}
                          onChange={(e) => setFormObjeto({ ...formObjeto, coste_moneda_evento: Number(e.target.value) })}
                          className="ninja-input py-2 w-full"
                          min={0}
                        />
                      </div>
                    )}
                  </div>

                  {/* Requirements configuration */}
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer pb-2 border-b border-oro/5">
                      <input
                        type="checkbox"
                        checked={!!formObjeto.mantener_requisitos}
                        onChange={(e) => setFormObjeto({ ...formObjeto, mantener_requisitos: e.target.checked })}
                        className="w-4 h-4 accent-oro"
                      />
                      <span className="text-xs font-black text-oro/80 uppercase tracking-widest">Mantener requisitos por defecto del glosario</span>
                    </label>

                    {!formObjeto.mantener_requisitos && (
                      <div
                        className="p-4 bg-zinc-950/80 border border-oro/10 space-y-4 animate-in slide-in-from-top-2 duration-300"
                        style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                      >
                        <span className="block text-xs font-black text-oro/80 uppercase tracking-widest">Configurar Requisitos de Compra Personalizados</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-oro/60 uppercase tracking-widest">Rango Shinobi</label>
                            <select
                              value={formObjeto.requisitos_personalizados?.rango || ''}
                              onChange={(e) => setFormObjeto({
                                ...formObjeto,
                                requisitos_personalizados: {
                                  ...formObjeto.requisitos_personalizados,
                                  rango: e.target.value || null
                                }
                              })}
                              className="ninja-input py-2 w-full bg-zinc-950"
                            >
                              <option value="">Cualquiera</option>
                              <option value="D">Rango D</option>
                              <option value="C">Rango C</option>
                              <option value="B">Rango B</option>
                              <option value="A">Rango A</option>
                              <option value="S">Rango S</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-oro/60 uppercase tracking-widest">Puntos de Combate</label>
                            <input
                              type="number"
                              value={formObjeto.requisitos_personalizados?.combates || 0}
                              onChange={(e) => setFormObjeto({
                                ...formObjeto,
                                requisitos_personalizados: {
                                  ...formObjeto.requisitos_personalizados,
                                  combates: Number(e.target.value)
                                }
                              })}
                              className="ninja-input py-2 w-full"
                              min={0}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6 flex gap-4 border-t border-oro/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 ninja-btn-ghost py-3 font-black text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="flex-1 ninja-btn-oro py-3 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest"
                >
                  {isSavingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{tienda.es_experiencia && isCustomItem ? 'Crear Mejora' : 'Vincular a Tienda'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
