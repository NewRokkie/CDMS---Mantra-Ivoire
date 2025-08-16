import React, { useState } from 'react';
import { Container, Eye, EyeOff, Loader, User, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setError('');
    setIsSubmitting(true);
    console.log('Form submitted, attempting login...');
    
    try {
      await login(email, password);
      console.log('Login successful, should redirect to dashboard');
      // The redirect happens automatically via App.tsx when isAuthenticated becomes true
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      console.log('Login process completed');
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    if (isSubmitting) return;
    
    console.log('Demo login for:', demoEmail);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setIsSubmitting(true);
    
    try {
      await login(demoEmail, demoPassword);
      console.log('Demo login successful');
    } catch (err) {
      console.error('Demo login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const demoAccounts = [
    { 
      email: 'admin@depot.com', 
      role: 'Administrator', 
      description: 'Full system access',
      color: 'bg-red-500 hover:bg-red-600'
    },
    { 
      email: 'supervisor@depot.com', 
      role: 'Supervisor', 
      description: 'Operations oversight',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    { 
      email: 'operator@depot.com', 
      role: 'Operator', 
      description: 'Daily operations',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    { 
      email: 'client@shipping.com', 
      role: 'Client Portal', 
      description: 'View containers',
      color: 'bg-green-500 hover:bg-green-600'
    }
  ];

  const isProcessing = isLoading || isSubmitting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Container className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DepotManager</h1>
          <p className="text-gray-600">Container Depot Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                 className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                  required
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                 className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                  required
                  disabled={isProcessing}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isProcessing}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Quick Demo Access</h3>
          <div className="space-y-3">
            {demoAccounts.map((account, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleDemoLogin(account.email, 'demo123')}
                disabled={isProcessing}
                className={`w-full text-left p-4 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${account.color}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{account.role}</div>
                    <div className="text-sm opacity-90">{account.description}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 opacity-75" />
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            All demo accounts use password: <span className="font-mono">demo123</span>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2025 DepotManager. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};