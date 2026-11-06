import { useEffect } from 'react';
import WorksShowcase from '@/components/WorksShowcase';

import projectsData from '@/public/projects.json';
import { getPublishedProjectData } from '@/lib/publicProjects';

import styles from '@/styles/Works.module.scss';

export default function Works() {
    const [liveProjects, setLiveProjects] = useState(projectsData);

    useEffect(() => {
        let mounted = true;
        getPublishedProjectData().then((data) => {
            if (mounted && data) setLiveProjects(data);
        });
        return () => { mounted = false; };
    }, []);

    // Add useEffect to handle scrollbar visibility
    useEffect(() => {
        // Function to check if device is mobile
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Hide scrollbar immediately on mobile
            document.documentElement.style.overflow = 'auto';
            document.documentElement.style.overflowX = 'hidden';

            // Apply additional styles to prevent scrollbar flash
            const style = document.createElement('style');
            style.textContent = `
                ::-webkit-scrollbar {
                    width: 0 !important;
                    display: none !important;
                }
                body {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }
            `;
            document.head.appendChild(style);

            return () => {
                // Clean up when component unmounts
                document.head.removeChild(style);
            };
        }
    }, []);

    return (
        <section className={styles.projects_container}>
            {Object.entries(liveProjects)
                .filter(([, category]) => Array.isArray(category.projects) && category.projects.length > 0)
                .map(([theme]) => (
                    <WorksShowcase key={theme} data={liveProjects} theme={theme} />
                ))}
        </section>
    )
}
