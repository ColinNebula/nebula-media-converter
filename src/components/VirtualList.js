/**
 * Virtual List - Efficient rendering of large lists
 * Only renders visible items to improve performance
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VirtualList.css';

const VirtualList = ({
  items = [],
  itemHeight = 80,
  containerHeight = 600,
  renderItem,
  overscan = 3,
  emptyMessage = 'No items to display'
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // Calculate visible range
  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleEnd = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Scroll to index
  const scrollToIndex = useCallback((index) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    scrollToIndex(0);
  }, [scrollToIndex]);

  // Performance monitoring
  useEffect(() => {
    console.log(`📊 VirtualList rendering ${visibleItems.length} of ${items.length} items`);
  }, [visibleItems.length, items.length]);

  if (items.length === 0) {
    return (
      <div className="virtual-list-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="virtual-list-container"
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <div className="virtual-list-spacer" style={{ height: totalHeight }}>
        <div
          className="virtual-list-content"
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleStart + index;
            return (
              <div
                key={item.id || actualIndex}
                className="virtual-list-item"
                style={{ height: itemHeight }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Scroll to top button */}
      {scrollTop > containerHeight && (
        <button
          className="virtual-list-scroll-top"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default VirtualList;
