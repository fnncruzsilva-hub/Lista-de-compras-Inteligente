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
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ShoppingItem, Category, HistoryEntry, User } from './types';
import { BASIC_BASKET_ITEMS, CATEGORIES } from './constants';

export default function App() {
  // --- State ---
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem('shopping-items');
    return saved ? JSON.parse(saved) : [];
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // Modals
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Auth Form
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
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
    if (user) {
      fetchHistory();
    }
  }, [user]);

  // --- API Calls ---
  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/history/${user.id}`);
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
        setShowAuthModal(false);
        setAuthEmail('');
        setAuthPassword('');
      } else {
        setAuthError(data.error || 'Erro na autenticação');
      }
    } catch (e) {
      setAuthError('Erro ao conectar ao servidor');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setHistory([]);
  };

  const saveToHistory = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date: new Date().toLocaleString('pt-BR'),
          totalItems: items.length,
          totalPrice,
          items
        })
      });
      fetchHistory();
      setShowSuccessModal(false);
      handleReset();
    } catch (e) {
      console.error('Failed to save history', e);
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
      bought: false
    };
    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice('');
    setShowAddModal(false);
  };

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, bought: !item.bought } : item));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ShoppingItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    setEditingItem(prev => (prev && prev.id === id) ? { ...prev, ...updates } : prev);
  };

  const handleReset = () => {
    setItems([]);
    setShowResetModal(false);
    setIsMenuOpen(false);
  };

  const addBasicBasket = () => {
    const newItems = BASIC_BASKET_ITEMS.map(item => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9)
    }));
    setItems([...items, ...newItems]);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('pt-BR');
    
    doc.setFontSize(20);
    doc.setTextColor(168, 85, 247); // Purple
    doc.text('Smart Shopping - Minha Lista', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(142, 142, 147); // iOS Gray
    doc.text(`Data: ${date}`, 14, 30);

    const tableData = items.map(item => [
      item.bought ? '[X]' : '[ ]',
      item.name,
      `${item.quantity} ${item.unit}`,
      item.category,
      item.price ? `R$ ${item.price.toFixed(2)}` : '-'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Status', 'Produto', 'Qtd', 'Categoria', 'Preço']],
      body: tableData,
      headStyles: { fillColor: [168, 85, 247] },
      theme: 'grid'
    });

    doc.save(`lista-compras-${date}.pdf`);
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
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.1em] mb-0.5">Smart Shopping</p>
              <h1 className="text-3xl font-extrabold tracking-tight">Minha Lista</h1>
            </div>
            
            <button 
              onClick={() => user ? handleLogout() : setShowAuthModal(true)}
              className="flex items-center gap-2 p-1 pr-3 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
            >
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white">
                <UserIcon size={14} />
              </div>
              <span className="text-[11px] font-bold tracking-tight">
                {user ? user.email.split('@')[0] : 'Entrar'}
              </span>
            </button>
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
                          <button className={`flex-shrink-0 mr-4 transition-all ${item.bought ? 'text-primary' : 'text-zinc-300 dark:text-zinc-700'}`}>
                            {item.bought ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                          </button>
                          
                          <div className="flex-grow min-w-0 py-1">
                            <span className={`block font-semibold text-[15px] leading-tight ${item.bought ? 'line-through text-zinc-400' : ''}`}>
                              {item.name}
                            </span>
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
            <input 
              autoFocus
              type="text" 
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
              placeholder="Ex: Arroz, Leite..."
            />
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
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Save size={20} />
              Salvar no Histórico
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
            <input 
              type="password" 
              required
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
          >
            {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
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

      {/* History Modal */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Histórico de Compras" icon={HistoryIcon}>
        {!user ? (
          <div className="text-center py-10 space-y-4">
            <p className="text-zinc-500">Faça login para ver seu histórico de compras.</p>
            <button 
              onClick={() => { setShowHistoryModal(false); setShowAuthModal(true); }}
              className="px-6 py-2 bg-primary text-white rounded-xl font-bold"
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
                    <p className="text-xs font-bold text-zinc-400 uppercase">{entry.date}</p>
                    <p className="font-bold text-primary">R$ {entry.total_price.toFixed(2)}</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-bold">
                    {entry.total_items} itens
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {entry.items.slice(0, 5).map(item => (
                    <span key={item.id} className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500">
                      {item.name}
                    </span>
                  ))}
                  {entry.items.length > 5 && <span className="text-[10px] text-zinc-400">+{entry.items.length - 5} mais</span>}
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
            <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors">
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
