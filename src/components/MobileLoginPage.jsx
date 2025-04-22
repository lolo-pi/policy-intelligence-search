import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MobileLoginPage.css';
import piLogo from '../assets/PI_Logo_2024.png';
import { AuthContext } from '../context/AuthContext';

const MobileLoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword } = useContext(AuthContext);
  const navigate = useNavigate();

  // Load saved credentials on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleRememberMeChange = (e) => {
    const isChecked = e.target.checked;
    setRememberMe(isChecked);
    if (!isChecked) {
      // Clear saved credentials if remember me is unchecked
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
    }
  };

  const handleForgotPassword = () => {
    setShowResetPassword(true);
    setError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (confirmPassword && e.target.value !== confirmPassword) {
      setPasswordMatchError('Passwords do not match');
    } else {
      setPasswordMatchError('');
    }
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (password && e.target.value !== password) {
      setPasswordMatchError('Passwords do not match');
    } else {
      setPasswordMatchError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (showConfirmation) {
        await confirmSignUp(email, confirmationCode);
        setShowConfirmation(false);
        setIsLogin(true);
        return;
      }

      if (showResetPassword) {
        if (!email) {
          setError('Please enter your login name');
          return;
        }
        await resetPassword(email);
        setShowResetPassword(false);
        setError('');
        setShowConfirmation(true);
        return;
      }

      if (isLogin) {
        await signIn(email, password);
        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedPassword', password);
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }
        navigate('/');
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        if (!firstName.trim() || !lastName.trim()) {
          setError('First name and last name are required');
          return;
        }
        await signUp(email, password, {
          email,
          given_name: firstName.trim(),
          family_name: lastName.trim()
        });
        setShowConfirmation(true);
      }
    } catch (error) {
      setError(error.message || 'An error occurred');
    }
  };

  const renderResetPasswordForm = () => (
    <form className="login-form" onSubmit={handleSubmit}>
      <p className="confirmation-text">Please enter your login name to receive a password reset code.</p>
      <div className="input-group">
        <input
          type="email"
          placeholder="Login name"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-form-input"
          required
        />
      </div>
      <button type="submit" className="login-form-button">Recover Password</button>
      <div className="back-to-login">
        <button
          type="button"
          onClick={() => {
            setShowResetPassword(false);
            setError('');
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );

  const renderConfirmationForm = () => (
    <form onSubmit={handleSubmit}>
      <h1>Verify Your Email</h1>
      <p className="confirmation-text">Please enter the verification code sent to your email.</p>
      <div className="input-group">
        <input
          type="text"
          placeholder="Verification Code"
          value={confirmationCode}
          onChange={(e) => setConfirmationCode(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="login-button">Verify Account</button>
    </form>
  );

  const renderForm = () => (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error-message">{error}</div>
      )}
      {!isLogin && (
        <>
          <div className="input-group">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required={!isLogin}
            />
          </div>
          <div className="input-group">
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required={!isLogin}
            />
          </div>
        </>
      )}
      <div className="input-group">
        <input
          type="email"
          placeholder="Login name"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="input-group">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={handlePasswordChange}
          required
        />
        <button 
          type="button" 
          className={`password-toggle ${showPassword ? 'active' : ''}`}
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z" fill="currentColor"/>
            <path d="M12 9C14.21 9 16 10.79 16 13C16 15.21 14.21 17 12 17C9.79 17 8 15.21 8 13C8 10.79 9.79 9 12 9Z" fill="white"/>
            {!showPassword && <path d="M1 1L23 23" stroke="white" strokeWidth="2" strokeLinecap="round"/>}
          </svg>
        </button>
      </div>
      {!isLogin && (
        <>
          <div className="input-group">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
            />
            <span className={`password-warning ${passwordMatchError ? 'visible' : ''}`}>⚠️</span>
          </div>
        </>
      )}
      {isLogin && (
        <>
          <div className="login-options">
            <div className="remember-me-container">
              <label className="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={handleRememberMeChange}
                  className="remember-me-checkbox"
                />
                <span className="remember-me-text">Remember me</span>
              </label>
            </div>
            <div className="forgot-password">
              <button type="button" onClick={handleForgotPassword} className="forgot-password-link">
                Forgot password?
              </button>
            </div>
          </div>
          <button type="submit" className="login-button">
            Log in
          </button>
          <div className="divider">
            <span>OR</span>
          </div>
          <button 
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
              setFirstName('');
              setLastName('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="create-account-button"
          >
            Create new account
          </button>
        </>
      )}
      {!isLogin && (
        <>
          <button type="submit" className="login-button">
            Sign Up
          </button>
          <div className="back-to-login">
            <button 
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError('');
                setFirstName('');
                setLastName('');
                setPassword('');
                setConfirmPassword('');
              }}
            >
              Back to login
            </button>
          </div>
        </>
      )}
    </form>
  );

  return (
    <div className="mobile-login">
      <div className="login-content">
        <img src={piLogo} alt="Policy Intelligence Logo" className="login-logo" />
        <p className="subtitle">Revolutionizing policy access</p>
        <h1 className={showResetPassword ? 'reset-password' : ''}>
          {showResetPassword ? 'Reset your password' : showConfirmation ? 'Verify your account' : isLogin ? 'Login to your account' : 'Create your account'}
        </h1>
        {showResetPassword ? renderResetPasswordForm() : showConfirmation ? renderConfirmationForm() : renderForm()}
      </div>
    </div>
  );
};

export default MobileLoginPage; 