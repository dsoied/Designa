import React from 'react';
import { motion } from 'motion/react';
import { Shield, FileText, ArrowLeft } from 'lucide-react';
import { Screen } from '../types';

interface LegalPageProps {
  type: 'terms' | 'privacy';
  onNavigate: (screen: Screen) => void;
  appName?: string;
}

export function LegalPage({ type, onNavigate, appName = 'Designa' }: LegalPageProps) {
  const isTerms = type === 'terms';

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-8 font-bold"
      >
        <ArrowLeft size={20} />
        Voltar para Home
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-16 shadow-2xl shadow-indigo-500/5 border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
            {isTerms ? <FileText size={32} /> : <Shield size={32} />}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {isTerms ? 'Termos e Condições' : 'Política de Privacidade'}
            </h1>
            <p className="text-slate-500 font-medium">Última atualização: 05 de Abril de 2026</p>
          </div>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-8 text-slate-600 dark:text-slate-400 leading-relaxed">
          {isTerms ? (
            <>
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Aceitação dos Termos</h2>
                <p>
                  Ao acessar e utilizar o {appName}, você concorda em cumprir e estar vinculado a estes Termos e Condições de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Uso do Serviço</h2>
                <p>
                  O {appName} fornece recursos de edição de imagem baseadas em Inteligência Artificial. Você é responsável por garantir que possui os direitos necessários sobre as imagens que envia para processamento.
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Não utilize o serviço para fins ilegais ou não autorizados.</li>
                  <li>Não tente interferir na segurança ou integridade da plataforma.</li>
                  <li>O uso abusivo dos recursos de IA pode resultar na suspensão da conta.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Propriedade Intelectual</h2>
                <p>
                  Todo o conteúdo original, recursos e funcionalidades do {appName} são de propriedade exclusiva da nossa equipe. As imagens geradas ou editadas por você pertencem a você, respeitando os termos dos modelos de IA utilizados.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Planos e Assinaturas</h2>
                <p>
                  Oferecemos planos gratuitos e premium (Pro). As assinaturas Pro são renovadas automaticamente, a menos que sejam canceladas pelo usuário através das configurações da conta.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Limitação de Responsabilidade</h2>
                <p>
                  O {appName} é fornecido "como está". Não garantimos que o serviço será ininterrupto ou livre de erros, embora nos esforcemos para manter a máxima qualidade e disponibilidade.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. Coleta de Informações</h2>
                <p>
                  Coletamos informações básicas para fornecer e melhorar nossos serviços, incluindo:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Dados de autenticação (E-mail, Nome, Foto de Perfil via Google).</li>
                  <li>Imagens enviadas para processamento (armazenadas temporariamente ou conforme seu plano).</li>
                  <li>Informações de uso e logs técnicos para diagnóstico de erros.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. Uso dos Dados</h2>
                <p>
                  Seus dados são utilizados exclusivamente para:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Personalizar sua experiência na plataforma.</li>
                  <li>Processar suas solicitações de edição de imagem via IA.</li>
                  <li>Enviar notificações importantes sobre sua conta ou atualizações do serviço.</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. Segurança</h2>
                <p>
                  Implementamos medidas de segurança rigorosas para proteger suas informações contra acesso não autorizado, alteração ou destruição. Utilizamos serviços de infraestrutura de nuvem líderes de mercado (Firebase/Google Cloud).
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. Compartilhamento de Dados</h2>
                <p>
                  Não vendemos seus dados pessoais a terceiros. Podemos compartilhar informações apenas com provedores de serviços essenciais (como processadores de pagamento ou APIs de IA) estritamente para a execução do serviço.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. Seus Direitos</h2>
                <p>
                  Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das configurações da sua conta ou entrando em contato com nosso suporte.
                </p>
              </section>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
