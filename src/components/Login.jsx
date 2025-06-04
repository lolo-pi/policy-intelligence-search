import React, { useState } from 'react';
import './Login.css';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        <form>
          {/* Form fields go here */}
          <button type="submit" className="login-button">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <div className="terms-text">
          By clicking Sign Up, you agree to our{' '}
          <a href="https://www.policyintelligence.ai/termsofuse" target="_blank" rel="noopener noreferrer">
            Terms of Use
          </a>{' '}
          and{' '}
          <a href="https://www.policyintelligence.ai/privacypolicy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          .
        </div>
        <p className="toggle-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button className="toggle-button" onClick={toggleMode}>
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login; 