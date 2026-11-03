// Web Audio API & Speech Synthesis for Soundbox feedback
export const playPaymentSuccessChime = (amount?: number) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.12); // A5
    osc1.frequency.setValueAtTime(1174.66, now + 0.24); // D6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(587.33 / 2, now);
    osc2.frequency.setValueAtTime(880 / 2, now + 0.12);
    osc2.frequency.setValueAtTime(1174.66 / 2, now + 0.24);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.75);
    osc2.stop(now + 0.75);

    // Optional Speech Synthesis Voice Announcement (like PhonePe/Paytm Soundbox)
    if (amount && 'speechSynthesis' in window) {
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(`Payment of ${amount} rupees received on HALDER.`);
          utterance.rate = 1.05;
          utterance.pitch = 1.1;
          window.speechSynthesis.speak(utterance);
        } catch {}
      }, 400);
    }
  } catch (e) {
    console.warn('Audio feedback not supported:', e);
  }
};

export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.setValueAtTime(987.77, now + 0.08); // B5

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch {}
};
