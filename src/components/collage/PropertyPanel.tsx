import React from 'react';
import { 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Move,
  RotateCcw,
  Square,
  Type as TextIcon,
  Layers,
  Image as ImageIcon,
  Copy,
  Link,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered
} from 'lucide-react';
import { CanvasElement } from './types';

interface PropertyPanelProps {
  element: CanvasElement;
  onUpdate: (id: string, attrs: Partial<CanvasElement>) => void;
  onRemove: (id: string) => void;
  onMoveLayer: (direction: 'up' | 'down') => void;
  onDuplicate: () => void;
}

export const PropertyPanel = ({ element, onUpdate, onRemove, onMoveLayer, onDuplicate }: PropertyPanelProps) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Propriedades</h3>
        <div className="flex gap-1">
          <button onClick={onDuplicate} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Duplicar (Ctrl+D)">
            <Copy size={14} />
          </button>
          <button onClick={() => onRemove(element.id)} className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Opacity only, as Transform is now canvas-only */}
        <div className="space-y-3 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Opacidade</label>
              <span className="text-[10px] font-black text-indigo-600">{Math.round(element.opacity * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={element.opacity} 
              onChange={(e) => onUpdate(element.id, { opacity: parseFloat(e.target.value) })}
              className="w-full accent-indigo-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Text/Shape Color */}
        {(element.type === 'text' || ['rect', 'circle', 'triangle', 'line'].includes(element.type)) && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
             <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                  {element.type === 'line' ? 'Cor da Linha' : element.type === 'text' ? 'Cor do Texto' : 'Cor de Preenchimento'}
                </label>
                <div className="space-y-3">
                   <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={element.fill} 
                        onChange={(e) => onUpdate(element.id, { fill: e.target.value })}
                        className="w-10 h-10 rounded-xl cursor-pointer border-none p-0 overflow-hidden bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={element.fill}
                        onChange={(e) => onUpdate(element.id, { fill: e.target.value })}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-mono"
                      />
                   </div>
                   <div className="grid grid-cols-6 gap-2">
                      {[
                         '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308',
                         '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
                         '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b'
                      ].map(color => (
                         <button 
                           key={color}
                           onClick={() => onUpdate(element.id, { fill: color })}
                           className={`w-full aspect-square rounded-lg border-2 transition-transform hover:scale-110 ${element.fill === color ? 'border-indigo-600 scale-110' : 'border-white dark:border-slate-800 shadow-sm'}`}
                           style={{ backgroundColor: color }}
                         />
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Text Specific (Formatting) */}
        {element.type === 'text' && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
             {/* Font Family */}
             <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Fonte</label>
                <select 
                  value={element.fontFamily || 'Inter'} 
                  onChange={(e) => onUpdate(element.id, { fontFamily: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-medium cursor-pointer"
                >
                   <option value="Inter">Inter</option>
                   <option value="Poppins">Poppins</option>
                   <option value="Montserrat">Montserrat</option>
                   <option value="Arial">Arial</option>
                   <option value="Verdana">Verdana</option>
                   <option value="Times New Roman">Times New Roman</option>
                </select>
             </div>

             <div className="flex gap-2">
                {/* Bold */}
                <button 
                  onClick={() => onUpdate(element.id, { fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  className={`flex-1 p-2 rounded-xl flex items-center justify-center transition-all ${element.fontWeight === 'bold' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                   <Bold size={14} />
                </button>
                {/* Italic */}
                <button 
                  onClick={() => onUpdate(element.id, { fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}
                  className={`flex-1 p-2 rounded-xl flex items-center justify-center transition-all ${element.fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                   <Italic size={14} />
                </button>
             </div>

             {/* Alignment */}
             <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
                {(['left', 'center', 'right'] as const).map(align => (
                   <button 
                     key={align}
                     onClick={() => onUpdate(element.id, { align })}
                     className={`flex-1 p-1.5 rounded-lg flex items-center justify-center transition-all ${element.align === align ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}
                   >
                      {align === 'left' && <AlignLeft size={14} />}
                      {align === 'center' && <AlignCenter size={14} />}
                      {align === 'right' && <AlignRight size={14} />}
                   </button>
                ))}
             </div>

             {/* Lists */}
             <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const lines = (element.text || '').split('\n');
                    const isBullet = lines.every(l => l.startsWith('• '));
                    const newText = isBullet 
                      ? lines.map(l => l.replace('• ', '')).join('\n')
                      : lines.map(l => l.startsWith('• ') ? l : `• ${l}`).join('\n');
                    onUpdate(element.id, { text: newText });
                  }}
                  className="flex-1 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                   <List size={14} /> Marcadores
                </button>
                <button 
                   onClick={() => {
                     const lines = (element.text || '').split('\n');
                     const isOrdered = lines.every((l, i) => l.startsWith(`${i+1}. `));
                     const newText = isOrdered 
                       ? lines.map(l => l.replace(/^\d+\. /, '')).join('\n')
                       : lines.map((l, i) => l.match(/^\d+\. /) ? l : `${i+1}. ${l}`).join('\n');
                     onUpdate(element.id, { text: newText });
                   }}
                   className="flex-1 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-all"
                >
                   <ListOrdered size={14} /> Numeração
                </button>
             </div>

             <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Tamanho da Fonte</label>
                   <span className="text-[10px] font-black text-indigo-600">{Math.round(element.fontSize || 0)}px</span>
                </div>
                <input 
                  type="range" min="8" max="200" 
                  value={element.fontSize} 
                  onChange={(e) => onUpdate(element.id, { fontSize: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
             </div>
          </div>
        )}

        {/* Line Specific */}
        {element.type === 'line' && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
             <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Espessura da Linha</label>
                   <span className="text-[10px] font-black text-indigo-600">{element.strokeWidth}px</span>
                </div>
                <input 
                  type="range" min="1" max="50" 
                  value={element.strokeWidth || 5} 
                  onChange={(e) => onUpdate(element.id, { strokeWidth: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
             </div>
          </div>
        )}

        {/* Frame Specific */}
        {element.type === 'frame' && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
             <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Cantos Arredondados</label>
                   <span className="text-[10px] font-black text-indigo-600">{element.cornerRadius || 0}px</span>
                </div>
                <input 
                  type="range" min="0" max="100" 
                  value={element.cornerRadius || 0} 
                  onChange={(e) => onUpdate(element.id, { cornerRadius: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
             </div>
             
             {element.src && (
               <div className="space-y-4 pt-2">
                  <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Ajuste da Imagem (Interno)</h4>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Espessura Borda</label>
                        <input 
                          type="number" 
                          min="0"
                          value={element.borderWidth || 0} 
                          onChange={(e) => onUpdate(element.id, { borderWidth: parseInt(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-xs font-mono" 
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Cor Borda</label>
                        <input 
                          type="color" 
                          value={element.borderColor || "#e2e8f0"} 
                          onChange={(e) => onUpdate(element.id, { borderColor: e.target.value })}
                          className="w-full h-8 bg-transparent border-none p-0 overflow-hidden cursor-pointer" 
                        />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Zoom (Largura)</label>
                        <input 
                          type="number" 
                          value={Math.round(element.imageWidth || 0)} 
                          onChange={(e) => onUpdate(element.id, { imageWidth: parseInt(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-xs font-mono" 
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Zoom (Altura)</label>
                        <input 
                          type="number" 
                          value={Math.round(element.imageHeight || 0)} 
                          onChange={(e) => onUpdate(element.id, { imageHeight: parseInt(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-xs font-mono" 
                        />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Deslocamento X</label>
                        <input 
                          type="number" 
                          value={Math.round(element.cropX || 0)} 
                          onChange={(e) => onUpdate(element.id, { cropX: parseInt(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-xs font-mono" 
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Deslocamento Y</label>
                        <input 
                          type="number" 
                          value={Math.round(element.cropY || 0)} 
                          onChange={(e) => onUpdate(element.id, { cropY: parseInt(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-2 text-xs font-mono" 
                        />
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Image Effects */}
        {(element.type === 'image' || (element.type === 'frame' && element.src)) && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
             <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Efeitos e Filtros</h4>
             
             <div className="space-y-4">
                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Brilho</label>
                      <span className="text-[10px] font-black text-indigo-600">{Math.round((element.brightness || 0) * 100)}%</span>
                   </div>
                   <input 
                     type="range" min="-1" max="1" step="0.05" 
                     value={element.brightness || 0} 
                     onChange={(e) => onUpdate(element.id, { brightness: parseFloat(e.target.value) })}
                     className="w-full accent-indigo-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                   />
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Contraste</label>
                      <span className="text-[10px] font-black text-indigo-600">{Math.round(element.contrast || 0)}%</span>
                   </div>
                   <input 
                     type="range" min="-100" max="100" step="1" 
                     value={element.contrast || 0} 
                     onChange={(e) => onUpdate(element.id, { contrast: parseInt(e.target.value) })}
                     className="w-full accent-indigo-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                   />
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Saturação</label>
                      <span className="text-[10px] font-black text-indigo-600">{Math.round(element.saturation || 0)}%</span>
                   </div>
                   <input 
                     type="range" min="-100" max="100" step="1" 
                     value={element.saturation || 0} 
                     onChange={(e) => onUpdate(element.id, { saturation: parseInt(e.target.value) })}
                     className="w-full accent-indigo-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                   />
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Borrão</label>
                      <span className="text-[10px] font-black text-indigo-600">{element.blur || 0}px</span>
                   </div>
                   <input 
                     type="range" min="0" max="20" step="1" 
                     value={element.blur || 0} 
                     onChange={(e) => onUpdate(element.id, { blur: parseInt(e.target.value) })}
                     className="w-full accent-indigo-600 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                   />
                </div>

                <div className="flex gap-2">
                   <button 
                     onClick={() => onUpdate(element.id, { brightness: 0, contrast: 0, saturation: -100, blur: 0 })}
                     className="flex-1 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-500 hover:bg-slate-100 transition-all"
                   >
                     P&B
                   </button>
                   <button 
                     onClick={() => onUpdate(element.id, { brightness: 0.1, contrast: 20, saturation: 30, blur: 0 })}
                     className="flex-1 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-500 hover:bg-slate-100 transition-all"
                   >
                     Vibrante
                   </button>
                   <button 
                     onClick={() => onUpdate(element.id, { brightness: 0, contrast: 0, saturation: 0, blur: 0 })}
                     className="flex-1 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[9px] font-bold text-slate-500 hover:bg-slate-100 transition-all"
                   >
                     Reset
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Link control */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
           <div className="flex justify-between items-center">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Link (URL)</label>
              <Link size={10} className="text-slate-400" />
           </div>
           <input 
             type="url" 
             placeholder="https://exemplo.com"
             value={element.url || ''} 
             onChange={(e) => onUpdate(element.id, { url: e.target.value })}
             className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2 text-xs font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
           />
        </div>

        {/* Layers control */}
        <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
           <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Hierarquia de Camadas</label>
           <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onMoveLayer('up')} className="py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold hover:bg-slate-50 transition-all shadow-sm">
                <ArrowUp size={12} /> Trazer para frente
              </button>
              <button onClick={() => onMoveLayer('down')} className="py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold hover:bg-slate-50 transition-all shadow-sm">
                <ArrowDown size={12} /> Recuar para trás
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
