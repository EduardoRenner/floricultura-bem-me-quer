import {
  Briefcase,
  Cake,
  Gem,
  GraduationCap,
  HandHeart,
  Heart,
  HeartPulse,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type OccasionId =
  | "casamento"
  | "aniversario"
  | "namorados"
  | "recuperacao"
  | "corporativo"
  | "formatura"
  | "luto"
  | "soporque";

export type Occasion = {
  id: OccasionId;
  icon: LucideIcon;
  name: string;
  description: string;
  categories: string[]; // matching product categories
  nameContains?: string; // optional filter by product name
  highlightName?: string; // product name to mark as "Mais pedido"
};

export const OCCASIONS: Occasion[] = [
  {
    id: "casamento",
    icon: Gem,
    name: "Casamento",
    description: "Arranjos e buquês para o dia mais especial",
    categories: ["Arranjos"],
    highlightName: "Arranjo para Noiva",
  },
  {
    id: "aniversario",
    icon: Cake,
    name: "Aniversário",
    description: "Surpreenda quem você ama com flores",
    categories: ["Presentes", "Arranjos"],
  },
  {
    id: "namorados",
    icon: Heart,
    name: "Dia dos Namorados",
    description: "Declare seu amor com as flores certas",
    categories: ["Rosas", "Arranjos"],
  },
  {
    id: "recuperacao",
    icon: HeartPulse,
    name: "Recuperação",
    description: "Flores que trazem alegria e esperança",
    categories: ["Plantas", "Arranjos"],
  },
  {
    id: "corporativo",
    icon: Briefcase,
    name: "Corporativo",
    description: "Presentes florais para clientes e parceiros",
    categories: ["Presentes", "Plantas"],
  },
  {
    id: "formatura",
    icon: GraduationCap,
    name: "Formatura",
    description: "Celebre essa conquista com muito estilo",
    categories: ["Presentes", "Arranjos"],
  },
  {
    id: "luto",
    icon: HandHeart,
    name: "Luto e Condolências",
    description: "Demonstre seu carinho nos momentos difíceis",
    categories: ["Arranjos"],
    nameContains: "Arranjo",
  },
  {
    id: "soporque",
    icon: Sparkles,
    name: "Só porque sim",
    description: "Porque toda ocasião é uma boa ocasião",
    categories: [],
  },
];
