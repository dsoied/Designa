import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Zap, Shield, Star, Crown, ArrowRight, X } from 'lucide-react';
import { auth, db, doc, updateDoc, addDoc, collection, setDoc } from '../firebase';
import { useLanguage } from '../context/LanguageContext';

interface PricingProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: string;
  isMandatory?: boolean;
  onPlanSelected?: (plan: 'free' | 'pro') => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export function Pricing({ isOpen, onClose, currentRole, isMandatory, onPlanSelected }: PricingProps) {
  const { t } = useLanguage();
  const [isPaypalLoaded, setIsPaypalLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalButtonsInstance = useRef<any>(null);

  const handleSelectFree = async () => {
    setIsProcessing(true);
    try {
      if (auth.currentUser) {
        // Update user role to 'user' (free) explicitly if needed, 
        // or just signal completion if they are already 'user'
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          role: 'user',
          planSelected: true // Mark that they've made their initial choice
        }, { merge: true });
      }
      onPlanSelected?.('free');
      onClose();
    } catch (err) {
      console.error('Pricing: Erro ao selecionar plano gratuito:', err);
      // Even if firestore fails, we should let them continue if they clicked the button
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProSuccess = async () => {
    if (auth.currentUser) {
      try {
        // Update user role
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          role: 'pro',
          planSelected: true
        }, { merge: true });

        // Add notification
        await addDoc(collection(db, 'notifications'), {
          id: Date.now().toString(),
          uid: auth.currentUser.uid,
          title: 'Bem-vindo ao Pro!',
          message: 'Seu plano Pro foi ativado com sucesso. Aproveite todos os recursos ilimitados.',
          time: 'Agora',
          type: 'success',
          isRead: false
        });

        alert('Parabéns! Você agora é um membro Pro.');
        onPlanSelected?.('pro');
        onClose();
      } catch (err) {
        console.error('Pricing: Erro ao atualizar plano:', err);
        alert('Pagamento recebido, mas houve um erro ao atualizar seu plano. Por favor, contate o suporte.');
      }
    }
  };

  useEffect(() => {
    if (isOpen && !isPaypalLoaded) {
      const clientId = (import.meta as any).env.VITE_PAYPAL_CLIENT_ID || 'test';
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      script.async = true;
      script.onload = () => {
        setIsPaypalLoaded(true);
      };
      document.body.appendChild(script);
      return () => {
        // We don't necessarily want to remove it if we might open pricing again
      };
    }
  }, [isOpen, isPaypalLoaded]);

  useEffect(() => {
    if (isPaypalLoaded && isOpen && window.paypal && paypalContainerRef.current) {
      if (paypalContainerRef.current.innerHTML === '') {
        try {
          paypalButtonsInstance.current = window.paypal.Buttons({
            style: {
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'paypal'
            },
            createOrder: (data: any, actions: any) => {
              return actions.order.create({
                purchase_units: [{
                  amount: {
                    value: '3.00'
                  },
                  description: 'Designa Pro Plan - 7 Meses de Acesso Ilimitado'
                }]
              });
            },
            onApprove: async (data: any, actions: any) => {
              setIsProcessing(true);
              try {
                // Call our server to capture the order securely
                const response = await fetch('/api/paypal/capture-order', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    orderID: data.orderID
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Erro ao capturar pedido');
                }

                const result = await response.json();
                console.log('PayPal: Pagamento capturado no servidor', result);
                await handleProSuccess();
              } catch (err) {
                console.error('Pricing: Erro no checkout:', err);
                alert(err instanceof Error ? err.message : 'Ocorreu um erro ao processar seu pagamento. Tente novamente.');
              } finally {
                setIsProcessing(false);
              }
            },
            onError: (err: any) => {
              console.error('PayPal Error:', err);
              // Only alert if it's not a cancellation
              if (err.message !== 'Detected popup close') {
                alert('Ocorreu um erro com o pagamento PayPal. Tente novamente.');
              }
            }
          });
          
          paypalButtonsInstance.current.render(paypalContainerRef.current);
        } catch (err) {
          console.error('PayPal Render Error:', err);
        }
      }
    }
    
    return () => {
      if (paypalButtonsInstance.current) {
        // PayPal SDK doesn't have a formal destroy, but we can clear the ref
        paypalButtonsInstance.current = null;
      }
    };
  }, [isPaypalLoaded, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Fixed Close Button - Always responsive and visible */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 transition-all z-[110] rounded-full backdrop-blur-sm"
          aria-label="Fechar"
        >
          <X size={24} />
        </button>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Top Section: Benefits */}
          <div className="p-6 bg-indigo-600 text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                <Crown size={12} className="text-yellow-400" />
                {isMandatory ? 'Escolha seu Plano' : 'Upgrade para Pro'}
              </div>
              
              <h2 className="text-xl font-black mb-4 leading-tight">
                {isMandatory ? 'Bem-vindo ao Designa!' : 'Potencial Criativo Ilimitado'}
              </h2>
              <p className="text-xs text-indigo-100 mb-4 font-medium">
                {isMandatory ? 'Para começar sua jornada, selecione o plano que melhor se adapta às suas necessidades.' : 'Desbloqueie todas as funcionalidades premium.'}
              </p>
              
              <ul className="grid grid-cols-1 gap-2 mb-2">
                {[
                  'Processamento ilimitado',
                  'Arquivos de até 20MB',
                  'Todos os recursos IA',
                  'Processamento em Lote',
                  'Upscale 8K',
                  'Histórico completo',
                  'Sem limites de cota',
                  'Suporte prioritário'
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check size={12} className="text-indigo-200 shrink-0" />
                    <span className="text-xs font-medium text-indigo-50">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Section: Pricing & Checkout */}
          <div className="p-6 flex flex-col bg-white dark:bg-slate-900">
            <div className="text-center mb-4">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-slate-900 dark:text-white">$3</span>
                <span className="text-slate-500 dark:text-slate-400 font-bold text-sm">/ 7 meses</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="p-3 rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Plano Pro</p>
                  <p className="text-[10px] text-slate-500">7 meses de acesso total</p>
                </div>
                <p className="font-black text-indigo-600">$3.00</p>
              </div>
            </div>

            <div className="relative">
              {isProcessing && (
                <div className="absolute inset-0 z-10 bg-white/80 dark:bg-slate-900/80 flex flex-col items-center justify-center rounded-xl">
                  <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-2" />
                  <p className="text-xs font-bold text-indigo-600">Processando...</p>
                </div>
              )}
              
              {(currentRole === 'pro' || currentRole === 'admin') ? (
                <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 rounded-2xl text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <Crown size={32} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">Plano Ativo</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {currentRole === 'admin' ? 'Você é o Administrador do sistema.' : 'Você já possui acesso total ao Designa Pro.'}
                    </p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20"
                  >
                    Continuar Criando
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Pague com segurança</p>
                    {!isPaypalLoaded ? (
                      <div className="w-full py-8 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Carregando PayPal...</p>
                      </div>
                    ) : (
                      <div ref={paypalContainerRef} className="min-h-[150px] w-full" />
                    )}
                  </div>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-black tracking-widest">Ou</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSelectFree}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-indigo-200 dark:border-indigo-900 shadow-sm"
                  >
                    {t('continueWithFree')}
                  </button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-6 leading-relaxed">
              Ao assinar, você concorda com nossos Termos de Serviço e Política de Privacidade. O pagamento é processado com segurança pelo PayPal.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
