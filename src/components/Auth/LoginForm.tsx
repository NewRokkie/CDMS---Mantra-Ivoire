import React, { useState } from 'react';
import { Anchor, Eye, EyeOff, Loader, ArrowRight, Shield, Users, Building, Globe } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('admin@depot.com');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
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
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoAccountClick = (demoEmail: string, demoPassword: string, accountType: string) => {
    if (isSubmitting || isLoading) {
      console.log('Cannot select demo account while login is in progress');
      return;
    }
    
    setSelectedDemo(accountType);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    
    // Auto-clear selection after animation
    setTimeout(() => setSelectedDemo(null), 1000);
  };
  
  const demoAccounts = [
    { 
      email: 'admin@depot.com', 
      role: 'Administrator', 
      password: 'demo123', 
      description: 'Full system access & management',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      type: 'admin'
    },
    { 
      email: 'supervisor@depot.com', 
      role: 'Supervisor', 
      password: 'demo123', 
      description: 'Operations oversight & validation',
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      type: 'supervisor'
    },
    { 
      email: 'operator@depot.com', 
      role: 'Operator', 
      password: 'demo123', 
      description: 'Daily operations & gate management',
      icon: Building,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      type: 'operator'
    },
    { 
      email: 'client@shipping.com', 
      role: 'Client Portal', 
      password: 'demo123', 
      description: 'View containers & release orders',
      icon: Globe,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      type: 'client'
    },
    { 
      email: 'client2@maersk.com', 
      role: 'Maersk Client', 
      password: 'demo123', 
      description: 'Maersk container access portal',
      icon: Globe,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-700',
      type: 'maersk'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className={`absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="0.1"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]`}></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-24 h-24 bg-indigo-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-10 w-16 h-16 bg-purple-200 rounded-full opacity-20 animate-pulse delay-500"></div>

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding & Info */}
        <div className="hidden lg:block space-y-8 px-8">
          <div className="space-y-6">
            {/* Logo & Title */}
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <Anchor className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent leading-tight">
                  DepotManager
                </h1>
                <p className="text-xl text-gray-600 font-medium mt-2">
                  Container Depot Management System
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Powerful Features</h3>
              <div className="space-y-3">
                {[
                  { icon: Building, text: 'Real-time Container Tracking' },
                  { icon: Users, text: 'Multi-role Access Control' },
                  { icon: Globe, text: 'EDI Integration & Automation' },
                  { icon: Shield, text: 'Enterprise Security' }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3 text-gray-700">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <feature.icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              {[
                { number: '1,248', label: 'Containers' },
                { number: '23', label: 'Active Users' },
                { number: '99.9%', label: 'Uptime' }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl mb-4 shadow-xl">
              <Anchor className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DepotManager</h1>
            <p className="text-gray-600">Container Depot Management</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="text-gray-600">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div className="relative group">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-gray-900 placeholder-gray-500"
                    placeholder="Enter your email address"
                    required
                    disabled={isSubmitting || isLoading}
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative group">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-gray-900 placeholder-gray-500 pr-12"
                    placeholder="Enter your password"
                    required
                    disabled={isSubmitting || isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    disabled={isSubmitting || isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 animate-shake">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading || isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading || isSubmitting ? (
                  <>
                    <Loader className="animate-spin h-5 w-5 mr-3" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Demo Accounts */}
          <div className="mt-8 bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Try Demo Accounts</h3>
              <p className="text-sm text-gray-600">Click any account below to auto-fill credentials</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demoAccounts.map((account, index) => {
                const Icon = account.icon;
                const isSelected = selectedDemo === account.type;
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleDemoAccountClick(account.email, account.password, account.type)}
                    disabled={isLoading || isSubmitting}
                    className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 text-left hover:shadow-lg transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected 
                        ? `${account.bgColor} border-current ${account.textColor} shadow-lg scale-105` 
                        : 'bg-white/50 border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        isSelected 
                          ? 'bg-white shadow-md' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <Icon className={`h-4 w-4 transition-colors duration-300 ${
                          isSelected ? account.textColor : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{account.role}</p>
                        <p className="text-xs opacity-75 truncate">{account.description}</p>
                        <p className="text-xs font-mono mt-1 opacity-60 truncate">{account.email}</p>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                All demo accounts use password: <span className="font-mono bg-gray-100 px-2 py-1 rounded font-semibold">demo123</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>© 2025 DepotManager. All rights reserved.</p>
            <p className="mt-1">Secure • Reliable • Professional</p>
          </div>
        </div>
      </div>
    </div>
  );
};