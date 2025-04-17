// import { useState, useEffect } from "react";
// import { useTheme } from "@mui/material/styles";
// import useMediaQuery from "@mui/material/useMediaQuery";
// import { motion } from "framer-motion";
// import Image from "next/image";
// import Link from "next/link";
// import AppBar from "@mui/material/AppBar";
// import Drawer from "@mui/material/Drawer";
// import Toolbar from "@mui/material/Toolbar";
// import IconButton from "@mui/material/IconButton";
// import MenuIcon from "@mui/icons-material/Menu";
// import InstagramIcon from "@mui/icons-material/Instagram";
// import Box from "@mui/material/Box";
// import styles from "@/styles/Header.module.scss";

// import RGBLogo from "@/public/images/logo_.svg";

// export default function Header() {
//   const [open, setOpen] = useState(false);
//   const [showHeader, setShowHeader] = useState(false); // Track when to show header
//   const theme = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down("md"));

//   useEffect(() => {
//     // Delay header appearance after the loader (matches the loader duration)
//     const timer = setTimeout(() => {
//       setShowHeader(true);
//     }, 2500);

//     return () => clearTimeout(timer);
//   }, []);

//   const toggleDrawer = (newOpen) => () => {
//     setOpen(newOpen);
//   };

//   const navLinks = [
//     { name: "HOME", path: "/" },
//     { name: "ABOUT", path: "/about" },
//     { name: "WORK", path: "/works" },
//     { name: "CONTACT", path: "/contact" },
//   ];

//   if (!showHeader) return null; // Don't render header until loader is done

//   return (
//     <motion.nav
//       className={styles.header_container}
//       initial={{ y: -100, opacity: 0 }} // Start off-screen
//       animate={{ y: 0, opacity: 1 }} // Slide down
//       transition={{ duration: 0.8, ease: "easeOut" }} // Smooth transition
//     >
//       <AppBar position="fixed" sx={{ backgroundColor: "#000000d0" }}>
//         <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
//           {/* Logo */}
//           <Link href="/" className={styles.logo}>
//             <Image src={RGBLogo} alt="RGB Design Logo" width={100} height={40} priority />
//           </Link>

//           {/* Desktop Navigation */}
//           {!isMobile && (
//             <Box component="ul" className={styles.navLinks}>
//               {navLinks.map(({ name, path }) => (
//                 <li key={name}>
//                   <Link href={path}>{name}</Link>
//                 </li>
//               ))}
//               <Link href="https://www.instagram.com/rgb.designresearch" target="_blank">
//                 <InstagramIcon sx={{ fontSize: 28, marginLeft: 1 }} />
//               </Link>
//             </Box>
//           )}

//           {/* Mobile Menu Icon */}
//           {isMobile && (
//             <IconButton
//               size="large"
//               edge="end"
//               color="inherit"
//               aria-label="menu"
//               onClick={toggleDrawer(true)}
//             >
//               <MenuIcon />
//             </IconButton>
//           )}
//         </Toolbar>
//       </AppBar>

//       {/* Mobile Drawer */}
//       <Drawer anchor="right" open={open} onClose={toggleDrawer(false)}>
//         <Box
//           sx={{ width: 250, padding: "20px" }}
//           role="presentation"
//           onClick={toggleDrawer(false)}
//         >
//           <ul className={styles.drawerMenuContainer}>
//             {navLinks.map(({ name, path }) => (
//               <li key={name}>
//                 <Link href={path}>{name}</Link>
//               </li>
//             ))}
//             <Link href="https://www.instagram.com/rgb.designresearch" target="_blank">
//               <InstagramIcon sx={{ fontSize: 30 }} />
//             </Link>
//           </ul>
//         </Box>
//       </Drawer>
//     </motion.nav>
//   );
// }



import { useState, useEffect } from "react";
import { useRouter } from "next/router"; // ✅ Import useRouter

import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import InstagramIcon from "@mui/icons-material/Instagram";
import styles from "@/styles/Header.module.scss";
import RGBLogo from "@/public/images/logo_.svg";

export default function Header() {
  const router = useRouter();
  const isWorkShowcase = router.pathname === "/WorksShowcase";
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showHeader, setShowHeader] = useState(false); // Controls header animation
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Simulate a loader completion (replace with actual loader logic)
    setTimeout(() => {
      setShowHeader(true);
    }, 2000); // Adjust time based on your loader duration
  }, []);

  const navLinks = [
    { name: "home", path: "/" },
    { name: "ABOUT", path: "/about" },
    { name: "WORK", path: "/works" },
    { name: "CONTACT", path: "/contact" },
  ];

  const menuVariants = {
    closed: {
      x: "100%",
      transition: {
        type: "tween",
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    open: {
      x: 0,
      transition: {
        type: "tween",
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const linkVariants = {
    closed: { x: 50, opacity: 0 },
    open: (i) => ({
      x: 0,
      opacity: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    })
  };

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <AnimatePresence>
      {showHeader && (
        <motion.header
        className={`${styles.header} ${scrolled ? styles.scrolled : ""} ${isWorkShowcase ? styles.relative : ""}`}
        initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className={styles.container}>
            <Link href="/">
              <motion.div
                whileHover={{ scale: 1.05, rotate: -2 }}
                transition={{ duration: 0.3 }}
                className={styles.logo}
              >
                <Image
                  src={RGBLogo}
                  alt="RGB Design Logo"
                  width={100}
                  height={40}
                  priority
                />
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <nav className={styles.nav}>
              {navLinks.map(({ name, path }) => (
                <Link key={name} href={path} className={styles.link}>
                  {name}
                </Link>
              ))}
              <Link
                href="https://www.instagram.com/rgb.designresearch"
                target="_blank"
                className={styles.social}
              >
                <InstagramIcon sx={{ fontSize: 24 }} />
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                onClick={toggleMenu}
                sx={{
                  color: "white",
                  background: isOpen ? "rgba(255,255,255,0.1)" : "transparent",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background: "rgba(255,255,255,0.2)",
                  }
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className={styles.mobileMenu}
                initial="closed"
                animate="open"
                exit="closed"
                variants={menuVariants}
              >
                <div className={styles.closeButton} onClick={toggleMenu}>
                  <div className={styles.closeIcon} />
                </div>

                <nav className={styles.mobileNav}>
                  {navLinks.map(({ name, path }, i) => (
                    <motion.div
                      key={name}
                      custom={i}
                      variants={linkVariants}
                      initial="closed"
                      animate="open"
                    >
                      <Link
                        href={path}
                        className={styles.link}
                        onClick={toggleMenu}
                      >
                        {name}
                      </Link>
                    </motion.div>
                  ))}
                  <motion.div
                    variants={linkVariants}
                    custom={navLinks.length}
                    initial="closed"
                    animate="open"
                  >
                    <Link
                      href="https://www.instagram.com/rgb.designresearch"
                      target="_blank"
                      className={styles.socialMobile}
                      onClick={toggleMenu}
                    >
                      <InstagramIcon />
                    </Link>
                  </motion.div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>
      )}
    </AnimatePresence>
  );
}
