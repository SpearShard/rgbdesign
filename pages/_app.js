// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import Layout from "@/components/Layout";
// import SmoothScroll from "@/components/SmoothScroll";
// import Loader from "@/components/Loader";
// import Cookies from "js-cookie";
// import "@/styles/globals.scss";

// export default function App({ Component, pageProps }) {
//   const [hasLoaded, setHasLoaded] = useState(null);
//   const [isMounted, setIsMounted] = useState(false);
//   const router = useRouter();

//   useEffect(() => {
//     setIsMounted(true);

//     const cookieExists = Cookies.get("hasLoaded");
//     console.log("Cookie exists:", cookieExists);

//     if (!cookieExists) {
//       console.log("Showing Loader");
//       setHasLoaded(false); // Show loader
//     } else {
//       console.log("Skipping Loader");
//       setHasLoaded(true);
//     }

//     // ✅ Automatically clear cookie & log in console on page reload
//     const handleBeforeUnload = () => {
//       console.log(
//         'Executing: document.cookie = "hasLoaded=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"'
//       );
//       document.cookie = "hasLoaded=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
//     };

//     window.addEventListener("beforeunload", handleBeforeUnload);

//     return () => {
//       window.removeEventListener("beforeunload", handleBeforeUnload);
//     };
//   }, []);

//   if (!isMounted) return null; // Prevents hydration issues

//   return (
//     <SmoothScroll>
//       <Layout>
//         {hasLoaded === false ? (
//           <Loader
//             onFinish={() => {
//               console.log("hasLoaded:", hasLoaded, "isMounted:", isMounted);
//               Cookies.set("hasLoaded", "true", { expires: 1 });
//               setHasLoaded(true);
//             }}
//           />
//         ) : (
//           <Component {...pageProps} />
//         )}
//       </Layout>
//     </SmoothScroll>
//   );
// }




import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import SmoothScroll from "@/components/SmoothScroll";
import Loader from "@/components/Loader";
import Cookies from "js-cookie";
import "@/styles/globals.scss";
import dynamic from "next/dynamic";

// Dynamically import the index page as the home page to avoid SSR issues with animations
const HomePage = dynamic(() => import('./index'), { ssr: false, loading: () => null });

// Disable Next.js page transition delay
if (typeof window !== 'undefined') {
  // Force instant page transitions
  window.__NEXT_DATA__.gssp = true;
  window.__NEXT_DATA__.ssr = false;
}

export default function App({ Component, pageProps }) {
  const [hasLoaded, setHasLoaded] = useState(true); // Default to true (no loader)
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);

    // ✅ Only show loader if on the home page ("/")
    if (router.pathname === "/") {
      const cookieExists = Cookies.get("hasLoaded");
      console.log("Cookie exists:", cookieExists);

      if (!cookieExists) {
        console.log("Showing Loader");
        setHasLoaded(false); // Show loader only on the home page
      } else {
        console.log("Skipping Loader");
        setHasLoaded(true);
      }
    }

    // ✅ Automatically clear cookie & log in console on page reload
    const handleBeforeUnload = () => {
      if (router.pathname === "/") {
        console.log(
          'Executing: document.cookie = "hasLoaded=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"'
        );
        document.cookie = "hasLoaded=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    };

    // Optimize page transitions
    const handleRouteChangeStart = () => {
      // Preload the next page content
      document.body.style.cursor = 'wait';
    };

    const handleRouteChangeComplete = () => {
      // Reset cursor when page load is complete
      document.body.style.cursor = '';
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      // Clean up all event listeners
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router.pathname, router.events]);

  if (!isMounted) return null; // Prevents hydration issues

  return (
    <SmoothScroll>
      <Layout>
        {hasLoaded === false && router.pathname === "/" ? (
          <Loader
            onFinish={() => {
              console.log("Loader Finished.");
              Cookies.set("hasLoaded", "true", { expires: 1 });
              setHasLoaded(true);
            }}
          />
        ) : (
          <>
            {router.pathname === "/" ? (
              <HomePage />
            ) : (
              <Component {...pageProps} />
            )}
          </>
        )}
      </Layout>
    </SmoothScroll>
  );
}

