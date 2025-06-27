import React, { useState } from 'react';
import { Anchor, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('admin@depot.com');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || isLoading) {
      console.log('Login already in progress, ignoring duplicate request');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      console.log('Attempting login with:', email);
      await login(email, password);
      console.log('Login completed successfully');
      // The authentication state change will automatically trigger the redirect
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccountClick = (demoEmail: string, demoPassword: string) => {
    if (isSubmitting || isLoading) {
      console.log('Cannot select demo account while login is in progress');
      return;
    }
    
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(''); // Clear any existing errors
  };
  
  const demoAccounts = [
    { email: 'admin@depot.com', role: 'Administrator', password: 'demo123', description: 'Full system access' },
    { email: 'supervisor@depot.com', role: 'Supervisor', password: 'demo123', description: 'Operations management' },
    { email: 'operator@depot.com', role: 'Operator', password: 'demo123', description: 'Daily operations' },
    { email: 'client@shipping.com', role: 'Client Portal', password: 'demo123', description: 'View your containers only' },
    { email: 'client2@maersk.com', role: 'Maersk Client', password: 'demo123', description: 'Maersk container access' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Anchor className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">DepotManager</h1>
          <p className="text-blue-200">Container Depot Management System</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your email"
                required
                disabled={isSubmitting || isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                  placeholder="Enter your password"
                  required
                  disabled={isSubmitting || isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting || isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading || isSubmitting ? (
                <>
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-white font-medium mb-4">Demo Accounts</h3>
          <div className="space-y-2">
            {demoAccounts.map((account, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleDemoAccountClick(account.email, account.password)}
                disabled={isLoading || isSubmitting}
                className="w-full text-left p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{account.role}</p>
                    <p className="text-blue-200 text-sm">{account.email}</p>
                    <p className="text-blue-300 text-xs">{account.description}</p>
                  </div>
                  <span className="text-blue-200 text-xs">Click to use</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-blue-200 text-xs mt-4">
            Password for all demo accounts: <span className="font-mono bg-white/20 px-2 py-1 rounded">demo123</span>
          </p>
        </div>
      </div>
    </div>
  );
};