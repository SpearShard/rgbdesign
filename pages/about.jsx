import { Grid } from '@mui/material';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

import WorksBox from '@/components/WorksBox';

import materialLogo from '@/public/images/icons/material.svg';
import computationLogo from '@/public/images/icons/computation.svg';
import intelligenceLogo from '@/public/images/icons/natural_intelligence.svg';

import styles from '@/styles/About.module.scss';

export default function About() {
    // Using simpler animation approach to avoid compatibility issues
    const containerRef = useRef(null);

    // Animation variants with simpler easing functions
    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: "easeOut"
            }
        }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3,
                ease: "easeOut"
            }
        }
    };

    const textVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.8,
                ease: "easeOut"
            }
        }
    };

    return (
        <motion.section
            ref={containerRef}
            className={styles.works_container}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
        >
            {/* Grid Layout */}
            <motion.div
                className={styles.Grim}
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
            >
                <motion.div
                    className={styles.worksBox}
                    variants={fadeIn}
                    transition={{ duration: 0.5 }}
                >
                    <WorksBox
                        title="Material Experiments"
                        description="Embarking on a journey of material innovation at RGB Design! From pioneering research to hands-on experimentation, we're committed to pushing boundaries and harnessing the full potential of every material."
                        img_src={materialLogo}
                        style="red"
                    />
                </motion.div>
                <motion.div
                    className={styles.worksBox}
                    variants={fadeIn}
                    transition={{ duration: 0.5 }}
                >
                    <WorksBox
                        title="Computational Design"
                        description="Fueling design excellence with computational prowess and digital fabrication. Our workflow thrives on cutting-edge technology, leveraging computational design to optimize efficiency and drive innovation."
                        img_src={computationLogo}
                        style="green"
                    />
                </motion.div>
                <motion.div
                    className={styles.worksBox}
                    variants={fadeIn}
                    transition={{ duration: 0.5 }}
                >
                    <WorksBox
                        title="Multi-Disciplinary Design"
                        description="As multi-disciplinary designers, we thrive on exploring endless possibilities across different design fields—spaces, furniture, products, jewelry, and beyond!"
                        img_src={intelligenceLogo}
                        style="blue"
                    />
                </motion.div>
            </motion.div>

            {/* About Section */}
            <motion.section
                className={styles.about}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.8,
                    ease: "easeOut"
                }}
                viewport={{ once: true, margin: "-100px" }}
            >
                <motion.h1
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    Designing Futures
                </motion.h1>

                <div>
                    <motion.h2
                        className={styles.about_text}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                        viewport={{ once: true }}
                    >
                        RGB Design stands at the forefront of innovation, where the fusion of design, technology,
                        natural systems, and computational design creates sustainable solutions to global challenges.
                    </motion.h2>
                    <motion.h2
                        className={styles.about_text}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                        viewport={{ once: true }}
                    >
                        We blend aesthetics with functionality, developing projects that are visually compelling,
                        environmentally responsible, and technologically advanced.
                    </motion.h2>
                    <motion.h2
                        className={styles.about_text}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                        viewport={{ once: true }}
                    >
                        At RGB Design, we believe in the transformative power of design to inspire change, drive progress,
                        and shape a better future for our planet.
                    </motion.h2>
                </div>
            </motion.section>
        </motion.section>
    );
}
