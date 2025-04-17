import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { Grid, Box } from "@mui/material";
import Loader from "@/components/Loader";
import Image from "next/image";
import Link from "next/link";
import IconButton from "@mui/material/IconButton";
import EastIcon from "@mui/icons-material/East";

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

    function renderProjectGrid() {
        // Only show first 4 projects in a 2x2 grid
        const displayProjects = projects.slice(0, 4);
        
        return displayProjects.map((p, idx) => {
            const originalSrc = `/images/projects/${p.img_src}`;
            const isHovered = hoveredIndex === idx;
            
            // Apply color filter on hover with animation
            const imageStyle = {
                filter: isHovered ? 
                    `grayscale(100%) sepia(100%) hue-rotate(${
                        idx % 3 === 0 ? '0deg' :  // Red
                        idx % 3 === 1 ? '180deg' : // Blue
                        '90deg'                   // Green
                    }) saturate(3)` : 
                    'none',
                transition: 'filter 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                width: '100%',
                height: 'auto',
                objectFit: 'cover',
                aspectRatio: '16/9',
                borderRadius: '8px',
            };
    
            // Overlay animation styles
            const overlayStyle = {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            };
    
            return (
                <Grid key={idx} item xs={12} sm={6} md={6} className={styles.info_container}>
                    <Link href="/works" style={{ textDecoration: 'none' }}>
                        <div 
                            data-aos="fade-up"
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            style={{ 
                                cursor: 'pointer',
                                height: '100%',
                                padding: '12px',
                                boxSizing: 'border-box',
                                transition: 'transform 0.3s ease'
                            }}
                        >
                            <div style={{ 
                                position: 'relative',
                                height: '100%',
                                overflow: 'hidden',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                borderRadius: '8px',
                            }}>
                                <Image 
                                    src={originalSrc}
                                    alt={`Project ${idx + 1}`}
                                    width={500}
                                    height={300}
                                    priority={true}
                                    loading="eager"
                                    style={imageStyle}
                                />
                                <div style={overlayStyle}>
                                    View Project
                                </div>
                            </div>
                        </div>
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
                        <SDFAnimation className={`${styles.sdf_animation} sdf_animation`} data-aos="fade-up" />
                        <div className={styles.hero_overlay}>
                            <h1 className={styles.big_title} data-aos="fade-up">
                                INNOVATION.
                            </h1>
                            <h1 className={styles.big_title} data-aos="fade-up">
                                RESEARCH.
                            </h1>
                            <h1 className={styles.big_title} data-aos="fade-up">
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

