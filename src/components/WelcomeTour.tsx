import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ArrowRight, MousePointer2, Layers, Sliders, Zap } from 'lucide-react';

interface WelcomeTourProps {
  onComplete: () => void;
}

export function WelcomeTour({ onComplete }: WelcomeTourProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = [
    {
      title: "Bem-vindo ao Editor!",
      content: "Aqui você pode transformar suas imagens com o poder da Inteligência Artificial. Vamos te mostrar como começar.",
      icon: <Sparkles className="text-indigo-600" size={32} />,
      target: null
    },
    {
      title: "Painel de Recursos",
      content: "Neste painel lateral, você encontra todos os recursos de IA: remover fundo, objetos, melhorar qualidade e muito mais.",
      icon: <Layers className="text-indigo-600" size={32} />,
      target: "editor-sidebar"
    },
    {
      title: "Área de Trabalho",
      content: "Aqui você visualiza sua imagem. Você pode arrastar novas imagens diretamente para cá para começar a editar.",
      icon: <MousePointer2 className="text-indigo-600" size={32} />,
      target: "editor-canvas"
    },
    {
      title: "Remoção Inteligente",
      content: "Use o pincel vermelho para marcar o que remover e o verde para o que manter (ou restaurar). É como mágica!",
      icon: <Sparkles className="text-indigo-600" size={32} />,
      target: "editor-canvas"
    },
    {
      title: "Visualize e Compare",
      content: "Alterne entre a imagem original e o resultado, ou use o modo 'Comparar' para ver as mudanças lado a lado.",
      icon: <Sliders className="text-indigo-600" size={32} />,
      target: "editor-topbar"
    },
    {
      title: "Controles Rápidos",
      content: "Ajuste o zoom, desfaça alterações e clique em 'Aplicar' para processar suas mudanças com IA.",
      icon: <Zap className="text-indigo-600" size={32} />,
      target: "editor-actions"
    }
  ];

  useEffect(() => {
    const targetId = steps[step].target;
    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    } else {
      setTargetRect(null);
    }
  }, [step]);

  const currentStep = steps[step];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-hidden"
      >
        {/* Highlight Overlay */}
        {targetRect && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            className="fixed z-[101] border-4 border-indigo-500 rounded-[2rem] pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          />
        )}

        {/* Tooltip Card */}
        <motion.div 
          key={step}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative z-[102] ${targetRect ? 'mt-auto mb-12 sm:mb-24' : ''}`}
        >
          <button 
            onClick={onComplete}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="space-y-6">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center shadow-inner">
              {currentStep.icon}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {currentStep.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {currentStep.content}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-indigo-600' : 'w-1.5 bg-slate-200 dark:bg-slate-800'}`} 
                  />
                ))}
              </div>
              
              <div className="flex gap-3">
                {step > 0 && (
                  <button 
                    onClick={() => setStep(step - 1)}
                    className="px-6 py-3 text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Anterior
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (step < steps.length - 1) setStep(step + 1);
                    else onComplete();
                  }}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  {step === steps.length - 1 ? "Começar" : "Próximo"}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
