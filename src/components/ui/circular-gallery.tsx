'use client';

import React, { useState, useEffect, useRef, useCallback, HTMLAttributes } from 'react';

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

export interface TestimonialVideo {
  videoId: string;
}

interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: TestimonialVideo[];
  radius?: number;
  autoRotateSpeed?: number;
}

const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  ({ items, className, radius = 500, autoRotateSpeed = 0.12, ...props }, ref) => {
    const [rotation, setRotation] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const handleCardTap = useCallback((videoId: string) => {
      setActiveVideoId(videoId);
      setIsPaused(true);
    }, []);

    useEffect(() => {
      const autoRotate = () => {
        if (!isPaused) {
          setRotation(prev => prev + autoRotateSpeed);
        }
        animationFrameRef.current = requestAnimationFrame(autoRotate);
      };

      animationFrameRef.current = requestAnimationFrame(autoRotate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isPaused, autoRotateSpeed]);

    const anglePerItem = 360 / items.length;

    return (
      <div
        ref={ref}
        role="region"
        aria-label="Student testimonials"
        className={cn('relative w-full h-full flex items-center justify-center', className)}
        style={{ perspective: '2000px', touchAction: 'pan-y' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        {...props}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
          }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const totalRotation = rotation % 360;
            const relativeAngle = (itemAngle + totalRotation + 360) % 360;
            const normalizedAngle = Math.abs(relativeAngle > 180 ? 360 - relativeAngle : relativeAngle);
            const opacity = Math.max(0.25, 1 - normalizedAngle / 180);

            return (
              <div
                key={item.videoId}
                role="group"
                aria-label="Student testimonial"
                className="absolute w-[200px] h-[356px]"
                style={{
                  transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                  left: '50%',
                  top: '50%',
                  marginLeft: '-100px',
                  marginTop: '-178px',
                  opacity,
                  transition: 'opacity 0.3s linear',
                }}
              >
                <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl">
                  <iframe
                    src={`https://www.youtube.com/embed/${item.videoId}`}
                    width="200"
                    height="356"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Student testimonial"
                    className="w-full h-full"
                    style={{ border: 'none', display: 'block' }}
                  />
                  {/* Touch overlay: blocks iframe from stealing touch events.
                      First tap activates the video; after that the iframe handles interaction. */}
                  {activeVideoId !== item.videoId && (
                    <div
                      className="absolute inset-0"
                      style={{ touchAction: 'pan-y' }}
                      onClick={() => handleCardTap(item.videoId)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

CircularGallery.displayName = 'CircularGallery';

export { CircularGallery };
