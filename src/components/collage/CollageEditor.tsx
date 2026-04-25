import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  RotateCcw, 
  Download, 
  Save, 
  RefreshCw,
  ImageIcon,
  Type as TextIcon,
  Layers as LayersIcon,
  Maximize,
  Undo2,
  Redo2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
  Link,
  MousePointer2,
  Grid2X2,
  LayoutGrid as LayoutsIcon,
  Palette,
  Shapes,
  Square,
  Circle as CircleIcon,
  Triangle,
  Minus,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  LayoutTemplate
} from 'lucide-react';
import { auth, db, uploadImageToStorage, collection, addDoc, serverTimestamp } from '../../firebase';
import { CanvasArea } from './CanvasArea';
import { PropertyPanel } from './PropertyPanel';
import { CanvasElement, CollageEditorProps } from './types';
import { useHistory } from './useHistory';

export function CollageEditor({ onNavigate, notify }: CollageEditorProps) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [canvasConfig, setCanvasConfig] = useState<any>({ backgroundColor: '#ffffff', width: 1080, height: 1080 });
  const { state: historyState, push, undo, redo, canUndo, canRedo } = useHistory({ elements: [], canvasConfig: { backgroundColor: '#ffffff', width: 1080, height: 1080 } });
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'resize' | 'images' | 'text' | 'layers' | 'layouts' | 'elements' | 'background'>('templates');
  const [isSaving, setIsSaving] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [targetFrameId, setTargetFrameId] = useState<string | null>(null);
  const [layoutGap, setLayoutGap] = useState(10);
  const [frameRadius, setFrameRadius] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean } | null>(null);
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
  const [zoom, setZoom] = useState(1);

  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const firstSelected = elements.find(el => el.id === selectedIds[0]);

  // Unified update helper to prevent stale closures and history sync issues
  const updateElements = useCallback((next: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[]), saveToHistory = true) => {
    setElements(prev => {
      const resolvedNext = typeof next === 'function' ? next(prev) : next;
      if (saveToHistory) {
        push({ elements: resolvedNext, canvasConfig });
      }
      return resolvedNext;
    });
  }, [push, canvasConfig]);

  const updateCanvasConfig = useCallback((next: any, saveToHistory = true) => {
    setCanvasConfig((prev: any) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      if (saveToHistory) {
        push({ elements, canvasConfig: resolved });
      }
      return resolved;
    });
  }, [push, elements]);

  // Sync state with history
  useEffect(() => {
    if (historyState) {
      setElements(historyState.elements);
      if (historyState.canvasConfig) setCanvasConfig(historyState.canvasConfig);
    }
  }, [historyState]);

  // Group Selection Sync
  useEffect(() => {
    if (selectedIds.length === 0) return;
    
    const newSelected = new Set(selectedIds);
    selectedIds.forEach(id => {
      const el = elements.find(e => e.id === id);
      if (el?.groupId) {
        elements.filter(e => e.groupId === el.groupId).forEach(e => newSelected.add(e.id));
      }
    });

    if (newSelected.size !== selectedIds.length) {
      setSelectedIds(Array.from(newSelected));
    }
  }, [selectedIds, elements]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const isMobile = window.innerWidth < 1024;
        const padding = isMobile ? 12 : 40; // Reduced padding
        setDimensions({ width: Math.max(200, clientWidth - padding), height: Math.max(200, clientHeight - padding) });
      }
    };
    updateSize();
    // Use a small delay to ensure container has settled
    const timer = setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timer);
    };
  }, []);

  const handleUpdate = useCallback((id: string, attrs: Partial<CanvasElement>, saveToHistory = false) => {
    updateElements(prev => prev.map(el => el.id === id ? { ...el, ...attrs } : el), saveToHistory);
  }, [updateElements]);

  const removeElements = useCallback((ids: string[]) => {
    updateElements(prev => prev.filter(el => !ids.includes(el.id)));
    setSelectedIds([]);
  }, [updateElements]);

  const copyElements = useCallback((ids: string[]) => {
    const toCopy = elements.filter(el => ids.includes(el.id));
    setClipboard(toCopy);
    if (notify) notify('Copiado', `${toCopy.length} elemento(s) copiado(s)`, 'info');
  }, [elements, notify]);

  const cutElements = useCallback((ids: string[]) => {
    const toCopy = elements.filter(el => ids.includes(el.id));
    setClipboard(toCopy);
    removeElements(ids);
    if (notify) notify('Cortado', `${toCopy.length} elemento(s) removido(s) e copiado(s)`, 'info');
  }, [elements, removeElements, notify]);

  const pasteElements = useCallback((x?: number, y?: number) => {
    if (clipboard.length === 0) return;
    
    // Calculate offset if x/y provided (from context menu)
    const baseNewOnes = clipboard.map(el => ({
      ...el,
      id: `${el.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    }));

    let finalNewOnes = baseNewOnes;
    if (x !== undefined && y !== undefined) {
      const minX = Math.min(...clipboard.map(el => el.x));
      const minY = Math.min(...clipboard.map(el => el.y));
      finalNewOnes = baseNewOnes.map(el => ({
        ...el,
        x: x + (el.x - minX),
        y: y + (el.y - minY)
      }));
    } else {
      finalNewOnes = baseNewOnes.map(el => ({
        ...el,
        x: el.x + 20,
        y: el.y + 20
      }));
    }

    updateElements(prev => [...prev, ...finalNewOnes]);
    setSelectedIds(finalNewOnes.map(o => o.id));
    if (notify) notify('Colado', `${finalNewOnes.length} elemento(s) adicionado(s)`, 'success');
  }, [clipboard, updateElements, notify]);

  const handleContextMenu = (e: any) => {
    e.evt.preventDefault();
    
    // Get pointer position relative to the stage
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    // Select element if clicked on one
    const target = e.target;
    const isStage = target === stage;
    const id = !isStage ? (target.id() || target.getParent?.()?.id?.()) : null;
    const clickedOnEmpty = !id || isStage || id === 'canvas-background';
    
    if (!clickedOnEmpty) {
      // Correct selection on right-click as requested
      if (!selectedIds.includes(id)) {
        setSelectedIds([id]);
      }
    } else {
      // If clicked on empty area, we might want to clear selection or keep it for pasting
      // user said "first we select the object with the right button of the mouse", so we keep that
    }

    setContextMenu({
      x: pointerPos.x,
      y: pointerPos.y,
      visible: true
    });
  };

  const handleMenuAction = (action: string) => {
    setContextMenu(null);
    switch (action) {
      case 'copy':
        if (selectedIds.length > 0) copyElements(selectedIds);
        break;
      case 'cut':
        if (selectedIds.length > 0) cutElements(selectedIds);
        break;
      case 'paste':
        pasteElements(contextMenu?.x, contextMenu?.y);
        break;
      case 'delete':
        if (selectedIds.length > 0) removeElements(selectedIds);
        break;
      case 'duplicate':
        if (selectedIds.length > 0) duplicateElements(selectedIds);
        break;
      case 'group':
        groupElements();
        break;
      case 'ungroup':
        ungroupElements();
        break;
      case 'link':
        if (selectedIds.length === 1) {
          const url = window.prompt('Digite a URL do link:', elements.find(el => el.id === selectedIds[0])?.url || '');
          if (url !== null) {
            handleUpdate(selectedIds[0], { url }, true);
          }
        }
        break;
    }
  };

  const duplicateElements = useCallback((ids: string[]) => {
    const newOnes = elements
      .filter(el => ids.includes(el.id))
      .map(el => ({
        ...el,
        id: `${el.id.split('-copy')[0]}-copy-${Date.now()}`,
        x: el.x + 20,
        y: el.y + 20
      }));
    updateElements(prev => [...prev, ...newOnes]);
    setSelectedIds(newOnes.map(o => o.id));
  }, [elements, updateElements]);

  const groupElements = useCallback(() => {
    if (selectedIds.length < 2) return;
    const groupId = crypto.randomUUID();
    updateElements(elements.map(el => 
      selectedIds.includes(el.id) ? { ...el, groupId } : el
    ));
    if (notify) notify('Agrupado', `${selectedIds.length} elementos vinculados`, 'success');
  }, [selectedIds, elements, updateElements, notify]);

  const ungroupElements = useCallback(() => {
    const groupIdsToClear = new Set<string>();
    selectedIds.forEach(id => {
      const el = elements.find(e => e.id === id);
      if (el?.groupId) groupIdsToClear.add(el.groupId);
    });

    if (groupIdsToClear.size === 0) return;

    updateElements(elements.map(el => 
      (el.groupId && groupIdsToClear.has(el.groupId)) ? { ...el, groupId: undefined } : el
    ));
    if (notify) notify('Desagrupado', 'Elementos desconectados', 'info');
  }, [selectedIds, elements, updateElements, notify]);

  // Global triggers
  useEffect(() => {
    (window as any).__triggerTextEdit = (id: string) => {
      setEditingTextId(id);
    };
    (window as any).__triggerFrameUpload = (id: string) => {
      setTargetFrameId(id);
      fileInputRef.current?.click();
    };
    return () => { 
      delete (window as any).__triggerTextEdit; 
      delete (window as any).__triggerFrameUpload; 
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    const handleKeydown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input, textarea or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        editingTextId // Extra safety: if we are in editing mode, don't delete elements
      ) {
        return;
      }

      // Delete elements with Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        removeElements(selectedIds);
      } else if (e.key.toLowerCase() === 't') {
        // Add text when pressing 'T'
        addText();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'r') {
        // Remove selection with Ctrl+R
        e.preventDefault();
        if (selectedIds.length > 0) removeElements(selectedIds);
      } else if (e.ctrlKey && e.key === 'z') {
        const prev = undo();
        if (prev) setElements(prev.elements);
      } else if (e.ctrlKey && e.key === 'y') {
        const next = redo();
        if (next) setElements(next.elements);
      } else if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0) duplicateElements(selectedIds);
      } else if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          ungroupElements();
        } else {
          groupElements();
        }
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [selectedIds, removeElements, undo, redo, duplicateElements, editingTextId]);

  const applyLayout = (type: '2x1' | '1x2' | '2x2' | '3x1') => {
    const margin = 20;
    const canvasW = dimensions.width - margin * 2;
    const canvasH = dimensions.height - margin * 2;
    const gap = layoutGap;
    let newFrames: CanvasElement[] = [];

    if (type === '2x1') {
      const w = (canvasW - gap) / 2;
      newFrames = [
        { id: 'f1', type: 'frame', x: margin, y: margin, width: w, height: canvasH, rotation: 0, opacity: 1, cornerRadius: frameRadius },
        { id: 'f2', type: 'frame', x: margin + w + gap, y: margin, width: w, height: canvasH, rotation: 0, opacity: 1, cornerRadius: frameRadius },
      ];
    } else if (type === '1x2') {
      const h = (canvasH - gap) / 2;
      newFrames = [
        { id: 'f1', type: 'frame', x: margin, y: margin, width: canvasW, height: h, rotation: 0, opacity: 1, cornerRadius: frameRadius },
        { id: 'f2', type: 'frame', x: margin, y: margin + h + gap, width: canvasW, height: h, rotation: 0, opacity: 1, cornerRadius: frameRadius },
      ];
    } else if (type === '2x2') {
      const w = (canvasW - gap) / 2;
      const h = (canvasH - gap) / 2;
      newFrames = [
        { id: 'f1', type: 'frame', x: margin, y: margin, width: w, height: h, rotation: 0, opacity: 1, cornerRadius: frameRadius },
        { id: 'f2', type: 'frame', x: margin + w + gap, y: margin, width: w, height: h, rotation: 0, opacity: 1, cornerRadius: frameRadius },
        { id: 'f3', type: 'frame', x: margin, y: margin + h + gap, width: w, height: h, rotation: 0, opacity: 1, cornerRadius: frameRadius },
        { id: 'f4', type: 'frame', x: margin + w + gap, y: margin + h + gap, width: w, height: h, rotation: 0, opacity: 1, cornerRadius: frameRadius },
      ];
    } else if (type === '3x1') {
      const w = (canvasW - gap * 2) / 3;
      newFrames = [
        { id: 'f1', type: 'frame', x: margin, y: margin, width: w, height: canvasH, rotation: 0, opacity: 1, cornerRadius: frameRadius },
        { id: 'f2', type: 'frame', x: margin + w + gap, y: margin, width: w, height: canvasH, rotation: 0, opacity: 1, cornerRadius: frameRadius },
        { id: 'f3', type: 'frame', x: margin + (w + gap) * 2, y: margin, width: w, height: canvasH, rotation: 0, opacity: 1, cornerRadius: frameRadius },
      ];
    }
    updateElements(newFrames);
    setSelectedIds([]);
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
             const dataUrl = event.target?.result as string;
             
             // If we have a target frame from dblclick
             if (targetFrameId) {
                handleUpdate(targetFrameId, { src: dataUrl }, true);
                setTargetFrameId(null);
                return;
             }

             // If a frame is selected, fill it
             if (selectedIds.length === 1) {
                const el = elements.find(v => v.id === selectedIds[0]);
                if (el?.type === 'frame') {
                   handleUpdate(el.id, { src: dataUrl }, true);
                   return;
                }
             }

             // Otherwise add as free image
             const aspect = img.width / img.height;
             const width = 200;
             const height = width / aspect;
             const newElement: CanvasElement = {
               id: 'img-' + Date.now() + Math.random(),
               type: 'image',
               src: dataUrl,
               x: 100, y: 100, width, height, rotation: 0, opacity: 1
             };
             updateElements(prev => [...prev, newElement]);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const addText = () => {
    const m = 20;
    const newElement: CanvasElement = {
      id: 'text-' + Date.now(),
      type: 'text',
      text: 'Novo Texto',
      fontSize: 40,
      fontFamily: 'Inter',
      align: 'center',
      fill: '#000000',
      x: Math.max(m, dimensions.width / 2 - 100),
      y: Math.max(m, dimensions.height / 2 - 25),
      width: 200, height: 50, rotation: 0, opacity: 1
    };
    updateElements(prev => [...prev, newElement]);
    setSelectedIds([newElement.id]);
  };

  const addShape = (shapeType: 'rect' | 'circle' | 'triangle' | 'line') => {
    const id = `${shapeType}-${Date.now()}`;
    let newEl: CanvasElement;
    
    const baseProps = {
      id,
      x: dimensions.width / 2 - 50,
      y: dimensions.height / 2 - 50,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      fill: '#6366f1' // Default indigo color
    };

    if (shapeType === 'line') {
      newEl = {
        ...baseProps,
        type: 'line',
        height: 5,
        width: 150,
        points: [0, 0, 150, 0],
        strokeWidth: 5
      };
    } else {
      newEl = {
        ...baseProps,
        type: shapeType,
      };
    }

    updateElements(prev => [...prev, newEl]);
    setSelectedIds([id]);
  };

  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    updateElements(prev => {
      const index = prev.findIndex(el => el.id === id);
      if (index === -1) return prev;
      const next = [...prev];
      if (direction === 'up' && index < prev.length - 1) {
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
      } else if (direction === 'down' && index > 0) {
        [next[index], next[index - 1]] = [next[index - 1], next[index]];
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      if (notify) notify('Aviso', 'Faça login para salvar suas artes.', 'info');
      onNavigate('signup');
      return;
    }
    setIsSaving(true);
    setSelectedIds([]);
    try {
      await new Promise(r => setTimeout(r, 200));
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
      const fileName = `DesignaCanvas_${Date.now()}.png`;
      const storageUrl = await uploadImageToStorage(dataURL, fileName, `users/${auth.currentUser.uid}/collages`);
      await addDoc(collection(db, 'projects'), {
        uid: auth.currentUser.uid,
        name: `Design Canvas - ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        status: 'Finalizado',
        type: 'Colagem de Fotos',
        imageUrl: storageUrl
      });
      if (notify) notify('Sucesso', 'Arte salva com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      if (notify) notify('Erro', 'Falha ao salvar.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
      {/* Sidebar - Functional Rail - Hide on mobile, show as overlay or drawer if needed */}
      <div className={`w-[72px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-8 gap-6 z-30 transition-transform lg:translate-x-0 ${sidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'} fixed lg:relative h-full`}>
        {[
          { id: 'templates', icon: LayoutTemplate, label: 'Modelos' },
          { id: 'resize', icon: Maximize, label: 'Tamanho' },
          { id: 'background', icon: Palette, label: 'Fundo' },
          { id: 'layouts', icon: LayoutsIcon, label: 'Grades' },
          { id: 'elements', icon: Shapes, label: 'Elementos' },
          { id: 'images', icon: ImageIcon, label: 'Imagens' },
          { id: 'text', icon: TextIcon, label: 'Texto' },
          { id: 'layers', icon: LayersIcon, label: 'Camadas' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`group relative p-3.5 rounded-2xl transition-all ${
              activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 active-tab' 
                : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon size={22} strokeWidth={2.5} />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 capitalize">
              {tab.label}
            </span>
          </button>
        ))}
        
        <div className="mt-auto flex flex-col gap-4">
          <button onClick={() => onNavigate('home')} className="p-3 text-slate-300 hover:text-red-500 transition-colors" title="Sair">
             <X size={26} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
        {/* Top Header Rail */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                   <Grid2X2 size={18} strokeWidth={3} />
                </div>
                <h1 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Design Studio</h1>
             </div>
             
             <div className="h-6 w-px bg-slate-100 dark:bg-slate-800" />
             
             <div className="flex items-center gap-1">
                <button 
                  onClick={() => { const p = undo(); if (p) setElements(p.elements); }} 
                  disabled={!canUndo}
                  className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo2 size={18} />
                </button>
                <button 
                  onClick={() => { const n = redo(); if (n) setElements(n.elements); }} 
                  disabled={!canRedo}
                  className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                  title="Refazer (Ctrl+Y)"
                >
                  <Redo2 size={18} />
                </button>
             </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Canvas Zoom Controls (Magnifying Glass) */}
             <div className="hidden sm:flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-2 h-10 border border-slate-100 dark:border-slate-700">
                <button 
                  onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Diminuir Zoom"
                >
                  <Minus size={14} />
                </button>
                <div className="flex items-center gap-1.5 px-2">
                   <Maximize size={12} className="text-slate-400" />
                   <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 min-w-[35px] text-center">
                     {Math.round(zoom * 100)}%
                   </span>
                </div>
                <button 
                  onClick={() => setZoom(prev => Math.min(5, prev + 0.1))}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Aumentar Zoom"
                >
                  <Plus size={14} />
                </button>
             </div>

             <button 
               onClick={handleSave}
               disabled={isSaving || elements.length === 0}
               className="h-10 px-6 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
             >
               {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
               {isSaving ? 'Gravando' : 'Guardar'}
             </button>

             <button 
               onClick={() => {
                  stageRef.current.toDataURL({ pixelRatio: 2 });
                  const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
                  const link = document.createElement('a');
                  link.href = dataURL;
                  link.download = `Designa_Export_${Date.now()}.png`;
                  link.click();
                  if (notify) notify('Sucesso', 'Arte exportada!', 'success');
               }}
               className="h-10 px-8 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-indigo-500/30 transition-all border-none flex items-center gap-2"
             >
               <Download size={14} strokeWidth={3} />
               Exportar Final
             </button>
          </div>
        </header>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Sidebar Toggle Button (Floating) */}
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute top-4 left-4 z-40 p-3 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl text-indigo-600 hover:scale-110 transition-all border border-slate-100 dark:border-slate-700 lg:hidden"
              title={sidebarCollapsed ? "Mostrar Ferramentas" : "Ocultar Ferramentas"}
            >
               {sidebarCollapsed ? <LayoutsIcon size={20} /> : <X size={20} />}
            </button>

            {/* Tools Expanded View */}
            <aside 
              className={`fixed lg:relative inset-y-0 left-0 w-80 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col z-40 transition-transform duration-300 transform ${sidebarCollapsed ? '-translate-x-full' : 'translate-x-[72px] lg:translate-x-0'}`}
            >
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              
              {activeTab === 'templates' && (
                <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelos Prontos</h3>
                    <p className="text-[10px] text-slate-400">Layouts base para começar rápido</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { 
                        id: 'social-post', 
                        label: 'Post Social', 
                        preview: 'linear-gradient(135deg, #FF9A9E 0%, #FAD0C4 100%)',
                        elements: [
                           { id: 'f1', type: 'frame', x: 50, y: 50, width: 700, height: 400, rotation: 0, opacity: 1, cornerRadius: 20 },
                           { id: 't1', type: 'text', x: 50, y: 470, text: 'MINHA VIAGEM INESQUECÍVEL', fontSize: 32, fontWeight: 'bold', fontFamily: 'Poppins', fill: '#000000', width: 700, rotation: 0, opacity: 1 },
                           { id: 't2', type: 'text', x: 50, y: 510, text: 'Um resumo dos melhores momentos deste verão incrível que passei explorando o mundo.', fontSize: 16, fontFamily: 'Inter', fill: '#64748b', width: 600, rotation: 0, opacity: 1 }
                        ]
                      },
                      { 
                        id: 'minimal-expo', 
                        label: 'Expo Minimalista', 
                        preview: '#000000',
                        config: { backgroundColor: '#000000' },
                        elements: [
                           { id: 'f1', type: 'frame', x: 200, y: 100, width: 400, height: 400, rotation: 0, opacity: 1, cornerRadius: 0 },
                           { id: 't1', type: 'text', x: 0, y: 520, text: 'ART GALLERY 2024', fontSize: 24, fontWeight: 'normal', fontFamily: 'Montserrat', fill: '#FFFFFF', width: 800, align: 'center', rotation: 0, opacity: 1 }
                        ]
                      },
                      {
                        id: 'vibrant-grid',
                        label: 'Grade Vibrante',
                        preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        config: { backgroundGradient: { start: '#667eea', end: '#764ba2', type: 'linear' } },
                        elements: [
                           { id: 'f1', type: 'frame', x: 50, y: 50, width: 340, height: 240, rotation: -2, opacity: 1, cornerRadius: 10 },
                           { id: 'f2', type: 'frame', x: 410, y: 70, width: 340, height: 240, rotation: 3, opacity: 1, cornerRadius: 10 },
                           { id: 't1', type: 'text', x: 50, y: 350, text: 'STORYBOARD', fontSize: 48, fontWeight: 'black', fontFamily: 'Poppins', fill: '#FFFFFF', width: 700, rotation: 0, opacity: 1 }
                        ]
                      }
                    ].map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          if (elements.length > 0 && !window.confirm('Substituir o design atual por este modelo?')) return;
                          updateElements(tpl.elements as any);
                          if (tpl.config) updateCanvasConfig(tpl.config);
                          setSelectedIds([]);
                        }}
                        className="group w-full aspect-[4/3] rounded-3xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden relative transition-all hover:border-indigo-600 hover:shadow-2xl active:scale-95"
                      >
                        <div className="absolute inset-0" style={{ background: tpl.preview }} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <span className="px-4 py-2 bg-white rounded-full text-[10px] font-black uppercase text-slate-900 shadow-xl">Aplicar Modelo</span>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                           <p className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md">{tpl.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'resize' && (
                <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamanho do Design</h3>
                    <p className="text-[10px] text-slate-400">Escolha um formato ou defina um tamanho personalizado</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'insta-post', label: 'Instagram Post', w: 1080, h: 1080 },
                      { id: 'insta-story', label: 'Instagram Story', w: 1080, h: 1920 },
                      { id: 'yt-thumb', label: 'YouTube Thumbnail', w: 1280, h: 720 },
                      { id: 'tiktok', label: 'TikTok Video', w: 1080, h: 1920 },
                      { id: 'fb-post', label: 'Facebook Post', w: 1200, h: 630 },
                      { id: 'pin', label: 'Pinterest Pin', w: 1000, h: 1500 }
                    ].map(format => (
                      <button
                        key={format.id}
                        onClick={() => updateCanvasConfig({ ...canvasConfig, width: format.w, height: format.h })}
                        className={`w-full p-4 rounded-2xl border-2 transition-all flex flex-col items-start gap-1 group ${
                          canvasConfig.width === format.w && canvasConfig.height === format.h 
                            ? 'border-indigo-600 bg-indigo-50/30' 
                            : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200'
                        }`}
                      >
                         <span className={`text-[11px] font-black uppercase tracking-tight ${canvasConfig.width === format.w && canvasConfig.height === format.h ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>
                           {format.label}
                         </span>
                         <span className="text-[10px] text-slate-400">{format.w} × {format.h} px</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                     <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Tamanho Personalizado</label>
                     <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                           <label className="text-[9px] text-slate-400 uppercase tracking-tight font-black">Largura</label>
                           <input 
                             type="number" 
                             value={canvasConfig.width}
                             onChange={(e) => updateCanvasConfig({ ...canvasConfig, width: parseInt(e.target.value) || 1080 })}
                             className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] text-slate-400 uppercase tracking-tight font-black">Altura</label>
                           <input 
                             type="number" 
                             value={canvasConfig.height}
                             onChange={(e) => updateCanvasConfig({ ...canvasConfig, height: parseInt(e.target.value) || 1080 })}
                             className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20"
                           />
                        </div>
                     </div>
                  </div>
                </section>
              )}

              {activeTab === 'background' && (
                <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fundo da Tela</h3>
                    <p className="text-[10px] text-slate-400">Personalize a cor ou gradiente do projeto</p>
                  </div>

                  <div className="space-y-4">
                    {/* Cor Sólida */}
                    <div className="space-y-2">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Cor Sólida</label>
                       <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={canvasConfig.backgroundColor} 
                            onChange={(e) => updateCanvasConfig({ ...canvasConfig, backgroundColor: e.target.value, backgroundGradient: undefined })}
                            className="w-10 h-10 rounded-xl cursor-pointer border-none p-0 overflow-hidden bg-transparent"
                          />
                          <input 
                            type="text" 
                            value={canvasConfig.backgroundColor}
                            onChange={(e) => updateCanvasConfig({ ...canvasConfig, backgroundColor: e.target.value, backgroundGradient: undefined })}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-mono"
                          />
                       </div>
                    </div>

                    {/* Predefinições */}
                    <div className="grid grid-cols-6 gap-1.5">
                       {[
                          '#FFFFFF', '#F8FAFC', '#F1F5F9', '#000000', '#EF4444', '#F97316',
                          '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'
                       ].map(color => (
                          <button 
                            key={color}
                            onClick={() => updateCanvasConfig({ ...canvasConfig, backgroundColor: color, backgroundGradient: undefined })}
                            className={`w-full aspect-square rounded-lg border-2 transition-transform hover:scale-110 ${canvasConfig.backgroundColor === color && !canvasConfig.backgroundGradient ? 'border-indigo-600 scale-110' : 'border-white dark:border-slate-800 shadow-sm'}`}
                            style={{ backgroundColor: color }}
                          />
                       ))}
                    </div>

                    {/* Gradientes */}
                    <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                       <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Gradientes Populares</label>
                       <div className="grid grid-cols-2 gap-2">
                          {[
                            { start: '#6366F1', end: '#A855F7', label: 'Aurora' },
                            { start: '#F59E0B', end: '#EF4444', label: 'Sunset' },
                            { start: '#10B981', end: '#3B82F6', label: 'Ocean' },
                            { start: '#000000', end: '#334155', label: 'Midnight' }
                          ].map((grad, i) => (
                             <button
                               key={i}
                               onClick={() => updateCanvasConfig({ 
                                 ...canvasConfig, 
                                 backgroundGradient: { start: grad.start, end: grad.end, type: 'linear' } 
                               })}
                               className="h-12 rounded-xl border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden relative group transition-all hover:scale-105 active:scale-95"
                               style={{ background: `linear-gradient(135deg, ${grad.start}, ${grad.end})` }}
                             >
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white uppercase tracking-widest bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                 {grad.label}
                               </span>
                             </button>
                          ))}
                       </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'layouts' && (
                <section className="space-y-6">
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layouts de Grade</h3>
                    <p className="text-[10px] text-slate-400">Selecione uma base para sua colagem</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: '2x1', label: 'Duo Vertical', cells: 2 },
                      { id: '1x2', label: 'Duo Horizontal', cells: 2 },
                      { id: '2x2', label: 'Quarteto', cells: 4 },
                      { id: '3x1', label: 'Trio Vertical', cells: 3 }
                    ].map(layout => (
                      <button 
                        key={layout.id}
                        onClick={() => applyLayout(layout.id as any)}
                        className="aspect-square bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-600 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-2 group p-4"
                      >
                         <div className={`grid gap-1 w-full h-full ${layout.id === '2x1' ? 'grid-cols-2' : layout.id === '1x2' ? 'grid-rows-2' : layout.id === '2x2' ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3'}`}>
                            {Array.from({ length: layout.cells }).map((_, i) => (
                               <div key={i} className="bg-slate-100 dark:bg-slate-700 rounded-md group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors border border-slate-200 dark:border-slate-600" />
                            ))}
                         </div>
                         <span className="text-[9px] font-bold uppercase text-slate-400 group-hover:text-indigo-600 tracking-tighter">{layout.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                     <div className="space-y-3">
                        <div className="flex justify-between items-center">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espaçamento (Gap)</label>
                           <span className="text-[10px] font-black text-indigo-600">{layoutGap}px</span>
                        </div>
                        <input 
                          type="range" min="0" max="50" value={layoutGap} 
                          onChange={(e) => {
                             const val = parseInt(e.target.value);
                             setLayoutGap(val);
                             // Live update existing frames
                             setElements(prev => prev.map(el => el.type === 'frame' ? { ...el, gap: val } : el));
                          }}
                          className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                     </div>

                     <div className="space-y-3">
                        <div className="flex justify-between items-center">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arredondamento</label>
                           <span className="text-[10px] font-black text-indigo-600">{frameRadius}px</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" value={frameRadius} 
                          onChange={(e) => {
                             const val = parseInt(e.target.value);
                             setFrameRadius(val);
                             setElements(prev => prev.map(el => el.type === 'frame' ? { ...el, cornerRadius: val } : el));
                          }}
                          className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                     </div>
                  </div>
                </section>
              )}

              {activeTab === 'images' && (
                <section className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recursos Visuais</h3>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-video border-2 border-dashed border-indigo-100 dark:border-indigo-900/40 rounded-3xl flex flex-col items-center justify-center gap-4 bg-indigo-50/30 dark:bg-indigo-900/10 text-indigo-600 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                      <Plus size={32} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight">Carregar Fotos</span>
                  </button>
                </section>
              )}

              {activeTab === 'text' && (
                <section className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Composição de Texto</h3>
                  <div className="grid grid-cols-1 gap-3">
                     <button onClick={addText} className="w-full h-16 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-3 hover:border-indigo-600 transition-all group">
                        <TextIcon className="text-slate-400 group-hover:text-indigo-600" />
                        <span className="text-sm font-bold">Título Genérico</span>
                     </button>
                  </div>
                </section>
              )}

              {activeTab === 'elements' && (
                <section className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Elementos Gráficos</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'rect', label: 'Quadrado', icon: Square },
                      { id: 'circle', label: 'Círculo', icon: CircleIcon },
                      { id: 'triangle', label: 'Triângulo', icon: Triangle },
                      { id: 'line', label: 'Linha', icon: Minus }
                    ].map(shape => (
                      <button 
                        key={shape.id}
                        onClick={() => addShape(shape.id as any)}
                        className="aspect-square bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-indigo-600 hover:shadow-lg transition-all group"
                      >
                         <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                            <shape.icon size={24} className="text-slate-400 group-hover:text-indigo-600" />
                         </div>
                         <span className="text-[10px] font-bold uppercase tracking-tight text-slate-400 group-hover:text-indigo-600">{shape.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'layers' && (
                <section className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gerenciar Elementos</h3>
                  <div className="space-y-3">
                     {[...elements].reverse().map((el) => (
                       <div 
                         key={el.id}
                         active-id={selectedIds.includes(el.id) ? "true" : "false"}
                         onClick={() => setSelectedIds([el.id])}
                         className={`group w-full p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer ${
                            selectedIds.includes(el.id) 
                              ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800 shadow-sm' 
                              : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200'
                         }`}
                       >
                         <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-xl overflow-hidden flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-600">
                           {el.type === 'image' ? <img src={el.src} className="w-full h-full object-cover" /> : <TextIcon size={20} />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate">{el.type === 'image' ? 'Imagem' : el.text}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">id: {el.id.split('-')[0]}</p>
                         </div>
                       </div>
                     ))}
                  </div>
                </section>
              )}

              {/* Dynamic Property Bar when something is selected */}
              {selectedIds.length > 0 && firstSelected && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <PropertyPanel 
                      element={firstSelected} 
                      onUpdate={(id, attrs) => {
                        handleUpdate(id, attrs, true);
                      }}
                      onRemove={(id) => removeElements([id])}
                      onMoveLayer={(dir) => handleMoveLayer(firstSelected.id, dir)}
                      onDuplicate={() => duplicateElements([firstSelected.id])}
                    />
                </div>
              )}
            </div>
          </aside>

          {/* Central Workspace */}
          <main 
            ref={containerRef}
            className="flex-1 bg-slate-200/50 dark:bg-slate-950 p-2 lg:p-10 overflow-hidden flex flex-col items-center justify-center relative touch-none"
          >
            {/* Contextual Toolbar (Canva-style top bar) */}
            <AnimatePresence>
              {selectedIds.length === 1 && firstSelected && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-4 lg:top-8 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 lg:p-2 z-40 flex items-center gap-1.5 lg:gap-2 max-w-[90vw] overflow-x-auto"
                >
                   {/* Mobile Zoom (Magnifying Glass) */}
                   <div className="flex lg:hidden items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-1">
                      <button 
                        onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
                        className="p-1.5 text-slate-500"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-[10px] font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
                      <button 
                        onClick={() => setZoom(prev => Math.min(5, prev + 0.1))}
                        className="p-1.5 text-slate-500"
                      >
                        <Plus size={14} />
                      </button>
                   </div>

                   {firstSelected.type === 'text' && (
                     <>
                        <div className="hidden sm:block h-6 w-px bg-slate-100 dark:bg-slate-800 mx-1" />
                        <select 
                          value={firstSelected.fontFamily || 'Inter'} 
                          onChange={(e) => handleUpdate(firstSelected.id, { fontFamily: e.target.value }, true)}
                          className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-2 py-1 text-[10px] font-bold cursor-pointer text-slate-700 dark:text-slate-200"
                        >
                           <option value="Inter">Inter</option>
                           <option value="Poppins">Poppins</option>
                           <option value="Montserrat">Montserrat</option>
                        </select>

                        <div className="flex gap-1">
                           <button 
                             onClick={() => handleUpdate(firstSelected.id, { fontWeight: firstSelected.fontWeight === 'bold' ? 'normal' : 'bold' }, true)}
                             className={`p-1.5 rounded-lg transition-all ${firstSelected.fontWeight === 'bold' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                           >
                              <Bold size={14} />
                           </button>
                           <button 
                             onClick={() => handleUpdate(firstSelected.id, { fontStyle: firstSelected.fontStyle === 'italic' ? 'normal' : 'italic' }, true)}
                             className={`p-1.5 rounded-lg transition-all ${firstSelected.fontStyle === 'italic' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                           >
                              <Italic size={14} />
                           </button>
                        </div>
                     </>
                   )}

                   <div className="h-6 w-px bg-slate-100 dark:bg-slate-800 mx-1" />
                   
                   <button 
                     onClick={() => removeElements([firstSelected.id])}
                     className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                   >
                      <Trash2 size={14} />
                   </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative shadow-[0_40px_100px_-12px_rgba(0,0,0,0.15)] bg-white dark:bg-slate-900 rounded-sm">
              <CanvasArea 
                elements={elements}
                config={canvasConfig}
                selectedIds={selectedIds}
                dimensions={dimensions}
                editingId={editingTextId}
                onSelect={(ids, isEditing) => {
                  setSelectedIds(ids);
                  if (isEditing && ids.length === 1) {
                    const el = elements.find(e => e.id === ids[0]);
                    if (el?.type === 'text') {
                      setEditingTextId(ids[0]);
                    }
                  } else if (!isEditing) {
                    setEditingTextId(null);
                  }
                }}
                onUpdate={(id, attrs) => {
                  handleUpdate(id, attrs, true);
                }}
                stageRef={stageRef}
                onContextMenu={handleContextMenu}
                onMouseDown={() => setContextMenu(null)}
                zoom={zoom}
              />

              {/* Context Menu */}
              <AnimatePresence>
                {contextMenu && contextMenu.visible && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="fixed bg-white dark:bg-slate-900 shadow-[0_10px_40px_-5px_rgba(0,0,0,0.2)] rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-[100] min-w-[200px] overflow-hidden"
                    style={{ 
                      left: Math.min(window.innerWidth - 220, contextMenu.x + (containerRef.current?.getBoundingClientRect().left || 0)), 
                      top: Math.min(window.innerHeight - 300, contextMenu.y + (containerRef.current?.getBoundingClientRect().top || 0)) 
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <button 
                        onClick={() => handleMenuAction('copy')}
                        disabled={selectedIds.length === 0}
                        className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30"
                      >
                        <div className="flex items-center gap-3">
                          <Copy size={16} className="text-indigo-500" />
                          <span>Copiar</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Ctrl+C</span>
                      </button>

                      <button 
                        onClick={() => handleMenuAction('cut')}
                        disabled={selectedIds.length === 0}
                        className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30"
                      >
                        <div className="flex items-center gap-3">
                          <Scissors size={16} className="text-indigo-500" />
                          <span>Cortar</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Ctrl+X</span>
                      </button>

                      <button 
                        onClick={() => handleMenuAction('paste')}
                        disabled={clipboard.length === 0}
                        className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30"
                      >
                        <div className="flex items-center gap-3">
                          <ClipboardPaste size={16} className="text-indigo-500" />
                          <span>Colar</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Ctrl+V</span>
                      </button>
                      
                      {selectedIds.length === 1 && elements.find(el => el.id === selectedIds[0])?.type === 'text' && (
                        <button 
                          onClick={() => {
                            setContextMenu(null);
                            (window as any).__triggerTextEdit && (window as any).__triggerTextEdit(selectedIds[0]);
                          }}
                          className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <TextIcon size={16} />
                            <span>Editar Texto</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">DblClick</span>
                        </button>
                      )}

                      <button 
                        onClick={() => handleMenuAction('duplicate')}
                        disabled={selectedIds.length === 0}
                        className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30"
                      >
                        <div className="flex items-center gap-3">
                          <Copy size={16} className="text-indigo-500" />
                          <span>Duplicar</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Ctrl+D</span>
                      </button>

                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />

                      <button 
                        onClick={() => handleMenuAction('group')}
                        disabled={selectedIds.length < 2}
                        className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30"
                      >
                        <div className="flex items-center gap-3">
                          <GroupIcon size={16} className="text-indigo-500" />
                          <span>Agrupar</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Ctrl+G</span>
                      </button>

                      <button 
                        onClick={() => handleMenuAction('ungroup')}
                        disabled={!selectedIds.some(id => elements.find(el => el.id === id)?.groupId)}
                        className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30"
                      >
                        <div className="flex items-center gap-3">
                          <UngroupIcon size={16} className="text-indigo-500" />
                          <span>Desagrupar</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Ctrl+Shift+G</span>
                      </button>

                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />

                      <button 
                        onClick={() => handleMenuAction('link')}
                        disabled={selectedIds.length !== 1}
                        className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-30"
                      >
                        <div className="flex items-center gap-3">
                          <Link size={16} className="text-indigo-500" />
                          <span>Adicionar Link</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Ctrl+K</span>
                      </button>

                      <button 
                        onClick={() => handleMenuAction('delete')}
                        disabled={selectedIds.length === 0}
                        className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-30"
                      >
                        <div className="flex items-center gap-3">
                          <Trash2 size={16} />
                          <span>Excluir</span>
                        </div>
                        <span className="text-[10px] text-red-300 font-medium">Del / Backspace / Ctrl+R</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* In-Canvas Text Editing Overlay */}
              {editingTextId && (
                <div className="absolute inset-0 pointer-events-none z-50">
                   {/* This is a simplified direct text editor overlay */}
                   {(() => {
                      const el = elements.find(v => v.id === editingTextId);
                      if (!el) return null;
                      return (
                        <div
                          key={editingTextId}
                          contentEditable
                          autoFocus
                          suppressContentEditableWarning
                          className="absolute pointer-events-auto bg-transparent outline-none leading-none min-w-[20px] whitespace-pre-wrap break-words caret-indigo-600"
                          style={{
                            left: el.x,
                            top: el.y,
                            width: el.width || 'auto',
                            minHeight: el.fontSize + 'px',
                            fontSize: el.fontSize + 'px',
                            color: el.fill,
                            transform: `rotate(${el.rotation}deg)`,
                            zIndex: 1000,
                            fontFamily: el.fontFamily || 'Inter',
                            fontWeight: el.fontWeight || 'normal',
                            fontStyle: el.fontStyle || 'normal',
                            textAlign: el.align || 'left',
                            padding: '0',
                          }}
                          onInput={(e) => {
                             const node = e.currentTarget;
                             const val = node.innerText;
                             
                             // Measure content width to expand the bounding box if it overflows
                             const measuredWidth = node.scrollWidth;
                             
                             handleUpdate(el.id, { 
                               text: val,
                               width: Math.max(el.width || 0, measuredWidth)
                             });
                          }}
                          onBlur={(e) => {
                            const val = e.currentTarget.innerText;
                            // Preserve exact text, only fallback to default if truly empty
                            handleUpdate(el.id, { text: val || 'Texto' }); 
                            setEditingTextId(null);
                            updateElements(prev => prev, true);
                          }}
                          onKeyDown={(e) => {
                             if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                e.currentTarget.blur();
                             }
                          }}
                          ref={(node) => {
                            if (node) {
                              // Initialize content once if empty
                              if (!node.innerText && el.text) {
                                node.innerText = el.text;
                              }
                              
                              if (document.activeElement !== node) {
                                node.focus();
                                const range = document.createRange();
                                range.selectNodeContents(node);
                                range.collapse(false);
                                const sel = window.getSelection();
                                sel?.removeAllRanges();
                                sel?.addRange(range);
                              }
                            }
                          }}
                        />
                      );
                   })()}
                </div>
              )}
              
              {elements.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200 pointer-events-none">
                  <MousePointer2 size={80} className="mb-6 opacity-5 animate-pulse" />
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black uppercase tracking-tighter opacity-10">Tela Vazia</h2>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-20">Comece adicionando fotos, elementos ou texto</p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <input type="file" multiple ref={fileInputRef} onChange={handleAddImage} accept="image/*" className="hidden" />
    </div>
  );
}
