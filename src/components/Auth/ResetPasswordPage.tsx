import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Constants for image paths
const IMAGE_PATHS = {
  LOGO_MANTRA: '/assets/logo_mantra.png'
} as const;

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  // Check password strength
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength('weak');
      return;
    }

    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    
    if (newPassword.length >= 8) {
      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasNumbers = /\d/.test(newPassword);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
      
      const criteriaCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
      
      if (criteriaCount >= 3) {
        strength = 'strong';
      } else if (criteriaCount >= 2) {
        strength = 'medium';
      }
    }
    
    setPasswordStrength(strength);
  }, [newPassword]);

  const validateForm = (): boolean => {
    if (!newPassword) {
      setError('Le mot de passe est requis');
      return false;
    }

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    setError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(newPassword);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la réinitialisation du mot de passe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'strong':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 'strong':
        return 'Fort';
      case 'medium':
        return 'Moyen';
      default:
        return 'Faible';
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E2E2E] to-[#3A3A3A] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center animate-scale-in">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe réinitialisé !</h1>
            <p className="text-gray-600">
              Votre mot de passe a été mis à jour avec succès. Vous allez être redirigé vers la page de connexion...
            </p>
          </div>
          <div className="flex justify-center">
            <Loader className="animate-spin h-6 w-6 text-[#A0C800]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E2E2E] to-[#3A3A3A] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md w-full animate-scale-in">
        <div className="text-center mb-8">
          <img src={IMAGE_PATHS.LOGO_MANTRA} alt="Logo" className="mx-auto mb-4 h-20" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Réinitialiser le mot de passe</h1>
          <p className="text-gray-600">Entrez votre nouveau mot de passe</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password Field */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl pl-12 pr-12 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#A0C800] focus:border-[#A0C800] transition-all duration-200"
                placeholder="Entrez votre nouveau mot de passe"
                required
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Force du mot de passe:</span>
                  <span className={`text-xs font-medium ${
                    passwordStrength === 'strong' ? 'text-green-600' :
                    passwordStrength === 'medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {getStrengthText()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
                    style={{
                      width: passwordStrength === 'strong' ? '100%' :
                             passwordStrength === 'medium' ? '66%' : '33%'
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Utilisez au moins 8 caractères avec des majuscules, minuscules, chiffres et symboles
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl pl-12 pr-12 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#A0C800] focus:border-[#A0C800] transition-all duration-200"
                placeholder="Confirmez votre mot de passe"
                required
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4" role="alert">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#A0C800] text-white py-3 px-6 rounded-xl hover:bg-[#8bb400] focus:ring-2 focus:ring-[#A0C800] focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
          >
            {isSubmitting ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-3" />
                Réinitialisation...
              </>
            ) : (
              'Réinitialiser le mot de passe'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm text-[#698714] hover:text-[#5a7511] transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
};
