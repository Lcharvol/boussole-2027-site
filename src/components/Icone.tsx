// Icônes animées (lucide-animated.com, MIT, sur Motion). L'animation se joue quand on survole ou qu'on
// atteint au clavier l'élément interactif qui contient l'icône (lien, bouton…), pas seulement l'icône.
// Elle est désactivée si le visiteur a demandé de réduire les animations. Sans JavaScript, l'icône
// s'affiche quand même (rendu au build), simplement immobile. Les icônes sont décoratives (aria-hidden).
import { LazyMotion } from 'motion/react';
import { useEffect, useRef, type ComponentType, type RefAttributes } from 'react';
import { ArrowLeftIcon } from './icones/arrow-left';
import { ArrowRightIcon } from './icones/arrow-right';
import { BookTextIcon } from './icones/book-text';
import { CalendarCheckIcon } from './icones/calendar-check';
import { CalendarDaysIcon } from './icones/calendar-days';
import { CheckIcon } from './icones/check';
import { CircleCheckIcon } from './icones/circle-check';
import { CircleHelpIcon } from './icones/circle-help';
import { CompassIcon } from './icones/compass';
import { CopyIcon } from './icones/copy';
import { DownloadIcon } from './icones/download';
import { ExternalLinkIcon } from './icones/external-link';
import { EyeOffIcon } from './icones/eye-off';
import { FingerprintIcon } from './icones/fingerprint';
import { FlaskIcon } from './icones/flask';
import { GaugeIcon } from './icones/gauge';
import { GitCompareArrowsIcon } from './icones/git-compare-arrows';
import { GithubIcon } from './icones/github';
import { GraduationCapIcon } from './icones/graduation-cap';
import { LayersIcon } from './icones/layers';
import { MenuIcon } from './icones/menu';
import { MessageCircleMoreIcon } from './icones/message-circle-more';
import { MoonIcon } from './icones/moon';
import { RotateCCWIcon } from './icones/rotate-ccw';
import { SearchIcon } from './icones/search';
import { SendIcon } from './icones/send';
import { ShieldCheckIcon } from './icones/shield-check';
import { SparklesIcon } from './icones/sparkles';
import { SunIcon } from './icones/sun';
import { UsersIcon } from './icones/users';

interface Poignee {
  startAnimation: () => void;
  stopAnimation: () => void;
}
type Composant = ComponentType<{ size?: number; className?: string } & RefAttributes<Poignee>>;

const ICONES = {
  'arrow-left': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon,
  'book-text': BookTextIcon,
  'calendar-check': CalendarCheckIcon,
  'calendar-days': CalendarDaysIcon,
  'check': CheckIcon,
  'circle-check': CircleCheckIcon,
  'circle-help': CircleHelpIcon,
  'compass': CompassIcon,
  'copy': CopyIcon,
  'download': DownloadIcon,
  'external-link': ExternalLinkIcon,
  'eye-off': EyeOffIcon,
  'fingerprint': FingerprintIcon,
  'flask': FlaskIcon,
  'gauge': GaugeIcon,
  'git-compare-arrows': GitCompareArrowsIcon,
  'github': GithubIcon,
  'graduation-cap': GraduationCapIcon,
  'layers': LayersIcon,
  'menu': MenuIcon,
  'message-circle-more': MessageCircleMoreIcon,
  'moon': MoonIcon,
  'rotate-ccw': RotateCCWIcon,
  'search': SearchIcon,
  'send': SendIcon,
  'shield-check': ShieldCheckIcon,
  'sparkles': SparklesIcon,
  'sun': SunIcon,
  'users': UsersIcon,
} satisfies Record<string, Composant>;

const chargerFonctions = () => import('../lib/fonctions-animation').then((r) => r.default);

export type NomIcone = keyof typeof ICONES;

interface Props {
  nom: NomIcone;
  taille?: number;
  className?: string;
}

export default function Icone({ nom, taille = 20, className }: Props) {
  const ref = useRef<Poignee>(null);
  const conteneur = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const parent = conteneur.current?.closest<HTMLElement>('a, button, summary, label, [data-icone-parent]');
    if (!parent || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const jouer = () => ref.current?.startAnimation();
    const arreter = () => ref.current?.stopAnimation();
    const auClavier = () => {
      if (parent.matches(':focus-visible')) jouer();
    };
    parent.addEventListener('mouseenter', jouer);
    parent.addEventListener('mouseleave', arreter);
    parent.addEventListener('focus', auClavier);
    parent.addEventListener('blur', arreter);
    return () => {
      parent.removeEventListener('mouseenter', jouer);
      parent.removeEventListener('mouseleave', arreter);
      parent.removeEventListener('focus', auClavier);
      parent.removeEventListener('blur', arreter);
    };
  }, []);

  const C = ICONES[nom] as Composant;
  return (
    <span ref={conteneur} aria-hidden="true" className={`inline-flex shrink-0 items-center ${className ?? ''}`}>
      {/* LazyMotion + m : seules les fonctions d'animation utiles sont chargées (bien plus léger que motion). */}
      <LazyMotion features={chargerFonctions} strict>
        <C ref={ref} size={taille} />
      </LazyMotion>
    </span>
  );
}
