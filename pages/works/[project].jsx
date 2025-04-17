import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { Grid, Button, IconButton, Chip } from "@mui/material";
import Image from "next/image";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Head from "next/head";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import LaunchIcon from '@mui/icons-material/Launch';

import projectsData from "public/projects.json";
import styles from "styles/WorksDetails.module.scss";

export default function WorksDetails() {
    const router = useRouter();
    const { project } = useRouter().query;
    const [projectDetails, setProjectDetails] = useState(undefined);
    const [relatedProjects, setRelatedProjects] = useState([]);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [nextProject, setNextProject] = useState(null);
    const [prevProject, setPrevProject] = useState(null);

    const headerRef = useRef(null);
    const { scrollYProgress } = useScroll();
    const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
    const y = useTransform(scrollYProgress, [0, 0.2], [0, -50]);

    useEffect(() => {
        if (project) {
            let currentTheme = "";
            let currentIndex = -1;
            let themeProjects = [];

            // Find current project and its theme
            for (const [theme, data] of Object.entries(projectsData)) {
                if (theme === "projects_list") continue;

                const projectIndex = data.projects.findIndex(p => p.title === project);
                if (projectIndex !== -1) {
                    setProjectDetails({
                        project: data.projects[projectIndex],
                        theme: data.title
                    });
                    currentTheme = theme;
                    currentIndex = projectIndex;
                    themeProjects = data.projects;
                }
            }

            // Set next and previous projects
            if (currentIndex !== -1 && themeProjects.length > 0) {
                setPrevProject(currentIndex > 0 ?
                    { ...themeProjects[currentIndex - 1], theme: currentTheme } : null);

                setNextProject(currentIndex < themeProjects.length - 1 ?
                    { ...themeProjects[currentIndex + 1], theme: currentTheme } : null);

                // Find related projects (different theme or not adjacent)
                const related = [];
                for (const [theme, data] of Object.entries(projectsData)) {
                    if (theme === "projects_list" || theme === currentTheme) continue;

                    // Get up to 2 random projects from other themes
                    const randomProjects = data.projects
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 2)
                        .map(p => ({ ...p, theme: data.title }));

                    related.push(...randomProjects);
                }

                setRelatedProjects(related.slice(0, 3));
            }
        }
    }, [project]);

    function openLightbox(index) {
        setLightboxIndex(index);
        setLightboxOpen(true);
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        setLightboxOpen(false);
        document.body.style.overflow = 'auto';
    }

    function navigateLightbox(direction) {
        if (!projectDetails) return;

        const { project } = projectDetails;
        const newIndex = lightboxIndex + direction;

        if (newIndex >= 0 && newIndex < project.images.length) {
            setLightboxIndex(newIndex);
        }
    }

    function renderProject() {
        if (!projectDetails) return null;

        let { project, theme } = projectDetails;

        return (
            <>
                <Head>
                    <title>{project.title} | RGB Design</title>
                    <meta name="description" content={project.description?.[0] || project.subtitle} />
                </Head>

                {/* Hero Section */}
                <motion.div
                    className={styles.heroSection}
                    ref={headerRef}
                    style={{ opacity, scale, y }}
                >
                    <div className={styles.heroBackground}>
                                {project.cover ? (
                                    <Image
                                        src={isUrl(project.cover) ? project.cover : `/images/projects/${theme}/${project.dir ? project.dir + '/' : ''}${project.cover}`}
                                        alt={project.title}
                                        fill
                                        priority
                                        className={styles.heroBackgroundImage}
                                    />
                                ) : project.images?.length > 0 ? (
                                    <Image
                                        src={isUrl(project.images[0]) ? project.images[0] : `/images/projects/${theme}/${project.dir ? project.dir + '/' : ''}${project.images[0]}`}
                                        alt={project.title}
                                        fill
                                        priority
                                        className={styles.heroBackgroundImage}
                                    />
                                ) : null}
                        <div className={styles.heroOverlay}></div>
                    </div>

                    <div className={styles.heroContent}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={styles.projectCategory}
                        >
                            {theme}
                        </motion.div>

                        <motion.h1
                            className={styles.projectTitle}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            {project.title}
                        </motion.h1>

                        {project.subtitle && (
                            <motion.h2
                                className={styles.projectSubtitle}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                {project.subtitle}
                            </motion.h2>
                        )}

                        <motion.div
                            className={styles.projectMeta}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {project.year && <span className={styles.metaItem}>Year: {project.year}</span>}
                            {project.client && <span className={styles.metaItem}>Client: {project.client}</span>}
                            {project.location && <span className={styles.metaItem}>Location: {project.location}</span>}
                        </motion.div>

                        <motion.div
                            className={styles.scrollIndicator}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                        >
                            <div className={styles.scrollLine}></div>
                            <span>Scroll to explore</span>
                        </motion.div>
                    </div>
                </motion.div>

                <div className={styles.contentWrapper}>
                    {/* Main Content */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={styles.description_container}
                    >
                        {/* Project Tags */}
                        {project.tags && (
                            <motion.div
                                className={styles.tagsContainer}
                                variants={containerVariant}
                            >
                                {project.tags.map((tag, idx) => (
                                    <motion.div key={idx} variants={itemVariant}>
                                        <Chip
                                            label={tag}
                                            className={styles.tagChip}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}

                        {/* Project Description */}
                        <div className={styles.descriptionSection}>
                            {project.description.map((d, idx) => (
                                <motion.p
                                    key={idx}
                                    variants={fadeUpVariant}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={styles.description}
                                >
                                    {d}
                                </motion.p>
                            ))}
                        </div>

                        {/* Project Stats */}
                        {project.stats && (
                            <motion.div
                                className={styles.statsContainer}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                            >
                                {Object.entries(project.stats).map(([key, value], idx) => (
                                    <div key={idx} className={styles.statItem}>
                                        <div className={styles.statValue}>{value}</div>
                                        <div className={styles.statLabel}>{key}</div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* Project Video */}
                        {project.video && (
                            <motion.div
                                className={styles.videoSection}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                            >
                                <h3 className={styles.videoTitle}>Project Video</h3>
                                <div className={styles.videoWrapper}>
                                    {project.video.includes('youtube.com') || project.video.includes('youtu.be') ? (
                                        // For YouTube videos
                                        <iframe
                                            className={styles.projectVideo}
                                            src={project.video}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            frameBorder="0"
                                        />
                                    ) : project.video.includes('drive.google.com') ? (
                                        // For Google Drive videos
                                        <iframe
                                            className={styles.projectVideo}
                                            src={project.video}
                                            allow="autoplay"
                                            allowFullScreen
                                            frameBorder="0"
                                        />
                                    ) : (
                                        // For direct video files
                                        <video
                                            controls
                                            className={styles.projectVideo}
                                            src={isUrl(project.video) ? project.video : `/images/projects/${theme}/${project.dir ? project.dir + '/' : ''}${project.video}`}
                                        />
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Images Grid with Slide-Up Animation */}
                        {project.images && project.images.length > 0 && (
                            <motion.div
                                className={styles.imagesSection}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                            >
                                <Grid container spacing={3}>
                                    {project.images.map((img, idx) => (
                                        <Grid key={idx} item xs={12} md={idx % 3 === 0 ? 12 : 6} lg={idx % 3 === 0 ? 12 : 6}>
                                            <div className={styles.imageWrapper}>
                                                <SlideUpImage
                                                    src={isUrl(img) ? img : `/images/projects/${theme}/${project.dir ? project.dir + '/' : ''}${img}`}
                                                    alt={`${project.title} - Image ${idx + 1}`}
                                                    onClick={() => openLightbox(idx)}
                                                />
                                                <div className={styles.imageOverlay}>
                                                    <IconButton
                                                        className={styles.fullscreenButton}
                                                        onClick={() => openLightbox(idx)}
                                                    >
                                                        <FullscreenIcon />
                                                    </IconButton>
                                                </div>
                                            </div>
                                        </Grid>
                                    ))}
                                </Grid>
                            </motion.div>
                        )}

                        {/* Project Links */}
                        {project.links && (
                            <motion.div
                                className={styles.projectLinks}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                <h3 className={styles.linksTitle}>Project Links</h3>
                                <div className={styles.linksContainer}>
                                    {project.links.map((link, idx) => (
                                        <a
                                            key={idx}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.projectLink}
                                        >
                                            {link.title} <LaunchIcon fontSize="small" />
                                        </a>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Next/Previous Project Navigation */}
                        <div className={styles.projectNavigation}>
                            <div className={styles.navButtons}>
                                {prevProject && (
                                    <Link href={`/works/${prevProject.title}`} className={styles.prevProject}>
                                        <ArrowBackIcon />
                                        <div className={styles.navProjectInfo}>
                                            <span className={styles.navLabel}>Previous Project</span>
                                            <span className={styles.navTitle}>{prevProject.title}</span>
                                        </div>
                                    </Link>
                                )}

                                <Link href="/works" className={styles.allProjects}>
                                    <span>All Projects</span>
                                </Link>

                                {nextProject && (
                                    <Link href={`/works/${nextProject.title}`} className={styles.nextProject}>
                                        <div className={styles.navProjectInfo}>
                                            <span className={styles.navLabel}>Next Project</span>
                                            <span className={styles.navTitle}>{nextProject.title}</span>
                                        </div>
                                        <ArrowForwardIcon />
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Related Projects */}
                        {relatedProjects.length > 0 && (
                            <div className={styles.relatedProjects}>
                                <h3 className={styles.relatedTitle}>Related Projects</h3>
                                <Grid container spacing={3}>
                                    {relatedProjects.map((relatedProject, idx) => (
                                        <Grid item xs={12} md={4} key={idx}>
                                            <Link href={`/works/${relatedProject.title}`}>
                                                <motion.div
                                                    className={styles.relatedCard}
                                                    whileHover={{ y: -10 }}
                                                    initial={{ opacity: 0, y: 50 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: idx * 0.1 }}
                                                >
                                                    <div className={styles.relatedImageContainer}>
                                                        {relatedProject.cover ? (
                                                            <Image
                                                                src={isUrl(relatedProject.cover) ? relatedProject.cover : `/images/projects/${relatedProject.theme}/${relatedProject.dir ? relatedProject.dir + '/' : ''}${relatedProject.cover}`}
                                                                alt={relatedProject.title}
                                                                width={400}
                                                                height={250}
                                                                className={styles.relatedImage}
                                                            />
                                                        ) : relatedProject.images?.length > 0 ? (
                                                            <Image
                                                                src={isUrl(relatedProject.images[0]) ? relatedProject.images[0] : `/images/projects/${relatedProject.theme}/${relatedProject.dir ? relatedProject.dir + '/' : ''}${relatedProject.images[0]}`}
                                                                alt={relatedProject.title}
                                                                width={400}
                                                                height={250}
                                                                className={styles.relatedImage}
                                                            />
                                                        ) : null}
                                                        <div className={styles.relatedOverlay}></div>
                                                    </div>
                                                    <div className={styles.relatedInfo}>
                                                        <h4>{relatedProject.title}</h4>
                                                        <span>{relatedProject.theme}</span>
                                                    </div>
                                                </motion.div>
                                            </Link>
                                        </Grid>
                                    ))}
                                </Grid>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Lightbox */}
                <AnimatePresence>
                    {lightboxOpen && projectDetails && (
                        <motion.div
                            className={styles.lightbox}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className={styles.lightboxContent}>
                                <div className={styles.lightboxControls}>
                                    <IconButton
                                        className={styles.lightboxClose}
                                        onClick={closeLightbox}
                                    >
                                        <CloseIcon />
                                    </IconButton>

                                    <div className={styles.lightboxCounter}>
                                        {lightboxIndex + 1} / {projectDetails.project.images.length}
                                    </div>
                                </div>

                                <div className={styles.lightboxImageContainer}>
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={lightboxIndex}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={styles.lightboxImageWrapper}
                                        >
                                            <Image
                                                src={isUrl(projectDetails.project.images[lightboxIndex]) ?
                                                    projectDetails.project.images[lightboxIndex] :
                                                    `/images/projects/${projectDetails.theme}/${projectDetails.project.dir ? projectDetails.project.dir + '/' : ''}${projectDetails.project.images[lightboxIndex]}`}
                                                alt={`${projectDetails.project.title} - Image ${lightboxIndex + 1}`}
                                                fill
                                                className={styles.lightboxImage}
                                            />
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                <div className={styles.lightboxNavigation}>
                                    <IconButton
                                        className={styles.lightboxNavButton}
                                        onClick={() => navigateLightbox(-1)}
                                        disabled={lightboxIndex === 0}
                                    >
                                        <ArrowBackIcon />
                                    </IconButton>

                                    <IconButton
                                        className={styles.lightboxNavButton}
                                        onClick={() => navigateLightbox(1)}
                                        disabled={lightboxIndex === projectDetails.project.images.length - 1}
                                    >
                                        <ArrowForwardIcon />
                                    </IconButton>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        );
    }

    return <section className={styles.work_details_container}>{renderProject()}</section>;
}

// Framer Motion Variants for Fade-Up Effect
const fadeUpVariant = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

// Container variant for staggered animations
const containerVariant = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

// Item variant for staggered animations
const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

// Slide-Up Image Component
const SlideUpImage = ({ src, alt, onClick }) => {
    return (
        <motion.div
            className={styles.imageContainer}
            variants={slideUpVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            onClick={onClick}
        >
            <Image
                className={styles.projectImage}
                src={src}
                width={1200}
                height={800}
                alt={alt || "Project image"}
            />
        </motion.div>
    );
};

// Helper function to determine if a string is a URL
const isUrl = (str) => {
    return str && (str.startsWith('http://') || str.startsWith('https://'));
};

// Slide-Up Animation Variant
const slideUpVariant = {
    hidden: { opacity: 0, y: 100 },
    visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: "easeOut" } }
};

