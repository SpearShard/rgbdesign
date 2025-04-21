import { useEffect, useState, useRef } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { Grid, Box } from "@mui/material";
import Loader from "@/components/Loader";
import Image from "next/image";
import Link from "next/link";
import IconButton from "@mui/material/IconButton";
import EastIcon from "@mui/icons-material/East";
import { motion } from "framer-motion";

import SDFAnimation from "@/components/SDFAnimation";
import styles from "@/styles/Home.module.scss";
import ProjectBox from "@/components/ProjectBox";

import project_json from "../public/projects.json";

export default function Home() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [hoverColor, setHoverColor] = useState('red'); // Default color

    useEffect(() => {
        setProjects(project_json.projects_list);

        setTimeout(() => {
            setLoading(false);
        }, 20);

        // ✅ Initialize AOS only once
        AOS.init({
            duration: 400,
            once: true,
            easing: "ease-out",
        });
    }, []);

    // Animation variants for project cards
    const projectCardVariants = {
        hidden: {
            opacity: 0,
            y: 50,
            scale: 0.9,
        },
        visible: (idx) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.6,
                delay: idx * 0.15, // Staggered delay based on index
                ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for smooth reveal
            }
        }),
        hover: {
            y: -10,
            scale: 1.02,
            transition: {
                duration: 0.3,
                ease: [0.43, 0.13, 0.23, 0.96], // Custom cubic-bezier for hover
            }
        }
    };

    // Animation variants for project content
    const projectContentVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.3 }
        },
        hover: {
            transition: { duration: 0.3 }
        }
    };

    // Animation variants for title
    const titleVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
        hover: { y: -5, transition: { duration: 0.3 } }
    };

    // Animation variants for underline
    const underlineVariants = {
        hidden: { width: '40px', opacity: 0.7 },
        visible: { width: '40px', opacity: 1, transition: { duration: 0.3 } },
        hover: { width: '100%', transition: { duration: 0.3 } }
    };

    function renderProjectGrid() {
        // Show first 6 projects in a 3x2 grid
        const displayProjects = projects.slice(0, 6);

        return displayProjects.map((p, idx) => {
            // Check if the image source is a URL or a local path
            const originalSrc = p.img_src.startsWith('http') ? p.img_src : `/images/projects/${p.img_src}`;
            const isHovered = hoveredIndex === idx;

            // Get color based on index
            const getColor = () => {
                if (idx % 3 === 0) return '#ff5252'; // Red
                if (idx % 3 === 1) return '#6E89D7'; // Blue
                return '#CDE9C1'; // Green
            };

            return (
                <Grid key={idx} item xs={12} sm={6} md={4}>
                    <Link href="/works" style={{ textDecoration: 'none' }}>
                        <motion.div
                            custom={idx}
                            initial="hidden"
                            whileInView="visible"
                            whileHover="hover"
                            variants={projectCardVariants}
                            viewport={{ once: true, margin: "-50px" }}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            style={{
                                cursor: 'pointer',
                                height: '100%',
                                padding: '12px',
                                boxSizing: 'border-box',
                            }}
                        >
                            <motion.div
                                className={styles.projectCard}
                                variants={projectContentVariants}
                                style={{
                                    position: 'relative',
                                    height: '100%',
                                    overflow: 'hidden',
                                    borderRadius: '8px',
                                    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                }}
                            >
                                <Image
                                    src={originalSrc}
                                    alt={p.title || `Project ${idx + 1}`}
                                    width={500}
                                    height={300}
                                    priority={idx < 3}
                                    loading={idx < 3 ? "eager" : "lazy"}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        objectFit: 'cover',
                                        aspectRatio: '16/9',
                                        borderRadius: '8px',
                                    }}
                                />
                                <motion.div
                                    variants={projectContentVariants}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'flex-end',
                                        alignItems: 'flex-start',
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)',
                                        color: 'white',
                                        padding: '20px',
                                    }}
                                >
                                    <motion.div
                                        variants={titleVariants}
                                        style={{
                                            fontSize: '1.2rem',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            marginBottom: '8px',
                                            position: 'relative',
                                            paddingBottom: '8px',
                                        }}
                                    >
                                        {p.title}
                                        <motion.div
                                            variants={underlineVariants}
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                height: '2px',
                                                backgroundColor: getColor(),
                                            }}
                                        />
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </Link>
                </Grid>
            );
        });
    }

    return (
        <>
            {loading ? (
                <Loader />
            ) : (
                <section className={styles.home_section}>
                    <section className={styles.hero_section}>
                        <SDFAnimation className={`${styles.sdf_animation} sdf_animation`} />
                        <div className={styles.hero_overlay}>
                            <h1 className={styles.big_title}>
                                INNOVATION.
                            </h1>
                            <h1 className={styles.big_title}>
                                RESEARCH.
                            </h1>
                            <h1 className={styles.big_title}>
                                DESIGN.
                            </h1>
                        </div>
                    </section>

                    <section className={styles.about_section}>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6} className={styles.info_container}>
                                <h3 data-aos="fade-up">RGB DESIGN</h3>
                                <h2 data-aos="fade-up">
                                    WHERE DESIGN, TECH, AND NATURE CONVERGE. INNOVATING SUSTAINABLE, STRIKING FUTURES.
                                </h2>
                                <IconButton size="large" edge="start" color="inherit" aria-label="menu">
                                    <Link href="/about" style={{ color: "#ffffff" }}>
                                        <EastIcon />
                                    </Link>
                                </IconButton>
                            </Grid>
                            <Grid item xs={12} md={6} className={`${styles.info_container} ${styles.para}`}>
                                <p data-aos="fade-up">
                                    At RGB Design, we merge Design and Technology with <br />
                                    Natural Intelligence and Computational innovation to <br />
                                    creatively tackle design challenges.
                                </p>
                                <p data-aos="fade-up">
                                    <span className="highlight_green">
                                        <b>Our mission:</b> to blend form and function, delivering sustainable,
                                        technologically forward, and visually striking design solutions.
                                    </span>
                                    We're driven to inspire change and progress, crafting designs that impact both
                                    society and the environment positively.
                                </p>
                                <p data-aos="fade-up">Welcome to the future of design!</p>
                            </Grid>
                        </Grid>
                    </section>

                    <section className={styles.work_section}>
                        <div className={styles.title_container}>
                            <h1 className={styles.title} data-aos="fade-up">
                                EXPLORE OUR WORK
                            </h1>
                        </div>

                        <Grid container spacing={3} justifyContent="center" className={styles.images}>
                            {renderProjectGrid()}
                        </Grid>
                    </section>
                </section>
            )}
        </>
    );
}

