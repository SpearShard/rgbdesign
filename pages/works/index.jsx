import {
    Grid
} from '@mui/material';
import Image from 'next/image';

import TextBox from '@/components/TextBox';
import WorksShowcase from '@/components/WorksShowcase';

import projectsData from '@/public/projects.json';

import styles from '@/styles/Works.module.scss';

export default function Works() {
    return (
        <section className={styles.projects_container}>
        <WorksShowcase data={projectsData} theme={"computational_design"}/>
        <WorksShowcase data={projectsData} theme={"material_experiments"}/>
        <WorksShowcase data={projectsData} theme={"interiors"}/>
        <WorksShowcase data={projectsData} theme={"furniture_design"}/>
        <WorksShowcase data={projectsData} theme={"installation_design"}/>
        <WorksShowcase data={projectsData} theme={"competitions"}/>
        <WorksShowcase data={projectsData} theme={"Monks_of_Method"}/>

            
        </section>
    )
}
