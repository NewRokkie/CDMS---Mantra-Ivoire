import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Eye, EyeOff, Loader, User, Lock,
  ArrowRight, Shield, Warehouse, Ship, Package
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Constants for image paths
const IMAGE_PATHS = {
  DEPOT_BACKGROUND: '/assets/depot_background.jpg',
  LOGO_WHITE: '/assets/logo_white.png',
  LOGO_MANTRA: '/assets/logo_mantra.png'
} as const;

// Demo accounts configuration
const DEMO_ACCOUNTS = [
  {
    email: 'admin@depot.com',
    role: 'Administrator',
    description: 'Full system access',
    icon: Shield,
    color: 'bg-[#A0C800] hover:bg-[#8bb400]'
  },
  {
    email: 'supervisor@depot.com',
    role: 'Supervisor',
    description: 'Operations oversight',
    icon: Warehouse,
    color: 'bg-[#698714] hover:bg-[#5a7511]'
  },
  {
    email: 'operator@depot.com',
    role: 'Operator',
    description: 'Daily operations',
    icon: Package,
    color: 'bg-[#A0C800] hover:bg-[#8bb400]'
  },
  {
    email: 'client@shipping.com',
    role: 'Client Portal',
    description: 'View containers',
    icon: Ship,
    color: 'bg-[#698714] hover:bg-[#5a7511]'
  }
] as const;

// Features list for the left panel
const FEATURES_LIST = [
  { icon: Warehouse, text: "Gestion en temps réel des conteneurs", aria: "Icône représentant la gestion des conteneurs" },
  { icon: Ship, text: "Suivi automatisé des mouvements", aria: "Icône représentant le suivi des mouvements" },
  { icon: Shield, text: "Sécurité et conformité optimisées", aria: "Icône représentant la sécurité" }
] as const;

export const LoginForm: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // Forgot password local state (indépendant du formulaire de connexion)
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { login, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate email
    if (!email) {
      setEmailError('L\'adresse email est requise');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Format d\'email invalide');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Validate password
    if (!password) {
      setPasswordError('Le mot de passe est requis');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    // Clear previous errors
    setError('');
    setEmailError('');
    setPasswordError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, email, password, login, navigate]);

  const handleDemoLogin = React.useCallback(async (demoEmail: string, demoPassword: string) => {
    if (isSubmitting) return;

    // Clear previous errors
    setError('');
    setEmailError('');
    setPasswordError('');

    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsSubmitting(true);

    try {
      await login(demoEmail, demoPassword);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la connexion démo. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, login, navigate]);

  const handleForgotPassword = React.useCallback(() => {
    setShowForgotPassword(true);
    // Clear both contexts
    setError('');
    setEmailError('');
    setPasswordError('');
    setResetEmail('');
    setResetError('');
    setResetSuccess('');
  }, []);

  const handleBackToLogin = React.useCallback(() => {
    setShowForgotPassword(false);
    // Clear forgot-password local state
    setResetEmail('');
    setResetError('');
    setResetSuccess('');
  }, []);

  const handlePasswordReset = React.useCallback(async () => {
    if (isResetting) return;

    setIsResetting(true);
    setResetError('');
    setResetSuccess('');

    try {
      // Simuler l'envoi d'email de réinitialisation
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
        setResetError('Veuillez fournir une adresse email valide');
        return;
      }

      // Message de démonstration seulement
      setResetSuccess(`Instructions de réinitialisation envoyées à ${resetEmail} (démo)`);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi des instructions');
    } finally {
      setIsResetting(false);
    }
  }, [isResetting, resetEmail]);


  const isProcessing = React.useMemo(() => isLoading || isSubmitting, [isLoading, isSubmitting]);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#2E2E2E] to-[#3A3A3A] flex animate-fade-in">
      {/* Left Column - Yard Depot Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden animate-slide-in-right">
        {/* Gradient de fond Yard Depot */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 50%, #1a1a1a 100%)',
          }}
        >
          {/* Overlays de lisibilité neutres */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/35" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-col justify-between p-12 text-white w-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <img src={IMAGE_PATHS.LOGO_WHITE} alt="Logo" className="mx-auto mb-2 h-16" />
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-lg">
            <div className="mb-6">
              <div className="inline-block bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/40 mb-4 drop-shadow">
                <span className="text-sm font-medium text-white">Container Depot Management System</span>
              </div>
              <h1 className="text-5xl font-bold mb-6 leading-tight drop-shadow-lg">
                Optimisez Votre
                <span className="text-[#A0C800]"> Gestion de Depot</span>
              </h1>
              <p className="text-lg text-white leading-relaxed drop-shadow">
                Système intelligent de gestion de conteneurs conçu pour maximiser l'efficacité opérationnelle
                et réduire les coûts dans vos installations de stockage.
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              {FEATURES_LIST.map((feature, index) => (
                <div key={index} className="flex items-center space-x-4 text-white drop-shadow-sm">
                  <div className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/40">
                    <feature.icon className="h-5 w-5 text-white" aria-label={feature.aria} />
                  </div>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-white/70 text-sm">
            <p>© 2025 Mantra Ivoire - CDMS. Tous droits réservés.</p>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8 bg-white animate-slide-in-up">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,520px)_260px] gap-6 items-start">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-scale-in">
            <div className="text-center mb-8">
              <img src={IMAGE_PATHS.LOGO_MANTRA} alt="Logo" className="mx-auto mb-2 h-20" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue</h1>
              <p className="text-gray-600" id="login-description">Connectez-vous à votre compte</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" aria-labelledby="login-description">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#A0C800] focus:border-[#A0C800] transition-all duration-200 hover:border-gray-400 focus:shadow-lg focus:shadow-[#A0C800]/20"
                    placeholder="Entrez votre email"
                    required
                    disabled={isProcessing}
                    autoComplete="email"
                    aria-describedby="email-description"
                  />
                </div>
              </div>
              {emailError && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {emailError}
                </p>
              )}
              <p id="email-description" className="text-xs text-gray-500 mt-1 sr-only">
                Format attendu: nom@exemple.com
              </p>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl pl-12 pr-12 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#A0C800] focus:border-[#A0C800] transition-all duration-200 hover:border-gray-400 focus:shadow-lg focus:shadow-[#A0C800]/20"
                    placeholder="Entrez votre mot de passe"
                    required
                    disabled={isProcessing}
                    autoComplete="current-password"
                    aria-describedby="password-description"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors touch-target outline-none"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    disabled={isProcessing}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              {passwordError && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {passwordError}
                </p>
              )}
              <p id="password-description" className="text-xs text-gray-500 mt-1 sr-only">
                Mot de passe requis pour l'authentification
              </p>
              </div>

              {/* Error Message (uniquement pour la zone connexion) */}
              {!showForgotPassword && error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-bounce-in" role="alert" aria-live="assertive" aria-atomic="true">
                  <p className="text-sm text-red-600 font-medium flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    {error}
                  </p>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-[#A0C800] text-white py-3 px-6 rounded-xl hover:bg-[#8bb400] focus:ring-2 focus:ring-[#A0C800] focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 interactive touch-target"
                aria-label={isProcessing ? "Connexion en cours" : "Se connecter"}
              >
                {isProcessing ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-3" />
                    Connexion...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Forgot Password Link */}
            {!showForgotPassword && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isProcessing}
                  className="text-sm text-[#698714] hover:text-[#5a7511] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Mot de passe oublié"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            {/* Forgot Password Form */}
            {showForgotPassword && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Mot de passe oublié</h3>
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Retour à la connexion"
                  >
                    <ArrowRight className="h-5 w-5 rotate-180" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Entrez votre adresse email pour recevoir les instructions de réinitialisation.
                </p>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse Email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#A0C800] focus:border-[#A0C800] transition-all duration-200"
                      placeholder="Entrez votre email"
                      disabled={isResetting}
                      autoComplete="email"
                      aria-describedby="reset-email-description"
                    />
                    <p id="reset-email-description" className="sr-only">Saisissez l'adresse email pour réinitialiser votre mot de passe</p>
                  </div>

                  {resetError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3" role="alert" aria-live="assertive">
                      <p className="text-sm text-red-700">{resetError}</p>
                    </div>
                  )}
                  {resetSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3" role="status" aria-live="polite">
                      <p className="text-sm text-green-700">{resetSuccess}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isResetting}
                    className="w-full bg-[#698714] text-white py-3 px-6 rounded-xl hover:bg-[#5a7511] focus:ring-2 focus:ring-[#698714] focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Envoyer les instructions de réinitialisation"
                  >
                    {isResetting ? (
                      <>
                        <Loader className="animate-spin h-5 w-5 mr-3" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        Envoyer les instructions
                        <ArrowRight className="ml-3 h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}



          </div>

          {/* Demo Sidebar (Desktop) */}
          <aside className="hidden lg:block sticky top-8 self-start w-[260px]">
            <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-200 shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Accès Démo (temporaire)</h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_ACCOUNTS.map((account, index) => {
                  const IconComponent = account.icon;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDemoLogin(account.email, 'demo123')}
                      disabled={isProcessing}
                      className={`${account.color} text-white px-3 py-2 rounded-lg hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left`}
                      aria-label={`Connexion démo ${account.role}`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="bg-white/20 p-1 rounded-md">
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold leading-tight">{account.role}</div>
                          <div className="text-[10px] opacity-90 leading-tight">{account.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-500 mt-3">
                Mot de passe démo: <span className="font-mono text-gray-700">demo123</span>
              </p>
            </div>
          </aside>

          {/* Demo Bottom Bar (Mobile) */}
          <div className="lg:hidden fixed bottom-4 inset-x-4 z-30">
            <div className="bg-white/95 backdrop-blur rounded-2xl border border-gray-200 shadow-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-800">Accès Démo (temp.)</span>
                <span className="text-[10px] text-gray-500">mdp: demo123</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((account, index) => {
                  const IconComponent = account.icon;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDemoLogin(account.email, 'demo123')}
                      disabled={isProcessing}
                      className={`${account.color} text-white px-2 py-2 rounded-lg text-left disabled:opacity-50`}
                      aria-label={`Connexion démo ${account.role}`}
                    >
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4 text-white" />
                        <span className="text-[11px] font-semibold truncate">{account.role}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="lg:hidden text-center mt-8 text-sm text-gray-500">
            <p>© 2025 Mantra Ivoire - CDMS. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </div>
  );
});
