import React, { useState, useEffect } from 'react';
import { getCategoryTitle, type Category } from './types';
interface TitleRollerProps {
  activeCategory: Category;
  direction: 'up' | 'down';
}
export const TitleRoller: React.FC<TitleRollerProps> = ({
  activeCategory,
  direction
}) => {
  const [currentTitle, setCurrentTitle] = useState(getCategoryTitle(activeCategory));
  const [prevTitle, setPrevTitle] = useState(currentTitle);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const newTitle = getCategoryTitle(activeCategory);
    if (newTitle !== currentTitle) {
      setPrevTitle(currentTitle);
      setCurrentTitle(newTitle);
      setTick(t => t + 1);
    }
  }, [activeCategory, currentTitle]);
  const maxLen = Math.max(prevTitle.length, currentTitle.length);
  const chars: {
    oldChar: string;
    newChar: string;
    mode: 'roll' | 'fadeIn' | 'fadeOut' | 'empty';
  }[] = [];
  for (let i = 0; i < maxLen; i++) {
    const oldChar = prevTitle[i] || '';
    const newChar = currentTitle[i] || '';
    if (oldChar && newChar) {
      chars.push({
        oldChar,
        newChar,
        mode: 'roll'
      });
    } else if (!oldChar && newChar) {
      chars.push({
        oldChar,
        newChar,
        mode: 'fadeIn'
      });
    } else if (oldChar && !newChar) {
      chars.push({
        oldChar,
        newChar,
        mode: 'fadeOut'
      });
    } else {
      chars.push({
        oldChar,
        newChar,
        mode: 'empty'
      });
    }
  }
  return <div className="settings-title-roller" key={tick}>
      {chars.map((item, index) => {
      if (item.mode === 'empty') return null;
      const delay = index * 100;
      const isDown = direction === 'down';
      if (item.mode === 'fadeIn') {
        return <span key={`${tick}-${index}`} className={`char-roller char-fade-in ${isDown ? 'char-down' : ''}`} style={{
          animationDelay: `${delay}ms`
        }}>
              {item.newChar}
            </span>;
      }
      if (item.mode === 'fadeOut') {
        return <span key={`${tick}-${index}`} className={`char-roller char-fade-out ${isDown ? 'char-down' : ''}`} style={{
          animationDelay: `${delay}ms`
        }}>
              {item.oldChar}
            </span>;
      }
      return <span key={`${tick}-${index}`} className="char-roller">
            <span className={`char-track ${isDown ? 'char-track-down' : ''}`} style={{
          animationDelay: `${delay}ms`
        }}>
              {isDown ? <>
                  <span className="char-slot">{item.newChar}</span>
                  <span className="char-slot">{item.oldChar}</span>
                </> : <>
                  <span className="char-slot">{item.oldChar}</span>
                  <span className="char-slot">{item.newChar}</span>
                </>}
            </span>
          </span>;
    })}
    </div>;
};