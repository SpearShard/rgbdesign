import Link from "next/link";
import { Instagram, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";
import styles from "@/styles/Contact.module.scss";

export default function Contact() {
    return (
        <motion.div 
            className={styles.contactPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
        >
            <div className={styles.container}>
                <motion.h1 
                    className={styles.title}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    Let's Connect
                </motion.h1>
                
                <motion.div 
                    className={styles.contactLinks}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                >
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                    >
                        <Link href="mailto:roshni@rgbdesign.in" className={styles.contactItem}>
                            <Mail size={22} strokeWidth={1.5} />
                            <span>roshni@rgbdesign.in</span>
                        </Link>
                    </motion.div>
                    
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                    >
                        <Link href="tel:+1234567890" className={styles.contactItem}>
                            <Phone size={22} strokeWidth={1.5} />
                            <span>+1 (234) 567-890</span>
                        </Link>
                    </motion.div>
                    
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.9 }}
                    >
                        <Link href="https://www.instagram.com/rgb.designresearch" className={styles.contactItem}>
                            <Instagram size={22} strokeWidth={1.5} />
                            <span>@rgb.designresearch</span>
                        </Link>
                    </motion.div>
                </motion.div>
                
                <motion.div 
                    className={styles.logoContainer}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1.2 }}
                >
                    <img src="/images/logo_.svg" alt="RGB Design" className={styles.logo} />
                </motion.div>
            </div>
        </motion.div>
    );
}
