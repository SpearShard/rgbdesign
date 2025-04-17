import Head from "next/head";

import Footer from '@/components/Footer';
import Header from '@/components/Header';

import styles from '@/styles/Layout.module.scss';

export default function Layout({children}) {
    return (
        <section className={styles.layout_section}>
            <Head>
                <title>RGB Design by Roshni Gera</title>
                <meta name='description' content=''/>
            </Head>
            <Header/>
            {children}
            <Footer/>
        </section>
    )
}