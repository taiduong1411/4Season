import { useCallback, useRef } from "react";

const useNotificationSound = () => {
  const audioContextRef = useRef(null);
  const isInitializedRef = useRef(false);

  const initializeAudioContext = useCallback(() => {
    if (!isInitializedRef.current) {
      try {
        console.log("🔊 Initializing AudioContext on user interaction");
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
        isInitializedRef.current = true;
        console.log("🔊 AudioContext initialized successfully");
      } catch (error) {
        console.warn("🔊 Failed to initialize AudioContext:", error);
      }
    } else {
      console.log("🔊 AudioContext already initialized");
    }
  }, []);

  const createNotificationSound = useCallback(() => {
    if (!audioContextRef.current || !isInitializedRef.current) {
      console.warn("🔊 AudioContext not available for sound creation");
      return;
    }

    try {
      console.log("🔊 createNotificationSound - Starting sound creation");

      const audioContext = audioContextRef.current;

      // Phát âm thanh 2 lần
      for (let i = 0; i < 2; i++) {
        const delay = i * 300; // Mỗi lần cách nhau 300ms

        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          // Kết nối các node
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          // Cấu hình âm thanh
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.type = "sine";

          // Tạo hiệu ứng âm thanh "ding" với 2 nốt
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(
            0.3,
            audioContext.currentTime + 0.01
          );
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 0.3
          );

          // Nốt đầu tiên
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);

          // Nốt thứ hai (cao hơn)
          setTimeout(() => {
            const oscillator2 = audioContext.createOscillator();
            const gainNode2 = audioContext.createGain();

            oscillator2.connect(gainNode2);
            gainNode2.connect(audioContext.destination);

            oscillator2.frequency.setValueAtTime(
              1000,
              audioContext.currentTime
            );
            oscillator2.type = "sine";

            gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode2.gain.linearRampToValueAtTime(
              0.3,
              audioContext.currentTime + 0.01
            );
            gainNode2.gain.exponentialRampToValueAtTime(
              0.01,
              audioContext.currentTime + 0.2
            );

            oscillator2.start(audioContext.currentTime);
            oscillator2.stop(audioContext.currentTime + 0.2);
          }, 150);
        }, delay);
      }
    } catch (error) {
      console.warn("Không thể phát âm thanh thông báo:", error);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    console.log("🔊 useNotificationSound - playNotificationSound called");

    // Kiểm tra xem AudioContext đã được initialize chưa
    if (!isInitializedRef.current) {
      console.warn(
        "🔊 AudioContext not initialized, please click on the page first"
      );
      return;
    }

    // Kiểm tra xem user đã tương tác với trang chưa (yêu cầu của browser)
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      console.log("🔊 AudioContext suspended, resuming...");
      audioContextRef.current
        .resume()
        .then(() => {
          createNotificationSound();
        })
        .catch((error) => {
          console.warn("🔊 Failed to resume AudioContext:", error);
          // Fallback: thử phát âm thanh ngay cả khi resume fail
          createNotificationSound();
        });
    } else {
      console.log("🔊 AudioContext ready, creating sound...");
      createNotificationSound();
    }
  }, [createNotificationSound]);

  return { playNotificationSound, initializeAudioContext };
};

export default useNotificationSound;
