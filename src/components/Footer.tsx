import { useLanguage } from '@/lib/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-slate-200 mt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center space-y-1">
        <p className="text-sm font-semibold text-slate-700">{t('footerMadeBy')}</p>
        <p className="text-sm text-slate-500">{t('footerMentor')}</p>
        <p className="text-sm text-slate-500">{t('footerSchool')}</p>
      </div>
    </footer>
  );
}
