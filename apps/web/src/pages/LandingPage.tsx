import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Logo } from '../components/Logo';
import { Mail, Send, Sparkles, Inbox, Shield, Feather, Clock } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  // Floating decorative icons positioned outside the center ~60%
  const floatingIcons = [
    // Top Left quadrant
    { icon: Mail, className: 'top-[12%] left-[8%] md:left-[12%]', size: 28, isMobile: true, color: '#5A4F42' },
    { icon: Sparkles, className: 'top-[28%] left-[5%] md:left-[10%]', size: 24, isMobile: true, color: '#B8A186' },
    { icon: Feather, className: 'top-[50%] left-[4%] md:left-[8%]', size: 26, isMobile: false, color: '#2B241C' },
    { icon: Inbox, className: 'bottom-[15%] left-[8%] md:left-[12%]', size: 30, isMobile: false, color: '#5A4F42' },

    // Top Right & Bottom Right quadrant
    { icon: Send, className: 'top-[15%] right-[8%] md:right-[12%]', size: 28, isMobile: true, color: '#B8A186' },
    { icon: Clock, className: 'top-[32%] right-[5%] md:right-[10%]', size: 24, isMobile: false, color: '#5A4F42' },
    { icon: Shield, className: 'bottom-[25%] right-[6%] md:right-[10%]', size: 26, isMobile: false, color: '#2B241C' },
    { isLogoIcon: true, className: 'bottom-[12%] right-[10%] md:right-[14%]', size: 32, isMobile: true },
  ];

  return (
    <div className="relative min-h-[90vh] bg-paper-50 overflow-hidden flex flex-col items-center justify-center px-6 py-16">
      {/* Radial Gradient Background Blobs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent-400/10 blur-3xl pointer-events-none" />

      {/* Ambient Floating Icons Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingIcons.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <motion.div
              key={index}
              animate={shouldReduceMotion ? {} : { y: [0, -16, 0], rotate: [0, 6, -6, 0] }}
              transition={{
                duration: 6 + (index % 4),
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.4
              }}
              className={`absolute ${item.className} ${item.isMobile ? 'block' : 'hidden md:block'}`}
              style={{ opacity: 0.28 }}
            >
              {item.isLogoIcon ? (
                <Logo showWordmark={false} size={item.size} />
              ) : IconComponent ? (
                <IconComponent size={item.size} color={item.color} />
              ) : null}
            </motion.div>
          );
        })}
      </div>

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
        {/* Logo Mark */}
        <div className="mb-6 transform hover:scale-105 transition-transform">
          <Logo showWordmark={true} size={48} />
        </div>

        {/* Eyebrow */}
        <span className="text-xs font-bold uppercase tracking-widest text-accent-500 bg-accent-400/15 px-3.5 py-1 rounded-full border border-accent-400/30 mb-6">
          AI-POWERED EMAIL, SENT THROUGH YOUR OWN GMAIL
        </span>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-ink-900 tracking-tight leading-tight mb-6">
          Write emails at the speed of thought
        </h1>

        {/* Subhead */}
        <p className="text-base sm:text-lg md:text-xl text-ink-700 max-w-2xl leading-relaxed mb-10">
          prompt/draft → review → send through your connected Gmail account, without leaving the app
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            to="/register"
            className="w-full sm:w-auto py-3.5 px-8 bg-accent-400 hover:bg-accent-500 text-ink-900 font-semibold rounded-xl shadow-lg shadow-accent-400/25 transition-all text-sm text-center"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto py-3.5 px-8 bg-paper-100 hover:bg-paper-200 border border-paper-200 text-ink-900 font-semibold rounded-xl transition-all text-sm text-center"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
};
