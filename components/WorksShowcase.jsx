import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import styles from "@/styles/WorksShowcase.module.scss";

export default function WorksShowcase(props) {
    let public_url = "";
    const router = useRouter();

    const [preloaded, setPreloaded] = useState(false);
    const [activeProject, setActiveProject] = useState(null);
    const [viewMode, setViewMode] = useState("staggered"); // "staggered", "carousel", "mosaic"
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    const projectsRef = useRef([]);

    const getImageSrc = useMemo(() => {
        return (p) => {
            // If the image path is already a full URL (starts with http), use it directly
            if (p.cover && p.cover.startsWith('http')) {
                return p.cover;
            }

            // Otherwise, use the local path
            if (props.data[props.theme].title === "Monks of Method") {
                return `${public_url}/images/projects/Monks of Method/${p.cover}`;
            }
            return `${public_url}/images/projects/${props.data[props.theme].title}/${p.dir}/${p.cover}`;
        };
    }, [props.data, props.theme]);

    useEffect(() => {
        if (!preloaded) {
            props.data[props.theme].projects.slice(0, 6).forEach((p) => {
                if (p.cover) {
                    const img = new window.Image();
                    img.src = getImageSrc(p);
                }
            });
            setPreloaded(true);
        }
    }, [props.data, props.theme, getImageSrc, preloaded]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Get category-specific elements
    const getCategoryColor = () => {
        const categoryTitle = props.data[props.theme].title;
        if (categoryTitle === "Material Experiments") return "#ff3333";
        if (categoryTitle === "Interiors") return "#3333ff";
        if (categoryTitle === "Furniture Design") return "#9966cc";
        if (categoryTitle === "Installation Design") return "#33cccc"; // Added color for Installation Design
        if (categoryTitle === "Computational Design") return "#33ff33";
        if (categoryTitle === "Monks of Method") return "#ffcc00";
        return "#ffffff";
    };

    const getCategoryDescription = () => {
        const categoryTitle = props.data[props.theme].title;
        const descriptions = {
            "Material Experiments": "Pushing boundaries through innovative material explorations and techniques.",
            "Interiors": "Creating functional interior spaces that enhance human experience.",
            "Furniture": "Designing innovative and functional furniture pieces.",
            "Furniture Design": "Crafting unique furniture that balances form, function, and sustainability.",
            "Installation Design": "Creating immersive spatial experiences through interactive and responsive installations.", // Added description
            "Computational Design": "Leveraging algorithms and digital tools to discover new design possibilities.",
            "Monks of Method": "Exploring the intersection of traditional craftsmanship and contemporary design methodologies."
        };

        return descriptions[categoryTitle] || `Explore our collection of ${categoryTitle} projects.`;
    };

    const projectItems = useMemo(() => {
        let projects = [...props.data[props.theme].projects];

        // For Computational Design, only show the first two projects
        if (props.data[props.theme].title === "Computational Design") {
            return projects.slice(0, 2);
        }

        // For Material Experiments, only show the first three projects
        if (props.data[props.theme].title === "Material Experiments") {
            return projects.slice(0, 3);
        }

        // For Interiors, only show the first two projects
        if (props.data[props.theme].title === "Interiors") {
            return projects;
        }

        // For Furniture, only show the first two projects
        if (props.data[props.theme].title === "Furniture") {
            return projects.slice(0, 2);
        }

        // For Furniture Design, show all projects
        if (props.data[props.theme].title === "Furniture Design") {
            return projects;
        }

        // For Installation Design, show all projects
        if (props.data[props.theme].title === "Installation Design") {
            return projects;
        }

        // For Interiors & Furniture Design, only show the first two projects
        if (props.data[props.theme].title === "Interiors & Furniture Design") {
            return projects.slice(0, 2);
        }

        // For Competitions, show all projects
        if (props.data[props.theme].title === "Competitions") {
            return projects;
        }

        // For Monks of Method, show all projects
        if (props.data[props.theme].title === "Monks of Method") {
            return projects;
        }

        // For other categories, maintain the original logic
        while (projects.length < 6) {
            projects.push(...props.data[props.theme].projects);
        }

        return projects.slice(0, 6);
    }, [props.data, props.theme]);

    const cycleViewMode = () => {
        const modes = ["staggered", "list", "mosaic"];
        const currentIndex = modes.indexOf(viewMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        setViewMode(modes[nextIndex]);
    };

    const getParallaxOffset = (index) => {
        if (!containerRef.current) return { x: 0, y: 0 };

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Reduce divisor for smoother, more subtle movement
        const offsetX = (mousePosition.x - centerX) / 100;
        const offsetY = (mousePosition.y - centerY) / 100;

        // Different offset for each item to create depth
        const depth = (index % 3 + 1) * 0.5;

        return {
            x: offsetX * depth,
            y: offsetY * depth
        };
    };

    return (
        <motion.div
            className={styles.dynamicShowcase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            ref={containerRef}
        >
            <div  className={styles.categoryHeader} style={{ borderColor: getCategoryColor() }}>
                <motion.div
                    className={styles.categoryPulse}
                    style={{ backgroundColor: getCategoryColor() }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.7, 0.9, 0.7]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse"
                    }}
                />

                <div className={styles.categoryContent}>
                    <motion.h1
                        className={styles.categoryHeading}
                        initial={{ y: -30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        {props.data[props.theme].title}
                    </motion.h1>

                    <motion.p
                        className={styles.categorySubheading}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        {getCategoryDescription()}
                    </motion.p>
                </div>

                <motion.button
                    className={styles.viewModeToggle}
                    onClick={cycleViewMode}
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.2)" }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                >
                    <span className={styles.toggleIcon}>⟳</span>
                    <span className={styles.toggleText}>Change View</span>
                </motion.button>
            </div>

            <AnimatePresence mode="wait">
                {viewMode === "staggered" && (
                    <motion.div
                        key="staggered"
                        className={styles.staggeredGrid}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        {projectItems.map((project, index) => {
                            const parallax = getParallaxOffset(index);
                            return (
                                <motion.div
                                    className={styles.staggeredItem}
                                    key={index}
                                    ref={el => projectsRef.current[index] = el}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                    }}
                                    style={{
                                        x: parallax.x,
                                        y: parallax.y
                                    }}
                                    transition={{
                                        delay: index * 0.08, // Reduced delay between items
                                        duration: 0.3, // Faster animation
                                        ease: "easeOut"
                                    }}
                                    whileHover={{
                                        scale: 1.03, // Subtle scale
                                        y: -5, // Slight lift effect
                                        boxShadow: `0 20px 40px rgba(0,0,0,0.3), 0 0 30px ${getCategoryColor()}40`,
                                        transition: { duration: 0.2, ease: "easeOut" } // Quick hover transition
                                    }}
                                >
                                    <Link href={`/works/${project.title}`} passHref>
                                        <div className={styles.staggeredContent}>
                                            {project.cover && (
                                                <div className={styles.staggeredImageWrapper}>
                                                    <Image
                                                        src={getImageSrc(project)}
                                                        alt={project.title}
                                                        fill
                                                        sizes="(max-width: 768px) 100vw, 33vw"
                                                        className={styles.staggeredImage}
                                                        priority={index < 2}
                                                    />
                                                    <motion.div
                                                        className={styles.staggeredOverlay}
                                                        style={{ backgroundColor: getCategoryColor() }}
                                                        initial={{ opacity: 0 }}
                                                        whileHover={{ opacity: 0.2 }}
                                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                                    />
                                                </div>
                                            )}
                                            <div className={styles.staggeredInfo}>
                                                <h3 className={styles.staggeredTitle}>{project.title}</h3>
                                                <div className={styles.staggeredMeta}>
                                                    <span className={styles.staggeredYear}>{project.year || "2023"}</span>
                                                    <span className={styles.staggeredDot} style={{ backgroundColor: getCategoryColor() }}></span>
                                                    <span className={styles.staggeredType}>{props.data[props.theme].title.split(' ')[0]}</span>
                                                </div>
                                            </div>
                                            <div className={styles.staggeredAction}>
                                                <span className={styles.staggeredView}>View</span>
                                                <motion.span
                                                    className={styles.staggeredArrow}
                                                    animate={{ x: [0, 5, 0] }}
                                                    transition={{
                                                        duration: 1.0, // Faster animation
                                                        repeat: Infinity,
                                                        repeatType: "loop",
                                                        ease: "easeInOut"
                                                    }}
                                                >→</motion.span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}

                {viewMode === "list" && (
                    <motion.div
                        key="list"
                        className={styles.listContainer}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        {projectItems.map((project, index) => (
                            <motion.div
                                className={styles.listItem}
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                    delay: index * 0.05, // Reduced delay
                                    duration: 0.25, // Faster animation
                                    ease: "easeOut"
                                }}
                                whileHover={{
                                    x: 5, // Subtle movement
                                    backgroundColor: `rgba(255,255,255,0.05)`,
                                    boxShadow: `0 10px 30px rgba(0,0,0,0.15), 0 0 0 1px ${getCategoryColor()}30`,
                                    transition: { duration: 0.15 } // Quick hover transition
                                }}
                            >
                                <Link href={`/works/${project.title}`} passHref>
                                    <div className={styles.listContent}>
                                        <div className={styles.listNumber}>
                                            <span>{(index + 1).toString().padStart(2, '0')}</span>
                                            <motion.div
                                                className={styles.listLine}
                                                style={{ backgroundColor: getCategoryColor() }}
                                                initial={{ width: 0 }}
                                                whileHover={{ width: '100%' }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                            />
                                        </div>

                                        {project.cover && (
                                            <div className={styles.listImageWrapper}>
                                                <Image
                                                    src={getImageSrc(project)}
                                                    alt={project.title}
                                                    fill
                                                    sizes="(max-width: 768px) 120px, 180px"
                                                    className={styles.listImage}
                                                />
                                                <motion.div
                                                    className={styles.listImageOverlay}
                                                    initial={{ opacity: 0 }}
                                                    whileHover={{ opacity: 0.3 }}
                                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                                    style={{ backgroundColor: getCategoryColor() }}
                                                />
                                            </div>
                                        )}

                                        <div className={styles.listInfo}>
                                            <h3 className={styles.listTitle}>{project.title}</h3>
                                            <p className={styles.listDescription}>
                                                {project.description || `A project exploring innovative design solutions in ${props.data[props.theme].title.toLowerCase()}.`}
                                            </p>
                                            <div className={styles.listMeta}>
                                                <span className={styles.listYear}>{project.year || "2023"}</span>
                                                <span className={styles.listDot} style={{ backgroundColor: getCategoryColor() }}></span>
                                                <span className={styles.listCategory}>{props.data[props.theme].title.split(' ')[0]}</span>
                                            </div>
                                        </div>

                                        <motion.div
                                            className={styles.listAction}
                                            whileHover={{ x: 5 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <motion.span
                                                className={styles.listArrow}
                                                animate={{ x: [0, 5, 0] }}
                                                transition={{
                                                    duration: 1.0, // Faster animation
                                                    repeat: Infinity,
                                                    repeatType: "loop",
                                                    ease: "easeInOut"
                                                }}
                                            >→</motion.span>
                                        </motion.div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {viewMode === "mosaic" && (
                    <motion.div
                        key="mosaic"
                        className={`${styles.mosaicGrid} ${styles[`mosaicGrid${Math.min(projectItems.length, 6)}`]}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        {projectItems.map((project, index) => (
                            <motion.div
                                className={`${styles.mosaicItem} ${styles[`mosaicItem${index + 1}_${Math.min(projectItems.length, 6)}`]}`}
                                key={index}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    delay: index * 0.05, // Reduced delay
                                    duration: 0.25, // Faster animation
                                    ease: "easeOut"
                                }}
                                whileHover={{
                                    scale: 1.03, // Subtle scale
                                    y: -5, // Slight lift effect
                                    transition: {
                                        type: "spring",
                                        stiffness: 500, // Stiffer spring
                                        damping: 25, // More damping for quicker settling
                                        mass: 0.5, // Lighter mass for faster movement
                                        duration: 0.2 // Faster overall
                                    }
                                }}
                            >
                                <Link href={`/works/${project.title}`} passHref>
                                    <div className={styles.mosaicContent}>
                                        {project.cover && (
                                            <div className={styles.mosaicImageWrapper}>
                                                <Image
                                                    src={getImageSrc(project)}
                                                    alt={project.title}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                    className={styles.mosaicImage}
                                                />
                                                <motion.div
                                                    className={styles.mosaicOverlay}
                                                    initial={{ opacity: 0.3 }}
                                                    whileHover={{ opacity: 0.1 }}
                                                    transition={{
                                                        duration: 0.15, // Faster transition
                                                        ease: "easeOut"
                                                    }}
                                                    style={{
                                                        background: `linear-gradient(to bottom, transparent, ${getCategoryColor()}99)`
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div className={styles.mosaicInfo}>
                                            <h3 className={styles.mosaicTitle}>{project.title}</h3>
                                            <div className={styles.mosaicMeta}>
                                                <span>{project.year || "2023"}</span>
                                                <span className={styles.mosaicDivider}>|</span>
                                                <span>{props.data[props.theme].title.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                className={styles.showcaseFooter}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
            >
                <div className={styles.footerLine} style={{ backgroundColor: getCategoryColor() }}></div>
                <p>Explore more {props.data[props.theme].title} projects</p>
            </motion.div>
        </motion.div>
    );
}
