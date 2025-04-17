import { Grid } from '@mui/material';

import WorksBox from '@/components/WorksBox';

import materialLogo from '@/public/images/icons/material.svg';
import computationLogo from '@/public/images/icons/computation.svg';
import intelligenceLogo from '@/public/images/icons/natural_intelligence.svg';

import styles from '@/styles/About.module.scss';

export default function About() {
    return (
        <section className={styles.works_container}>
            {/* Grid Layout */}
            <div className={styles.Grim}>
                <div className={styles.worksBox}>
                    <WorksBox
                        title="Material Experiments"
                        description="Embarking on a journey of material innovation at RGB Design! From pioneering research to hands-on experimentation, we're committed to pushing boundaries and harnessing the full potential of every material."
                        img_src={materialLogo}
                    />
                </div>
                <div className={styles.worksBox}>
                    <WorksBox
                        title="Computational Design"
                        description="Fueling design excellence with computational prowess and digital fabrication. Our workflow thrives on cutting-edge technology, leveraging computational design to optimize efficiency and drive innovation."
                        img_src={computationLogo}
                    />
                </div>
                <div className={styles.worksBox}>
                    <WorksBox
                        title="Multi-Disciplinary Design"
                        description="As multi-disciplinary designers, we thrive on exploring endless possibilities across different design fields—spaces, furniture, products, jewelry, and beyond!"
                        img_src={intelligenceLogo}
                    />
                </div>
            </div>

            {/* About Section */}
            <section className={styles.about}>
                <h1>Designing Futures</h1>
                <h2 className={styles.about_text}>
                    RGB Design stands at the forefront of innovation, where the fusion of design, technology,
                    natural systems, and computational design creates sustainable solutions to global challenges.
                </h2>
                <h2 className={styles.about_text}>
                    We blend aesthetics with functionality, developing projects that are visually compelling, 
                    environmentally responsible, and technologically advanced.
                </h2>
                <h2 className={styles.about_text}>
                    At RGB Design, we believe in the transformative power of design to inspire change, drive progress,
                    and shape a better future for our planet.
                </h2>
            </section>
        </section>
    );
}
