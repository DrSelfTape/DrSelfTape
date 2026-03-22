import {
  BriefcaseIcon,
} from '../assets/icons';
import TvIcon from '../assets/icons/TvIcon';
import FilmIcon from '../assets/icons/FilmIcon';

export const getAuditionTypeIcon = (auditionType) => {
  const type = auditionType?.toLowerCase() || 'others';

  const typeMap = {
    commercial: {
      icon: BriefcaseIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      label: 'Commercial'
    },
    tv_drama: {
      icon: TvIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      label: 'TV Drama'
    },
    film: {
      icon: FilmIcon,
      color: 'text-red-600',
      bg: 'bg-red-100',
      label: 'Film'
    },
    voice_over: {
      icon: BriefcaseIcon,
      color: 'text-green-600',
      bg: 'bg-green-100',
      label: 'Voice Over'
    },
    theatrical: {
      icon: BriefcaseIcon,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      label: 'Theatrical'
    },
    industrial: {
      icon: BriefcaseIcon,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      label: 'Industrial'
    },
    others: {
      icon: BriefcaseIcon,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      label: 'Others'
    },
  };

  return typeMap[type] || typeMap.others;
};
