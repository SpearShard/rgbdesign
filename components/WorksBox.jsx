import Image from 'next/image';
import Link from 'next/link';

import styles from '@/styles/WorksBox.module.scss';

export default function WorksBox(props) {
    let public_url = ''
    // if(process.env.NODE_ENV == 'production') {
    //     public_url = '/rgbdesign'
    // }

    let colour_style = styles.white
    let bg_style = ''
    if(props.style == 'red') {
        colour_style = styles.red
        // bg_style = styles.works_box_section_red
    } else if(props.style == 'green') {
        colour_style = styles.green
        // bg_style = styles.works_box_section_green
    } else if(props.style == 'blue') {
        colour_style = styles.blue
        // bg_style = styles.works_box_section_blue
    }

    function renderWorkBox() {
        if(props.img_src !== undefined) {
            return (
                <div className={styles.works_box_section + ' ' + bg_style}>
                    <Image 
                        className={styles.icon}
                        src={props.img_src} 
                        width={100}
                        height={100}
                        alt="work image"
                    />
                    <h2 className={colour_style}>{props.title}</h2>
                    <p>{props.description}</p>
                </div>
            )
        } else {
            return (
                <div className={styles.works_box_section}>
                    <div className={styles.circle}></div>
                </div>
            )
        }
    }

    return (
        renderWorkBox()
    )
}
