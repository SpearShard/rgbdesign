import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";
import { useRouter } from "next/router";

const SmoothScroll = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    // Create Lenis smooth scroll instance with optimized settings
    const lenis = new Lenis({
      duration: 1.0, // Reduced duration for faster scrolling
      smooth: true,
      smoothTouch: false, // Disable on touch devices for better performance
      touchMultiplier: 1.5, // Make touch scrolling more responsive
      infinite: false,
    });

    // Optimize the animation frame
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Handle route changes - stop scrolling during transitions
    const handleRouteChangeStart = () => {
      // Stop smooth scrolling during page transitions
      lenis.stop();
    };

    const handleRouteChangeComplete = () => {
      // Resume smooth scrolling after transition
      lenis.start();

      // Scroll to top instantly on page change
      window.scrollTo(0, 0);
    };

    // Add router event listeners
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      // Clean up event listeners and destroy lenis
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      lenis.destroy();
    };
  }, [router]);

  return <>{children}</>;
};

export default SmoothScroll;
