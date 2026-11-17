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
            {/* Studio introduction — placed before Our Expertise */}
            <motion.section
                className={styles.intro}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                viewport={{ once: true, margin: "-80px" }}
            >
                <motion.p className={styles.intro_lead} variants={textVariants}>
                    RGB Design is a multidisciplinary studio where architecture, materials, systems and ideas intersect.
                </motion.p>

                <motion.p className={styles.intro_text} variants={textVariants}>
                    We work across scales from material prototypes and spatial installations to urban research and systemic strategies. Disciplines are not boundaries here, they are tools, enabling us to move fluidly between computation and craft, speculation and construction, research and making.
                </motion.p>

                <motion.p className={styles.intro_text} variants={textVariants}>
                    Experimentation is central to our process. We test. We simulate. We prototype. We refine. Each project becomes a laboratory : a space to challenge assumptions and develop novel approaches through iteration.
                </motion.p>

                <motion.p className={styles.intro_text} variants={textVariants}>
                    For us, research is not separate from practice. It is embedded in it. Materials are studied as systems. Data becomes spatial logic. Context becomes catalyst.
                </motion.p>

                <motion.p className={styles.intro_closing} variants={textVariants}>
                    We design to discover and in discovering, we build.
                </motion.p>
            </motion.section>

            {/* Our Expertise */}
            <motion.div
                className={styles.Grim}
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
            >
                <motion.div className={styles.worksBox} variants={fadeIn}>
                    <WorksBox
                        title="Material"
                        description="From products and furniture to material systems, we prototype, fabricate and test ideas, exploring matter as performance, structure and experience."
                        img_src={materialLogo}
                        style="red"
                    />
                </motion.div>
                <motion.div className={styles.worksBox} variants={fadeIn}>
                    <WorksBox
                        title="Systems"
                        description="Using computational design and research, we transform complexity into clear design logic - across product, building and urban environments."
                        img_src={computationLogo}
                        style="green"
                    />
                </motion.div>
                <motion.div className={styles.worksBox} variants={fadeIn}>
                    <WorksBox
                        title="Space"
                        description="From installations to buildings and urban interventions, we translate experimentation into spatial experiences that respond to people, place and climate."
                        img_src={intelligenceLogo}
                        style="blue"
                    />
                </motion.div>
            </motion.div>
        </motion.section>
    );
}
