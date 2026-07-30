import { useState, useEffect } from "react";

export function useStreak() {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem("ov_streak_data");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const lastReadDate = new Date(data.lastRead);
        const today = new Date();
        
        lastReadDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        const diffTime = Math.abs(today.getTime() - lastReadDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 0 || diffDays === 1) {
          setStreak(data.count);
        } else {
          setStreak(0);
          localStorage.setItem("ov_streak_data", JSON.stringify({ count: 0, lastRead: new Date().toISOString() }));
        }
      } catch (e) {
        console.error("Failed to parse streak data");
      }
    }
  }, []);

  const incrementStreak = () => {
    const saved = localStorage.getItem("ov_streak_data");
    let currentCount = 0;
    let lastReadDate = new Date(0);

    if (saved) {
      try {
        const data = JSON.parse(saved);
        currentCount = data.count || 0;
        lastReadDate = new Date(data.lastRead);
      } catch (e) {}
    }

    const today = new Date();
    lastReadDate.setHours(0, 0, 0, 0);
    const todayNormalized = new Date(today);
    todayNormalized.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(todayNormalized.getTime() - lastReadDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    let newCount = currentCount;
    
    if (diffDays === 0 && currentCount > 0) {
      return;
    } else if (diffDays <= 1 || currentCount === 0) {
      newCount = currentCount + 1;
    } else {
      newCount = 1;
    }

    setStreak(newCount);
    localStorage.setItem("ov_streak_data", JSON.stringify({ count: newCount, lastRead: new Date().toISOString() }));
  };

  return { streak, incrementStreak };
}
