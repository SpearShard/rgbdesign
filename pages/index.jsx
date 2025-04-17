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

            // Apply color filter on hover with animation
            const imageStyle = {
                filter: isHovered ?
                    `brightness(1.1) contrast(1.1)` :
                    'none',
                transition: 'all 0.4s ease',
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
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
                background: isHovered ?
                    `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)` :
                    'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)',
                color: 'white',
                transition: 'all 0.4s ease',
                padding: '20px',
            };

            // Title style
            const titleStyle = {
                fontSize: '1.2rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
                position: 'relative',
                paddingBottom: '8px',
                transition: 'all 0.4s ease',
                transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
            };

            // Underline style
            const underlineStyle = {
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: isHovered ? '100%' : '40px',
                height: '2px',
                backgroundColor: getColor(),
                transition: 'all 0.4s ease',
            };

            // Card container style
            const cardStyle = {
                position: 'relative',
                height: '100%',
                overflow: 'hidden',
                borderRadius: '8px',
                boxShadow: isHovered ?
                    `0 15px 30px rgba(0,0,0,0.2)` :
                    '0 8px 20px rgba(0,0,0,0.15)',
                transition: 'all 0.4s ease',
                transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
            };

            return (
                <Grid key={idx} item xs={12} sm={6} md={4}>
                    <Link href="/works" style={{ textDecoration: 'none' }}>
                        <div
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            style={{
                                cursor: 'pointer',
                                height: '100%',
                                padding: '12px',
                                boxSizing: 'border-box',
                            }}
                        >
                            <div style={cardStyle}>
                                <Image
                                    src={originalSrc}
                                    alt={p.title || `Project ${idx + 1}`}
                                    width={500}
                                    height={300}
                                    priority={idx < 3}
                                    loading={idx < 3 ? "eager" : "lazy"}
                                    style={imageStyle}
                                />
                                <div style={overlayStyle}>
                                    <div style={titleStyle}>
                                        {p.title}
                                        <div style={underlineStyle}></div>
                                    </div>
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

