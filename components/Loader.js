import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "@/styles/Loader.module.scss";
import Cookies from "js-cookie";

export default function Loader({ onFinish = () => {} }) {
  const [loading, setLoading] = useState(true);
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    // Play the video when component mounts
    if (videoRef.current) {
      // Set playback rate to make the video faster (2.5x speed for quicker loading)
      videoRef.current.playbackRate = 2.5;

      // Add event listener for when video ends
      videoRef.current.addEventListener('ended', () => {
        // First mark the video as ended
        setVideoEnded(true);

        // Then fade out the loader quickly
        setTimeout(() => {
          setLoading(false);
          Cookies.set("hasLoaded", "true");

          // Minimal delay before triggering home page animations
          setTimeout(() => {
            onFinish();
          }, 100);
        }, 500); // Shorter delay for faster transition
      });

      // Start playing the video
      videoRef.current.play().catch(error => {
        console.error("Video playback failed:", error);
        // Fallback in case video fails to play
        setTimeout(() => {
          setVideoEnded(true);
          setTimeout(() => {
            setLoading(false);
            Cookies.set("hasLoaded", "true");
            onFinish();
          }, 500);
        }, 1000);
      });
    }

    return () => {
      // Clean up event listener
      if (videoRef.current) {
        videoRef.current.removeEventListener('ended', () => {});
      }
    };
  }, [onFinish]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          className={styles.loaderContainer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: {
              duration: 0.5,
              ease: "easeInOut"
            }
          }}
        >
          <div className={styles.videoWrapper}>
            <video
              ref={videoRef}
              className={styles.loaderVideo}
              src="/255.mp4"
              muted
              playsInline
            />

            {videoEnded && (
              <motion.div
                className={styles.fadeOverlay}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.5 }
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
