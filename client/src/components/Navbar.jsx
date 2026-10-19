import { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Languages, ShieldAlert, Map, ChevronDown } from 'lucide-react';
import Logo from './Logo';
import { LanguageContext } from '../contexts/LanguageContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage } = useContext(LanguageContext);
  const { t, languages } = useLanguage(language);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const changeLanguage = (langCode) => {
    setLanguage(langCode);
    setShowLangMenu(false);
  };

  const goToEmergency = (event) => {
    event.preventDefault();

    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById('emergency')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return;
    }

    document.getElementById('emergency')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="brand-link"><Logo /></Link>
        <nav className="nav-links">
          <Link className={location.pathname === '/' ? 'active' : ''} to="/">{t('home')}</Link>
          <Link className={location.pathname.startsWith('/beaches') ? 'active' : ''} to="/">{t('explore')}</Link>
          <Link className={location.pathname.startsWith('/safety') ? 'active' : ''} to="/safety"><ShieldAlert size={15}/> {t('safetyCenter')}</Link>
          <Link to="/"><Map size={15}/> {t('safetyMap')}</Link>
        </nav>
        <div className="nav-actions">
          <div className="language-dropdown">
            <button 
              className="lang-toggle" 
              onClick={() => setShowLangMenu(!showLangMenu)}
            >
              <Languages size={16} /> {languages.find(l => l.code === language)?.nativeName || 'English'} <ChevronDown size={14} />
            </button>
            {showLangMenu && (
              <div className="language-menu">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    className={language === lang.code ? 'active' : ''}
                    onClick={() => changeLanguage(lang.code)}
                  >
                    {lang.nativeName}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="nav-emergency" onClick={goToEmergency}>
            <ShieldAlert size={16}/> {t('emergency')}
          </button>
        </div>
      </div>
    </header>
  );
}
