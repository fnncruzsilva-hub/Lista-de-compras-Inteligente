import { auth, db, googleProvider } from "./firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  signOut,
  signInWithPopup
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc 
} from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  RotateCcw, 
  Download, 
  Moon, 
  Sun, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  ShoppingBasket, 
  History as HistoryIcon, 
  User as UserIcon,
  LogOut,
  X,
  Trophy,
  FileText,
  Save,
  Edit3,
  Minus,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Copy,
  RefreshCw,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { ShoppingItem, Category, HistoryEntry, User } from './types';
import { BASIC_BASKET_ITEMS, CATEGORIES } from './constants';

export default function App() {
  // --- State ---
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    try {
      const saved = localStorage.getItem('shopping-items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse shopping-items', e);
      return [];
    }
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      return saved === 'dark';
    } catch (e) {
      return false;
    }
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse user', e);
      return null;
    }
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [casalId, setCasalId] = useState(() => localStorage.getItem("casalId") || "");
  
  // Modals
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Auth Form
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const generateCasalId = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCasalId(code);
    localStorage.setItem("casalId", code);
  };

  const copyCasalId = () => {
    if (!casalId) return;
    navigator.clipboard.writeText(casalId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const disconnectCasal = () => {
    if (window.confirm("Deseja interromper a sincronização de casal?")) {
      setCasalId("");
      localStorage.removeItem("casalId");
    }
  };
  const [authError, setAuthError] = useState('');

  // Add Item Form
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState<number | ''>('');
  const [newItemUnit, setNewItemUnit] = useState('unidade');
  const [newItemCategory, setNewItemCategory] = useState<Category>('Mercearia');
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);

  // Expanded Categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CATEGORIES.forEach(cat => initial[cat.name] = true);
    return initial;
  });

  const totalPrice = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
  }, [items]);

  const boughtPrice = useMemo(() => {
    return items.filter(i => i.bought).reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
  }, [items]);

  const chartData = useMemo(() => {
    const gastosPorMes: Record<string, number> = {};
    
    // Sort history by date ascending for the chart
    const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedHistory.forEach(h => {
      const data = new Date(h.date);
      if (isNaN(data.getTime())) return;
      
      const mes = data.toLocaleString("pt-BR", { month: "short", year: "2-digit" });
      const price = Number(h.total_price || (h as any).totalPrice || 0);
      
      if (!gastosPorMes[mes]) gastosPorMes[mes] = 0;
      gastosPorMes[mes] += price;
    });

    return Object.keys(gastosPorMes).map(mes => ({
      mes,
      total: gastosPorMes[mes]
    }));
  }, [history]);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('shopping-items', JSON.stringify(items));
    if (items.length > 0 && items.every(item => item.bought)) {
      setShowSuccessModal(true);
    }
  }, [items]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userData: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || ''
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    });
    return () => unsubscribe();
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  const syncActiveList = async (newItems: ShoppingItem[]) => {
    if (!user || !casalId) return;
    try {
      await setDoc(doc(db, "listas_ativas", casalId), {
        casalId,
        items: newItems,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Erro ao sincronizar lista ativa:", e);
    }
  };

  // --- API Calls ---
  // Real-time History
  useEffect(() => {
    if (!user) return;
    
    let q;
    if (casalId) {
      q = query(
        collection(db, "historico"), 
        where("casalId", "==", casalId)
      );
    } else {
      q = query(
        collection(db, "historico"), 
        where("userId", "==", user.id)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as object)
      })) as any[];
      
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(data);
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permissão negada ao ler histórico. Verifique as regras do Firestore.");
      } else {
        console.error("Erro ao carregar histórico:", error);
      }
    });

    return () => unsubscribe();
  }, [user, casalId]);

  // Real-time Active List
  useEffect(() => {
    if (!user || !casalId) return;

    const unsubscribe = onSnapshot(doc(db, "listas_ativas", casalId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const remoteItems = (data.items || []) as ShoppingItem[];
        
        setItems(prev => {
          // Check if someone else added an item
          if (prev.length > 0 && remoteItems.length > prev.length) {
            const lastItem = remoteItems[remoteItems.length - 1];
            const myName = user.email.split('@')[0];
            if (lastItem.addedBy && lastItem.addedBy !== myName) {
              // Simple alert for now as requested
              alert(`🛒 ${lastItem.addedBy} adicionou: ${lastItem.name}`);
            }
          }

          if (JSON.stringify(prev) === JSON.stringify(remoteItems)) return prev;
          return remoteItems;
        });
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permissão negada na lista ativa. Configure as regras do Firestore para 'listas_ativas'.");
      } else {
        console.error("Erro no sincronismo em tempo real:", error);
      }
    });

    return () => unsubscribe();
  }, [user, casalId]);

  // Offline Listener
  useEffect(() => {
    const handleOffline = () => alert("Sem internet. Salvando offline!");
    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, []);

  // FCM Logic
  useEffect(() => {
    if (!user) return;

    const setupMessaging = async () => {
      try {
        if (!('Notification' in window)) {
          console.warn("Este navegador não suporta notificações de desktop");
          return;
        }

        const messaging = getMessaging();
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          // Note: The user needs to provide their own VAPID key in Firebase Console
          const token = await getToken(messaging, {
            vapidKey: "BEfXE8HmRA0EmLvnWInfufBFxXsFHTSkmPgAVOd4VGnu2sWTodW2irMbC9m8V8bW1ksKocIY9USahZOgUOoMfr8" 
          });
          
          if (token) {
            await setDoc(doc(db, "fcm_tokens", user.id.toString()), {
              token,
              email: user.email,
              updatedAt: new Date().toISOString()
            });
          }
        }

        onMessage(messaging, (payload) => {
          console.log('Mensagem recebida: ', payload);
          if (payload.notification) {
            alert(`🔔 ${payload.notification.title}: ${payload.notification.body}`);
          }
        });
      } catch (error) {
        console.error("Erro ao configurar notificações:", error);
      }
    };

    setupMessaging();
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Erro na autenticação');
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao entrar com Google');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setHistory([]);
    } catch (e) {
      console.error('Erro ao sair', e);
    }
  };

  const saveToHistory = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setIsSaving(true);
    try {
      const safeTotalPrice = typeof totalPrice === 'number' && !isNaN(totalPrice) ? totalPrice : 0;
      
      const sanitizedItems = items.map(item => ({
        id: item.id || Math.random().toString(36).substring(7),
        name: item.name || 'Sem nome',
        quantity: Number(item.quantity) || 0,
        unit: item.unit || 'unidade',
        category: item.category || 'Mercearia',
        bought: Boolean(item.bought),
        price: typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0
      }));

      const payload = {
        userId: String(user.id),
        casalId: casalId || null,
        savedBy: user.email.split('@')[0],
        date: new Date().toISOString(),
        total_items: Number(items.length) || 0,
        total_price: safeTotalPrice,
        items: sanitizedItems
      };

      await addDoc(collection(db, "historico"), payload);
      
      // Also generate PDF automatically to ensure they are the same
      generatePdf(sanitizedItems, payload.date);
      
      setShowSuccessModal(false);
      handleReset();
      alert('Compra salva com sucesso!');
    } catch (e: any) {
      console.error('Failed to save history', e);
      alert('Erro ao salvar: ' + (e.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteHistoryEntry = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro do histórico?')) return;
    
    try {
      await deleteDoc(doc(db, "historico", id));
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error('Failed to delete history entry', e);
      alert('Erro ao excluir registro');
    }
  };

  // --- Actions ---
  const handleAddItem = () => {
    if (!newItemName) return;
    const newItem: ShoppingItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName,
      quantity: newItemQty,
      price: newItemPrice === '' ? undefined : newItemPrice,
      unit: newItemUnit,
      category: newItemCategory,
      bought: false,
      addedBy: user?.email.split('@')[0] || 'Anônimo'
    };
    const newList = [...items, newItem];
    setItems(newList);
    syncActiveList(newList);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice('');
    setShowAddModal(false);
  };

  const toggleItem = (id: string) => {
    const newList = items.map(item => item.id === id ? { ...item, bought: !item.bought } : item);
    setItems(newList);
    syncActiveList(newList);
  };

  const deleteItem = (id: string) => {
    const newList = items.filter(item => item.id !== id);
    setItems(newList);
    syncActiveList(newList);
  };

  const updateItem = (id: string, updates: Partial<ShoppingItem>) => {
    const newList = items.map(item => item.id === id ? { ...item, ...updates } : item);
    setItems(newList);
    syncActiveList(newList);
    setEditingItem(prev => (prev && prev.id === id) ? { ...prev, ...updates } : prev);
  };

  const handleReset = () => {
    setItems([]);
    syncActiveList([]);
    setShowResetModal(false);
    setIsMenuOpen(false);
  };

  const addBasicBasket = () => {
    const newItems = BASIC_BASKET_ITEMS.map(item => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      addedBy: user?.email.split('@')[0] || 'Anônimo'
    }));
    const newList = [...items, ...newItems];
    setItems(newList);
    syncActiveList(newList);
  };

  const generatePdf = (itemsToExport: ShoppingItem[], exportDate: string, action: 'view' | 'download' = 'download') => {
    const doc = new jsPDF();
    const formattedDate = isNaN(new Date(exportDate).getTime()) 
      ? exportDate 
      : new Date(exportDate).toLocaleDateString('pt-BR');
    
    doc.setFontSize(20);
    doc.setTextColor(168, 85, 247); // Purple
    doc.text('Smart Shopping - Comprovante', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(142, 142, 147); // iOS Gray
    doc.text(`Data da Lista: ${formattedDate}`, 14, 30);

    const total = itemsToExport.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
    doc.text(`Valor Total: R$ ${total.toFixed(2)}`, 14, 35);

    const tableData = itemsToExport.map(item => [
      item.bought ? '[X]' : '[ ]',
      item.name,
      `${item.quantity} ${item.unit}`,
      item.category,
      item.price ? `R$ ${item.price.toFixed(2)}` : '-'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Status', 'Produto', 'Qtd', 'Categoria', 'Preço']],
      body: tableData,
      headStyles: { fillColor: [168, 85, 247] },
      theme: 'grid'
    });

    if (action === 'view') {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      doc.save(`lista-compras-${formattedDate.replace(/\//g, '-')}.pdf`);
    }
  };

  const exportPdf = () => {
    generatePdf(items, new Date().toISOString());
    setShowPdfModal(false);
    setIsMenuOpen(false);
  };

  // --- Helpers ---
  const progress = items.length > 0 ? Math.round((items.filter(i => i.bought).length / items.length) * 100) : 0;

  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    items.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [items]);

  return (
    <div className="min-h-screen bg-ios-bg text-ios-text font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 ios-blur border-b border-zinc-200/50 dark:border-zinc-800/50 px-6 pt-12 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-300">
                <Sparkles size={28} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.1em] mb-0.5">Compras Inteligentes</p>
                <h1 className="text-3xl font-extrabold tracking-tight">Minha Lista</h1>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <button 
                onClick={() => user ? setShowLogoutModal(true) : setShowAuthModal(true)}
                className="flex items-center gap-2 p-1 pr-3 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
              >
                <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white">
                  <UserIcon size={14} />
                </div>
                <span className="text-[11px] font-bold tracking-tight">
                  {user ? user.email.split('@')[0] : 'Entrar'}
                </span>
              </button>

              {user && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 p-1.5 px-3 rounded-2xl border border-primary/20 shadow-sm backdrop-blur-md">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-primary/60 uppercase leading-none mb-1">Sincronização Casal</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          placeholder="CRIAR CÓDIGO..."
                          value={casalId}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setCasalId(val);
                            localStorage.setItem("casalId", val);
                          }}
                          className="bg-transparent border-none outline-none text-[12px] font-black text-primary w-28 placeholder:text-zinc-300 tracking-wider"
                        />
                        <div className="flex items-center gap-1 border-l border-primary/10 pl-2">
                          <button 
                            onClick={generateCasalId}
                            className="p-1 text-primary/40 hover:text-primary transition-colors"
                            title="Gerar novo código"
                          >
                            <RefreshCw size={12} />
                          </button>
                          {casalId && (
                            <button 
                              onClick={copyCasalId}
                              className="p-1 text-primary/40 hover:text-primary transition-colors"
                              title="Copiar código"
                            >
                              {copySuccess ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                          )}
                          {casalId && (
                            <button 
                              onClick={disconnectCasal}
                              className="p-1 text-red-400 hover:text-red-500 transition-colors"
                              title="Interromper Sincronização"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {casalId ? (
                    <span className="text-[8px] font-bold text-emerald-500 flex items-center gap-1 px-2">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                      Conectado e Sincronizando
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-amber-500 flex items-center gap-1 px-2">
                      <span className="w-1 h-1 bg-amber-500 rounded-full" />
                      Modo Local (Offline)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-end mb-2">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-primary">{progress}%</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Comprado</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total</p>
                <p className="text-base font-bold leading-none">R$ {totalPrice.toFixed(2)}</p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main List */}
      <main className="max-w-2xl mx-auto pt-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 px-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"
            >
              <ShoppingBasket size={40} />
            </motion.div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Lista Vazia</h2>
              <p className="text-zinc-500 text-sm max-w-[240px] mx-auto">Adicione itens para começar suas compras com inteligência.</p>
            </div>
            <button 
              onClick={addBasicBasket}
              className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Cesta Básica
            </button>
          </div>
        ) : (
          CATEGORIES.map(cat => {
            const catItems = groupedItems[cat.name] || [];
            if (catItems.length === 0) return null;
            const isExpanded = expandedCategories[cat.name];

            return (
              <section key={cat.name} className="mb-6">
                <div className="px-6 mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{cat.name}</h3>
                  <button 
                    onClick={() => setExpandedCategories({ ...expandedCategories, [cat.name]: !isExpanded })}
                    className="text-primary text-xs font-bold"
                  >
                    {isExpanded ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ios-list-group shadow-sm"
                    >
                      {catItems.map(item => (
                        <div 
                          key={item.id}
                          className={`ios-list-item group ${item.bought ? 'opacity-50' : ''}`}
                          onClick={() => toggleItem(item.id)}
                        >
                          <button className={`flex-shrink-0 mr-4 transition-all ${item.bought ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-700'}`}>
                            {item.bought ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                          </button>
                          
                          <div className="flex-grow min-w-0 py-1">
                            <div className="flex items-center gap-2">
                              <span className={`block font-semibold text-[15px] leading-tight ${item.bought ? 'line-through text-zinc-400' : ''}`}>
                                {item.name}
                              </span>
                              {item.addedBy && (
                                <span className="text-[9px] font-bold text-primary/40 uppercase tracking-tighter">
                                  👤 {item.addedBy}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <button 
                                className="text-[12px] font-medium text-zinc-400 hover:text-primary bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem(item);
                                }}
                              >
                                {item.quantity} {item.unit}
                              </button>
                              <button 
                                className="text-[12px] font-medium text-zinc-400 hover:text-primary bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem(item);
                                }}
                              >
                                {item.price ? `R$ ${item.price.toFixed(2)}` : 'R$ 0,00'}
                              </button>
                            </div>
                          </div>

                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                            className="p-2 text-zinc-300 hover:text-red-500 transition-all ml-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            );
          })
        )}

        {items.length > 0 && (
          <div className="px-6 pb-40">
            <div className="ios-list-group p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400 font-medium">Total da Lista</span>
                <span className="font-bold">R$ {totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400 font-medium">Já Comprado</span>
                <span className="font-bold text-emerald-500">R$ {boughtPrice.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-ios-border flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-zinc-400">Restante</span>
                <span className="text-lg font-black text-primary">R$ {(totalPrice - boughtPrice).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
        {/* History Section on Screen */}
        {user && (
          <div className="mt-12 mb-20">
            {/* Analytics Chart */}
            {chartData.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6 px-2">
                  <Sparkles size={20} className="text-primary" />
                  <h2 className="text-xl font-black tracking-tight">📊 Gastos por Mês</h2>
                </div>
                <div className="p-6 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-ios-border shadow-sm h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="mes" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                        dy={10}
                      />
                      <YAxis 
                        hide 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                        formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Total']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#a855f7" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorTotal)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-6 px-2">
              <HistoryIcon size={20} className="text-primary" />
              <h2 className="text-xl font-black tracking-tight">📜 Histórico de Compras</h2>
            </div>

            {history.length === 0 ? (
              <div className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-ios-border text-center">
                <p className="text-zinc-500 font-medium">Nenhuma lista salva ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map(h => (
                  <div key={h.id} className="p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-ios-border shadow-sm hover:shadow-md transition-all active:scale-[0.99] group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Data da Compra</p>
                        <p className="font-bold text-zinc-800 dark:text-zinc-100">
                          {isNaN(new Date(h.date).getTime()) 
                            ? h.date 
                            : new Date(h.date).toLocaleString('pt-BR')}
                        </p>
                        {h.savedBy && (
                          <p className="text-[9px] font-bold text-primary/60 mt-0.5">
                            Salvo por: {h.savedBy}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total</p>
                        <p className="font-black text-primary text-lg">
                          R$ {(h.total_price || (h as any).totalPrice || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-500 mr-1">
                          {(h.total_items || (h as any).totalItems || 0)} itens
                        </span>
                        <button 
                          onClick={() => generatePdf(h.items, h.date, 'view')}
                          className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-1 text-[10px] font-bold"
                          title="Visualizar PDF"
                        >
                          <Eye size={12} />
                          Ver
                        </button>
                        <button 
                          onClick={() => generatePdf(h.items, h.date, 'download')}
                          className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold"
                          title="Baixar PDF"
                        >
                          <Download size={12} />
                          Baixar
                        </button>
                        <button 
                          onClick={() => deleteHistoryEntry(String(h.id))}
                          className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold"
                          title="Excluir do Histórico"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="flex -space-x-2">
                        {(h.items || []).slice(0, 3).map((item, idx) => (
                          <div key={idx} className="w-6 h-6 rounded-full bg-primary/10 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[8px] font-bold text-primary">
                            {item.name.charAt(0)}
                          </div>
                        ))}
                        {(h.items || []).length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[8px] font-bold text-zinc-500">
                            +{(h.items || []).length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Buttons Group */}
      <div className="fixed bottom-8 right-6 flex flex-col items-end gap-4 z-50">
        <AnimatePresence>
          {isMenuOpen && (
            <div className="flex flex-col items-end gap-3 mb-2">
              <FloatingAction 
                icon={isDarkMode ? Sun : Moon} 
                label={isDarkMode ? "Modo Claro" : "Modo Escuro"} 
                onClick={() => setIsDarkMode(!isDarkMode)}
                delay={0.05}
              />
              <FloatingAction 
                icon={HistoryIcon} 
                label="Histórico" 
                onClick={() => { setShowHistoryModal(true); setIsMenuOpen(false); }}
                delay={0.1}
              />
              <FloatingAction 
                icon={Download} 
                label="Exportar PDF" 
                onClick={() => { setShowPdfModal(true); setIsMenuOpen(false); }}
                delay={0.15}
              />
              {user && (
                <FloatingAction 
                  icon={LogOut} 
                  label="Sair com Segurança" 
                  onClick={() => { setShowLogoutModal(true); setIsMenuOpen(false); }}
                  color="bg-zinc-100/80 dark:bg-zinc-800/80"
                  delay={0.18}
                />
              )}
              <FloatingAction 
                icon={RotateCcw} 
                label="Limpar Lista" 
                onClick={() => { setShowResetModal(true); setIsMenuOpen(false); }}
                color="bg-red-50/80 dark:bg-red-900/20"
                textColor="text-red-500"
                delay={0.2}
              />
            </div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all backdrop-blur-xl border ${isMenuOpen ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent' : 'bg-white/80 dark:bg-zinc-800/80 text-primary border-white/20 dark:border-zinc-700'}`}
          >
            {isMenuOpen ? <X size={20} /> : <ChevronUp size={20} />}
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAddModal(true)}
            className="w-14 h-14 bg-primary text-white rounded-full shadow-xl shadow-primary/30 flex items-center justify-center transition-all"
          >
            <Plus size={28} />
          </motion.button>
        </div>
      </div>

      {/* --- Modals --- */}

      {/* Add Item Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Novo Item" icon={Plus}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Produto</label>
            <div className="relative">
              <input 
                autoFocus
                type="text" 
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
                placeholder="Ex: 2 Leite 8 Reais"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Qtd</label>
              <input 
                type="number" 
                value={newItemQty}
                onChange={e => setNewItemQty(parseFloat(e.target.value))}
                className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Preço (R$)</label>
              <input 
                type="number" 
                step="0.01"
                value={newItemPrice}
                onChange={e => setNewItemPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Unidade</label>
            <select 
              value={newItemUnit}
              onChange={e => setNewItemUnit(e.target.value)}
              className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
            >
                <option value="unidade">unidade</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="litros">litros</option>
                <option value="ml">ml</option>
                <option value="pacote">pacote</option>
                <option value="caixa">caixa</option>
              </select>
            </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Categoria</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat.name}
                  onClick={() => setNewItemCategory(cat.name as Category)}
                  className={`p-2 text-sm rounded-xl border transition-all ${newItemCategory === cat.name ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={handleAddItem}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
          >
            Adicionar à Lista
          </button>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal 
        isOpen={!!editingItem} 
        onClose={() => setEditingItem(null)} 
        title={`Editar Item`} 
        icon={Edit3}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome do Produto</label>
            <input 
              type="text" 
              value={editingItem?.name || ''}
              onChange={e => editingItem && updateItem(editingItem.id, { name: e.target.value })}
              className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Quantidade</label>
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden">
                <button 
                  onClick={() => editingItem && updateItem(editingItem.id, { quantity: Math.max(0, editingItem.quantity - 1) })}
                  className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-primary"
                >
                  <Minus size={18} />
                </button>
                <input 
                  type="number" 
                  value={editingItem?.quantity || 0}
                  onChange={e => editingItem && updateItem(editingItem.id, { quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-transparent text-center font-bold outline-none py-3"
                />
                <button 
                  onClick={() => editingItem && updateItem(editingItem.id, { quantity: editingItem.quantity + 1 })}
                  className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-primary"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Preço Unit. (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={editingItem?.price || ''}
                  onChange={e => editingItem && updateItem(editingItem.id, { price: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 pl-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Categoria</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button 
                  key={cat.name}
                  onClick={() => editingItem && updateItem(editingItem.id, { category: cat.name as Category })}
                  className={`p-2 text-[10px] rounded-lg border transition-all ${editingItem?.category === cat.name ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-2">
            <button 
              onClick={() => setEditingItem(null)}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={20} />
              Salvar Alterações
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Modal */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Limpar Lista" icon={RotateCcw} color="red-500">
        <div className="text-center space-y-6">
          <p className="text-zinc-500">Tem certeza que deseja remover todos os itens da sua lista? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowResetModal(false)} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold">Cancelar</button>
            <button onClick={handleReset} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">Sim, Limpar</button>
          </div>
        </div>
      </Modal>

      {/* PDF Modal */}
      <Modal isOpen={showPdfModal} onClose={() => setShowPdfModal(false)} title="Exportar PDF" icon={FileText}>
        <div className="text-center space-y-6">
          <p className="text-zinc-500">Deseja gerar um arquivo PDF organizado com todos os itens da sua lista atual?</p>
          <div className="flex gap-3">
            <button onClick={() => setShowPdfModal(false)} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold">Cancelar</button>
            <button onClick={exportPdf} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold">Gerar PDF</button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Compras Concluídas!" icon={Trophy}>
        <div className="text-center space-y-6">
          <div className="py-4 flex justify-center">
            <motion.div 
              animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="text-6xl"
            >
              🏆
            </motion.div>
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-bold">Excelente trabalho!</h4>
            <p className="text-zinc-500 text-sm">Você completou todos os itens da sua lista. Deseja salvar esta compra no seu histórico?</p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={saveToHistory}
              disabled={isSaving}
              className={`w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] active:shadow-inner transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={20} className={isSaving ? 'animate-spin' : ''} />
              {isSaving ? 'Salvando...' : 'Salvar no Histórico'}
            </button>
            <button 
              onClick={() => { setShowSuccessModal(false); handleReset(); }}
              className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-bold text-zinc-500"
            >
              Apenas Limpar Lista
            </button>
          </div>
        </div>
      </Modal>

      {/* Auth Modal */}
      <Modal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} title={authMode === 'login' ? 'Entrar' : 'Criar Conta'} icon={UserIcon}>
        <form onSubmit={handleAuth} className="space-y-4">
          {authError && <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-xl text-center font-medium">{authError}</div>}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">E-mail</label>
            <input 
              type="email" 
              required
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Senha</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none pr-12"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-[0.98] active:shadow-inner"
          >
            {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">Ou continue com</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-4 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-2xl font-bold border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <p className="text-center text-sm text-zinc-500">
            {authMode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            <button 
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="ml-1 text-primary font-bold hover:underline"
            >
              {authMode === 'login' ? 'Cadastre-se' : 'Faça Login'}
            </button>
          </p>
        </form>
      </Modal>

      {/* Logout Modal */}
      <Modal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        title="Sair com Segurança" 
        icon={ShieldCheck}
      >
        <div className="text-center space-y-6">
          <p className="text-zinc-500">Deseja encerrar sua sessão com segurança? Seus dados locais serão preservados, mas você precisará entrar novamente para acessar o histórico em nuvem.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold">Cancelar</button>
            <button 
              onClick={() => { handleLogout(); setShowLogoutModal(false); }} 
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <LogOut size={18} />
              Sair Agora
            </button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Histórico de Compras" icon={HistoryIcon}>
        {!user ? (
          <div className="text-center py-10 space-y-4">
            <p className="text-zinc-500">Faça login para ver seu histórico de compras.</p>
            <button 
              onClick={() => { setShowHistoryModal(false); setShowAuthModal(true); }}
              className="px-6 py-2 bg-primary text-white rounded-xl font-bold active:scale-95 transition-all"
            >
              Fazer Login
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-zinc-500">Nenhuma compra finalizada ainda.</div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {history.map(entry => (
              <div key={entry.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase">
                      {isNaN(new Date(entry.date).getTime()) 
                        ? entry.date 
                        : new Date(entry.date).toLocaleString('pt-BR')}
                    </p>
                    {entry.savedBy && (
                      <p className="text-[9px] font-bold text-primary/60">
                        Por: {entry.savedBy}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-bold text-primary">
                        R$ {(entry.total_price || (entry as any).totalPrice || 0).toFixed(2)}
                      </p>
                      <button 
                        onClick={() => generatePdf(entry.items, entry.date, 'view')}
                        className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-90 transition-all"
                      >
                        <Eye size={10} />
                        Ver
                      </button>
                      <button 
                        onClick={() => generatePdf(entry.items, entry.date, 'download')}
                        className="px-2 py-1 bg-primary text-white rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-90 transition-all"
                      >
                        <Download size={10} />
                        Baixar
                      </button>
                      <button 
                        onClick={() => deleteHistoryEntry(String(entry.id))}
                        className="px-2 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-90 transition-all"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-bold">
                    {(entry.total_items || (entry as any).totalItems || 0)} itens
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(entry.items || []).slice(0, 5).map((item: any) => (
                    <span key={item.id} className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500">
                      {item.name}
                    </span>
                  ))}
                  {(entry.items || []).length > 5 && <span className="text-[10px] text-zinc-400">+{(entry.items || []).length - 5} mais</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// --- Sub-components (Defined outside to prevent re-renders on every keystroke) ---

const Modal = ({ isOpen, onClose, title, children, icon: Icon }: any) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden border-t border-white/20 dark:border-zinc-800"
        >
          <div className="p-6 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {Icon && <Icon size={20} className="text-primary" />}
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            </div>
            <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors active:scale-90">
              <X size={16} className="text-zinc-500" />
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const FloatingAction = ({ icon: Icon, onClick, label, color = 'bg-white/80 dark:bg-zinc-800/80', textColor = 'text-primary', delay = 0 }: any) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.8, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.8, y: 10 }}
    transition={{ delay }}
    onClick={onClick}
    className={`flex items-center gap-3 p-3 pr-5 rounded-2xl shadow-lg backdrop-blur-xl border border-white/20 dark:border-zinc-700 ${color} ${textColor} active:scale-95 transition-all`}
  >
    <div className="w-8 h-8 flex items-center justify-center">
      <Icon size={20} />
    </div>
    <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
  </motion.button>
);
