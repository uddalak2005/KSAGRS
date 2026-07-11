import { useState } from 'react';
import { MapPin, User, Phone, Leaf } from "lucide-react";
import { signUpUser } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

const AuthDialog = ({ isOpen, onClose, onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginFormData, setLoginFormData] = useState({
    email: '',
    password: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    totalLand: '',
    locationLat: '',
    locationLong: '',
    crops: '',
    aadhar: '',
  });

  const navigate = useNavigate();

  const getLocationAndUpdate = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          locationLat: latitude.toString(),
          locationLong: longitude.toString()
        }));
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to get your location. Please check your browser permissions.");
      }
    );
  };

  const handleSignup = async () => {
    setError('');
    setLoading(true);
    try {
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        totalLand: parseFloat(formData.totalLand) || parseFloat(formData.landSize) || 5,
        locationLat: parseFloat(formData.locationLat) || 22.572645,
        locationLong: parseFloat(formData.locationLong) || 88.363892,
        crops: formData.crops
          ? formData.crops.split(',').map(c => c.trim()).filter(Boolean)
          : ['Rice'],
        aadhar: formData.aadhar || '000000000000',
      };

      const user = await signUpUser(registrationData);
      console.log("Registration successful:", user);
      if (onRegister) onRegister(user);
      onClose();
      navigate('/dashboard');
    } catch (err) {
      console.error("Registration error:", err.message);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await onLogin(loginFormData.email, loginFormData.password);
      onClose();
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-lg border bg-agricultural-soft-sand border-agricultural-stone-gray/20 p-6 shadow-lg sm:max-w-md overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M18 6L6 18"></path>
            <path d="M6 6L18 18"></path>
          </svg>
          <span className="sr-only">Close</span>
        </button>

        <div
          className="absolute inset-0 opacity-10 bg-cover bg-center rounded-lg"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1500076656116-558758c991c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80")' }}
        />

        <div className="relative z-10">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Leaf className="h-8 w-8 text-agricultural-forest-green" />
              <h2 className="text-2xl font-bold text-agricultural-soil-brown">AgroSure</h2>
            </div>
            <p className="text-agricultural-stone-gray">
              {isLogin ? 'Welcome back to your farming journey' : 'Start your farming journey with us'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="grid w-full grid-cols-2 mb-6 bg-white rounded-md p-1">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${isLogin ? 'bg-agricultural-forest-green text-white' : 'text-agricultural-stone-gray hover:text-agricultural-soil-brown'}`}
            >
              Login
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${!isLogin ? 'bg-agricultural-forest-green text-white' : 'text-agricultural-stone-gray hover:text-agricultural-soil-brown'}`}
            >
              Register
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col space-y-4">
            {/* LOGIN FORM */}
            {isLogin && (
              <>
                <div className="space-y-2">
                  <label htmlFor="loginEmail" className="text-agricultural-soil-brown font-medium text-sm block">Email Address</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-agricultural-stone-gray" />
                    <input
                      id="loginEmail"
                      type="email"
                      placeholder="Enter your email address"
                      className="flex h-10 w-full rounded-md border border-agricultural-stone-gray/30 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agricultural-forest-green pl-10"
                      value={loginFormData.email}
                      onChange={(e) => setLoginFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="loginPassword" className="text-agricultural-soil-brown font-medium text-sm block">Password</label>
                  <input
                    id="loginPassword"
                    type="password"
                    placeholder="Enter your password"
                    className="flex h-10 w-full rounded-md border border-agricultural-stone-gray/30 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agricultural-forest-green"
                    value={loginFormData.password}
                    onChange={(e) => setLoginFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </>
            )}

            {/* REGISTER FORM */}
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label htmlFor="regName" className="text-agricultural-soil-brown font-medium text-sm block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-agricultural-stone-gray" />
                    <input
                      id="regName"
                      placeholder="Enter your full name"
                      className="flex h-10 w-full rounded-md border border-agricultural-stone-gray/30 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agricultural-forest-green pl-10"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="regEmail" className="text-agricultural-soil-brown font-medium text-sm block">Email Address</label>
                  <input
                    id="regEmail"
                    type="email"
                    placeholder="Enter your email"
                    className="flex h-10 w-full rounded-md border border-agricultural-stone-gray/30 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agricultural-forest-green"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="regPhone" className="text-agricultural-soil-brown font-medium text-sm block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-agricultural-stone-gray" />
                    <input
                      id="regPhone"
                      placeholder="+91 98765 43210"
                      className="flex h-10 w-full rounded-md border border-agricultural-stone-gray/30 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agricultural-forest-green pl-10"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="regLand" className="text-agricultural-soil-brown font-medium text-sm block">Land Size (Acres)</label>
                  <input
                    id="regLand"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 12.5"
                    className="flex h-10 w-full rounded-md border border-agricultural-stone-gray/30 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agricultural-forest-green"
                    value={formData.totalLand}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalLand: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="regAadhar" className="text-agricultural-soil-brown font-medium text-sm block">Aadhar Number</label>
                  <input
                    id="regAadhar"
                    type="text"
                    maxLength={12}
                    placeholder="12-digit Aadhar number"
                    className="flex h-10 w-full rounded-md border border-agricultural-stone-gray/30 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agricultural-forest-green"
                    value={formData.aadhar}
                    onChange={(e) => setFormData(prev => ({ ...prev, aadhar: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      id="locationCheckbox"
                      type="checkbox"
                      className="h-4 w-4 text-agricultural-forest-green focus:ring-agricultural-forest-green border-agricultural-stone-gray/30 rounded"
                      onChange={(e) => { if (e.target.checked) getLocationAndUpdate(); }}
                    />
                    <label htmlFor="locationCheckbox" className="text-agricultural-soil-brown font-medium text-sm">
                      📍 Use my current location
                    </label>
                  </div>
                  {(formData.locationLat && formData.locationLong) && (
                    <p className="text-xs text-agricultural-stone-gray">
                      Location captured: {parseFloat(formData.locationLat).toFixed(4)}, {parseFloat(formData.locationLong).toFixed(4)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="regCrops" className="text-agricultural-soil-brown font-medium text-sm block">Crops Grown</label>
                  <input
                    id="regCrops"
                    placeholder="e.g., Wheat, Rice, Cotton"
                    className="flex h-10 w-full rounded-md border border-agricultural-stone-gray/30 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agricultural-forest-green"
                    value={formData.crops}
                    onChange={(e) => setFormData(prev => ({ ...prev, crops: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="regPassword" className="text-agricultural-soil-brown font-medium text-sm block">Create Password</label>
                  <input
                    id="regPassword"
                    type="password"
                    placeholder="Create a secure password"
                    className="flex h-10 w-full rounded-md border border-agricultural-stone-gray/30 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agricultural-forest-green"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
              </>
            )}

            <button
              type="button"
              disabled={loading}
              className="w-full mt-2 bg-agricultural-forest-green hover:bg-agricultural-crop-green disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-md transition-all duration-300"
              onClick={isLogin ? handleLoginSubmit : handleSignup}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Login to Dashboard' : 'Create Account')}
            </button>
          </div>

          <div className="text-center mt-4 text-sm text-agricultural-stone-gray">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-agricultural-forest-green hover:underline font-medium"
            >
              {isLogin ? 'Register here' : 'Login here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDialog;