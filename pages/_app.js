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

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [router.pathname]);

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
          <Component {...pageProps} />
        )}
      </Layout>
    </SmoothScroll>
  );
}

