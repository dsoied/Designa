import { Project, Tool } from './types';

export const RECENT_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Sneaker_Premium_Red.png',
    date: '12 Mai 2024',
    status: 'Finalizado',
    type: 'Remoção de Fundo',
    imageUrl: 'https://picsum.photos/seed/sneaker/800/600',
  },
  {
    id: '2',
    name: 'Home_Office_Setup.jpg',
    date: '10 Mai 2024',
    status: 'Em Nuvem',
    type: 'Edição GenAI',
    imageUrl: 'https://picsum.photos/seed/office/800/600',
  },
  {
    id: '3',
    name: 'Cyber_Background_V2.png',
    date: '08 Mai 2024',
    status: 'Finalizado',
    type: 'Upscale 4K',
    imageUrl: 'https://picsum.photos/seed/cyber/800/600',
  },
  {
    id: '4',
    name: 'Abstract_Flow_Cover.jpg',
    date: '05 Mai 2024',
    status: 'Finalizado',
    type: 'Retoque',
    imageUrl: 'https://picsum.photos/seed/abstract/800/600',
  },
  {
    id: '5',
    name: 'Portrait_Editorial_02.png',
    date: '02 Mai 2024',
    status: 'Finalizado',
    type: 'Color Grade',
    imageUrl: 'https://picsum.photos/seed/portrait/800/600',
  },
];

export const QUICK_TOOLS: Tool[] = [
  {
    id: 'bg-remover',
    name: 'Remover Fundo',
    description: 'Remova fundos complexos instantaneamente com precisão de IA.',
    icon: 'Layers',
  },
  {
    id: 'obj-remover',
    name: 'Remover Objeto',
    description: 'Elimine distrações ou objetos indesejados de qualquer fotografia.',
    icon: 'Eraser',
  },
  {
    id: 'quality-adjust',
    name: 'Ajustar Qualidade',
    description: 'Aumente a resolução e melhore a nitidez de imagens em baixa qualidade.',
    icon: 'HighQuality',
  },
];
