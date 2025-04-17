import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import styles from 'styles/ProjectBox.module.scss';

export default function ProjectBox({ title, link, img_src }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className={styles.project_container} 
            onMouseEnter={() => setIsHovered(true)} 
            onMouseLeave={() => setIsHovered(false)}
        >
            <Link href={'/works#' + link}>
                <div className={styles.project_box_section}>
                    <div className={styles.background}>
                        {/* Tooltip is always present but invisible by default (CSS handles visibility) */}
                        <div className={`${styles.tooltip} ${isHovered ? styles.visible : ''}`}>
                            <h2>{title}</h2>
                            <p>Click to view more about this project.</p>
                        </div>
                        <Image 
                            src={img_src} 
                            className={styles.img}
                            width={300} // Set proper image dimensions (adjust based on your design)
                            height={200}
                            layout="intrinsic" // Optimized image layout
                            quality={80} // Reduce image quality slightly for performance
                            alt={title}
                            priority // Ensures faster loading
                        />
                    </div>
                    <div className={styles.overlay}></div>
                </div>
            </Link>
        </div>
    );
}
