import { useEffect, useState } from 'react';
import { Globe, ChevronDown } from "lucide-react";

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'or', name: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'as', name: 'অসমীয়া', flag: '🇮🇳' },
  { code: 'ne', name: 'नेपाली', flag: '🇳🇵' },
  { code: 'sd', name: 'سنڌي', flag: '🇵🇰' },
  { code: 'ur', name: 'اردو', flag: '🇮🇳' },
];

const regionToLang = {
  'west bengal': 'bn',
  'tripura': 'bn',
  'andhra pradesh': 'te',
  'telangana': 'te',
  'tamil nadu': 'ta',
  'puducherry': 'ta',
  'kerala': 'ml',
  'lakshadweep': 'ml',
  'karnataka': 'kn',
  'maharashtra': 'mr',
  'gujarat': 'gu',
  'daman and diu': 'gu',
  'dadra and nagar haveli': 'gu',
  'punjab': 'pa',
  'odisha': 'or',
  'orissa': 'or',
  'assam': 'as',
  'uttar pradesh': 'hi',
  'bihar': 'hi',
  'madhya pradesh': 'hi',
  'rajasthan': 'hi',
  'haryana': 'hi',
  'himachal pradesh': 'hi',
  'delhi': 'hi',
  'national capital territory of delhi': 'hi',
  'jharkhand': 'hi',
  'chhattisgarh': 'hi',
  'uttarakhand': 'hi',
  'chandigarh': 'hi',
  'jammu and kashmir': 'hi',
  'ladakh': 'hi',
};

const getActiveLanguageFromCookie = () => {
  const match = document.cookie.match(/googtrans=\/en\/([^;]+)/);
  return match ? match[1] : null;
};

const DirectGoogleTranslate = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const translatePage = (languageCode, isManual = true) => {
    document.cookie = `googtrans=/en/${languageCode}; path=/;`;
    if (isManual) {
      localStorage.setItem('user_manual_lang', languageCode);
    }

    // Try to trigger Google Translate's hidden select element
    const selectElement = document.querySelector('#google_translate_element select');
    if (selectElement) {
      selectElement.value = languageCode;
      selectElement.dispatchEvent(new Event('change'));
      setCurrentLanguage(languageCode);
      setIsDropdownOpen(false);
      return;
    }

    // Fallback: reload to apply cookie
    setCurrentLanguage(languageCode);
    setIsDropdownOpen(false);
    window.location.reload();
  };

  const detectLocationLanguage = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('ipapi response error');
      const data = await response.json();

      if (data.country_code === 'IN' && data.region) {
        const targetLang = regionToLang[data.region.toLowerCase()];
        if (targetLang) {
          localStorage.setItem('user_manual_lang', targetLang);
          translatePage(targetLang, false);
          return;
        }
      }
      localStorage.setItem('user_manual_lang', 'en');
    } catch (error) {
      console.error('Failed to auto-detect regional language:', error);
    }
  };

  useEffect(() => {
    // Initialize Google Translate widget
    const initTranslateElement = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'en,hi,bn,ta,te,ml,kn,mr,gu,pa,or,as,ne,sd,ur',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
          multilanguagePage: true,
        }, 'google_translate_element');
      }
    };

    window.googleTranslateElementInit = initTranslateElement;

    const existingScript = document.getElementById('google-translate-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.head.appendChild(script);
    } else if (window.google && window.google.translate) {
      initTranslateElement();
    }

    // Determine initial language
    const cookieLang = getActiveLanguageFromCookie();
    const savedManualLang = localStorage.getItem('user_manual_lang');

    if (cookieLang) {
      setCurrentLanguage(cookieLang);
    } else if (savedManualLang) {
      setCurrentLanguage(savedManualLang);
      document.cookie = `googtrans=/en/${savedManualLang}; path=/;`;
    } else {
      // First visit: auto-detect from IP
      detectLocationLanguage();
    }
  }, []);

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  return (
    <div className="relative inline-block text-left z-50">
      {/* Hidden Google Translate target */}
      <div
        id="google_translate_element"
        style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
      />

      {/* Trigger button */}
      <button
        type="button"
        className="bg-white hover:bg-agricultural-soft-sand text-agricultural-soil-brown border border-agricultural-stone-gray/20
          rounded-md px-3 py-1.5 font-medium flex items-center gap-2
          shadow-sm transition-all duration-200 hover:shadow
          backdrop-blur-sm bg-white/95 text-sm"
        onClick={() => setIsDropdownOpen(prev => !prev)}
      >
        <Globe className="h-4 w-4 text-agricultural-forest-green" />
        <span>{currentLang ? `${currentLang.flag} ${currentLang.name}` : 'Translate'}</span>
        <ChevronDown className={`h-3 w-3 text-agricultural-stone-gray transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-agricultural-stone-gray/20 overflow-hidden z-50 max-h-72 overflow-y-auto scrollbar-hide">
          <div className="py-1">
            <div className="px-4 py-1.5 text-[10px] font-bold text-agricultural-stone-gray uppercase tracking-wider border-b border-agricultural-stone-gray/10">
              Select Language
            </div>
            {languages.map(language => (
              <button
                key={`${language.code}-${language.name}`}
                type="button"
                onClick={() => translatePage(language.code)}
                className={`w-full text-left px-4 py-2 hover:bg-agricultural-soft-sand transition-all duration-150 flex items-center gap-3 text-xs ${currentLanguage === language.code
                  ? 'bg-agricultural-forest-green/10 text-agricultural-forest-green font-semibold border-r-4 border-agricultural-forest-green'
                  : 'text-agricultural-soil-brown'
                  }`}
              >
                <span className="text-sm">{language.flag}</span>
                <span>{language.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click-away backdrop */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default DirectGoogleTranslate;
