import Image from 'next/image';
import Link from 'next/link';

import LinkedinLogo from '@/public/images/linkedin-logo.svg';

import styles from '@/styles/TeamBox.module.scss';

export default function TeamBox(props) {

    return (
        <div className={styles.team_box}>
            <Link href={props.linkedinProfileLink} target='_blank'>
                <Image 
                    className={styles.profile_image}
                    src={props.imgSrc} 
                    alt={"Profile Image: " + props.name}
                />
            </Link>
            <h2>{props.name}</h2>
            <h3>{props.designation}</h3>
            <Link href={props.linkedinProfileLink} target='_blank'>
                <Image 
                    className={styles.social_profile_image}
                    src={LinkedinLogo}
                    alt="Linkedin Logo"    
                />
            </Link>
        </div>
    )
}
