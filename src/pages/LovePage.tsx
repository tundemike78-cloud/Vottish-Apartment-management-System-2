import { useState, useRef, useEffect } from 'react';
import { Heart, Music, Volume2, VolumeX } from 'lucide-react';

export function LovePage() {
  const [showMessage, setShowMessage] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const hearts = document.querySelectorAll('.floating-heart');
    hearts.forEach((heart, index) => {
      (heart as HTMLElement).style.animationDelay = `${index * 0.5}s`;
    });
  }, []);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 overflow-hidden relative">
      <div className="floating-hearts-container absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <Heart
            key={i}
            className="floating-heart absolute text-rose-300/30"
            size={20 + Math.random() * 20}
            fill="currentColor"
            style={{
              left: `${Math.random() * 100}%`,
              animationDuration: `${8 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <button
        onClick={toggleMusic}
        className="fixed top-6 right-6 z-50 bg-white/80 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-all duration-300 hover:scale-110"
        aria-label="Toggle music"
      >
        {isPlaying ? (
          <Volume2 className="text-rose-500" size={24} />
        ) : (
          <VolumeX className="text-rose-400" size={24} />
        )}
      </button>

      <audio ref={audioRef} loop>
        <source src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" type="audio/mpeg" />
      </audio>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-8 relative">
            <div className="glowing-heart inline-block">
              <Heart
                className="text-rose-400 drop-shadow-2xl"
                size={120}
                fill="currentColor"
                strokeWidth={1.5}
              />
            </div>
          </div>

          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-pink-500 to-amber-500 leading-tight">
            For Tolu, With Love 💖
          </h1>

          <p className="font-serif text-xl md:text-3xl lg:text-4xl text-rose-700 mb-12 leading-relaxed max-w-3xl mx-auto italic px-4">
            "Tolu, every heartbeat of mine spells your name."
          </p>

          {!showMessage && (
            <button
              onClick={() => setShowMessage(true)}
              className="group relative bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500 text-white font-serif text-lg md:text-xl px-12 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden"
            >
              <span className="relative z-10">Read My Heart</span>
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </button>
          )}

          {showMessage && (
            <div className="message-reveal mt-12 bg-white/60 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-2xl border border-rose-200/50 max-w-2xl mx-auto">
              <p className="font-serif text-lg md:text-2xl text-gray-700 leading-relaxed italic">
                "From the moment we met, you've been my calm in every storm and my joy in every dawn. I love you endlessly."
              </p>
              <div className="mt-8 pt-6 border-t border-rose-200">
                <p className="font-serif text-rose-600 text-base md:text-lg">
                  Forever yours,
                </p>
                <p className="font-serif text-xl md:text-2xl text-rose-700 font-semibold mt-2">
                  Jose
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 py-6 text-center bg-gradient-to-t from-white/50 to-transparent backdrop-blur-sm z-20">
        <p className="font-serif text-rose-600 text-sm md:text-base">
          Made with ❤️ by Jose, for Tolu.
        </p>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap');

        .font-serif {
          font-family: 'Playfair Display', serif;
        }

        .glowing-heart {
          animation: glow 2s ease-in-out infinite;
          filter: drop-shadow(0 0 20px rgba(251, 113, 133, 0.5));
        }

        @keyframes glow {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 20px rgba(251, 113, 133, 0.5));
          }
          50% {
            transform: scale(1.1);
            filter: drop-shadow(0 0 30px rgba(251, 113, 133, 0.8));
          }
        }

        .floating-heart {
          animation: float linear infinite;
        }

        @keyframes float {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-20vh) rotate(360deg);
            opacity: 0;
          }
        }

        .message-reveal {
          animation: fadeInScale 0.8s ease-out;
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @media (max-width: 640px) {
          .glowing-heart svg {
            width: 80px;
            height: 80px;
          }
        }
      `}</style>
    </div>
  );
}
