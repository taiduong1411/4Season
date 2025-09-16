import { useCallback, useRef } from "react";

const useNotificationSound = () => {
  const audioContextRef = useRef(null);

  const createNotificationSound = useCallback(() => {
    try {
      // Tạo AudioContext nếu chưa có
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // Phát âm thanh 3 lần
      for (let i = 0; i < 2; i++) {
        const delay = i * 300; // Mỗi lần cách nhau 400ms

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
    // Kiểm tra xem user đã tương tác với trang chưa (yêu cầu của browser)
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      audioContextRef.current.resume().then(() => {
        createNotificationSound();
      });
    } else {
      createNotificationSound();
    }
  }, [createNotificationSound]);

  return { playNotificationSound };
};

export default useNotificationSound;
