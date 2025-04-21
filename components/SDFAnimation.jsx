import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {SDFGeometryGenerator} from 'three/examples/jsm/geometries/SDFGeometryGenerator';
import {
    OrthographicCamera,
    Scene,
    Clock,
    WebGLRenderer,
    Mesh,
    MeshBasicMaterial,
    MeshDepthMaterial,
    MeshNormalMaterial,
    Color
} from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';

export default function SDFAnimation(props) {
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef(null);

    // Check if mobile on client side
    useEffect(() => {
        setIsMobile(window.innerWidth <= 480);

        const handleResize = () => {
            setIsMobile(window.innerWidth <= 480);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    let renderer, stats, meshFromSDF, scene, camera, clock, controls;

    const settings = {
        res: 3,
        bounds: 1,
        autoRotate: true,
        wireframe: true,
        material: 'normal',
        vertexCount: '0'
    };

    const shader = /* glsl */`
        float dist(vec3 p) {
            p.xyz = p.xzy;
            p *= 1.2;
            vec3 z = p;
            vec3 dz=vec3(0.0);
            float power = 8.0;
            float r, theta, phi;
            float dr = 1.0;

            float t0 = 1.0;
            for(int i = 0; i < 7; ++i) {
                r = length(z);
                if(r > 2.0) continue;
                theta = atan(z.y / z.x);
                #ifdef phase_shift_on
                phi = asin(z.z / r) ;
                #else
                phi = asin(z.z / r);
                #endif

                dr = pow(r, power - 1.0) * dr * power + 1.0;

                r = pow(r, power);
                theta = theta * power;
                phi = phi * power;

                z = r * vec3(cos(theta)*cos(phi), sin(theta)*cos(phi), sin(phi)) + p;

                t0 = min(t0, r);
            }

            return 0.5 * log(r) * r / dr;
        }
    `;

    useEffect(() => {
        init();
        // animate() is now called by the renderer's animation loop

        // Clean up function
        return () => {
            if (renderer) {
                renderer.setAnimationLoop(null); // Stop the animation loop
                renderer.dispose(); // Dispose of the renderer
            }

            if (meshFromSDF) {
                if (meshFromSDF.geometry) meshFromSDF.geometry.dispose();
                if (meshFromSDF.material) meshFromSDF.material.dispose();
            }

            if (scene) {
                scene.clear(); // Clear all objects from the scene
            }
        };
    }, [])

    function init() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        camera = new OrthographicCamera( w / - 2, w / 2, h / 2, h / - 2, 0.01, 1600 )
        camera.position.z = 1100;

        scene = new Scene();
        scene.background = new Color('#000');
        clock = new Clock();

        renderer = new WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            alpha: true
        });

        // Use a lower pixel ratio during scrolling for better performance
        const pixelRatio = Math.min(window.devicePixelRatio, 2); // Cap at 2x for performance
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Enable optimizations
        renderer.setAnimationLoop(animate); // More efficient than requestAnimationFrame

        // Add the canvas to the DOM
        if (containerRef.current) {
            containerRef.current.appendChild(renderer.domElement);

            // Add hardware acceleration styles to the canvas
            const canvas = renderer.domElement;
            canvas.style.willChange = 'transform';
            canvas.style.transform = 'translateZ(0)';
            canvas.style.backfaceVisibility = 'hidden';
        }

        controls = new OrbitControls( camera, renderer.domElement );
        controls.enableDamping = true;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableRotate = true;
        controls.rotateSpeed = 0.5; // Make rotation more sensitive

        // Don't add any event listeners that might interfere with touch/mouse events

        window.addEventListener( 'resize', onWindowResize );

        compile();
    }

    function compile() {
        const generator = new SDFGeometryGenerator( renderer );
        const geometry = generator.generate( Math.pow( 2, settings.res + 2 ), shader, settings.bounds );
        geometry.computeVertexNormals();

        if ( meshFromSDF ) { // updates mesh
            meshFromSDF.geometry.dispose();
            meshFromSDF.geometry = geometry;
        } else { // inits meshFromSDF : THREE.Mesh
            meshFromSDF = new Mesh(geometry, new MeshBasicMaterial());
            scene.add(meshFromSDF);

            const scale = Math.min( window.innerWidth, window.innerHeight ) / 2 * 1.06;
            meshFromSDF.scale.set( scale, scale, scale );

            setMaterial();

            // if (window.innerWidth <= 480) {
            //     meshFromSDF.position.y += 5.5;
            // }

            // Apply GSAP animation for zoom-in and slight rotation
            gsap.from(meshFromSDF.scale, { duration: 1.5, x: 0.1, y: 0.1, z: 0.1, ease: "power2.out" });
            gsap.from(meshFromSDF.rotation, { duration: 1.5, y: Math.PI * 2, ease: "power2.out" });
        }
        settings.vertexCount = geometry.attributes.position.count;
    }

    function setMaterial() {
        meshFromSDF.material.dispose();

        if ( settings.material == 'depth' ) {
            meshFromSDF.material = new MeshDepthMaterial();
        } else if ( settings.material == 'normal' ) {
            meshFromSDF.material = new MeshNormalMaterial();
        }

        meshFromSDF.material.wireframe = settings.wireframe;
    }

    function onWindowResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        renderer.setSize( w, h );

        camera.left = w / - 2;
        camera.right = w / 2;
        camera.top = h / 2;
        camera.bottom = h / - 2;

        camera.updateProjectionMatrix();

        if (meshFromSDF) {
            const scale = Math.min(w, h) / 2 * 1.06;
            meshFromSDF.scale.set(scale, scale, scale);
        }
    }

    function render() {
        renderer.render( scene, camera );
    }

    // Track if the page is being scrolled
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef(null);

    // Add scroll detection
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolling(true);

            // Clear previous timeout
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }

            // Set a timeout to detect when scrolling stops
            scrollTimeout.current = setTimeout(() => {
                setIsScrolling(false);
            }, 100);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, []);

    function animate() {
        // No need for requestAnimationFrame as we're using setAnimationLoop

        controls.update();

        // Reduce animation complexity during scrolling
        if (settings.autoRotate && meshFromSDF) {
            // If scrolling, use a smaller rotation increment
            const rotationSpeed = isScrolling ? Math.PI * 0.01 : Math.PI * 0.05;
            meshFromSDF.rotation.y += rotationSpeed * clock.getDelta();
        }

        render();
    }

    return (
        <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            willChange: 'transform', // Hint to browser to optimize
            transform: 'translateZ(0)', // Force GPU acceleration
        }}>
            {/* Background element for the fractal */}
            <div style={{
                position: 'absolute',
                width: '80vmin',
                height: '80vmin',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(110,137,215,0.15) 0%, rgba(205,233,193,0.1) 50%, rgba(255,82,82,0.05) 100%)',
                filter: 'blur(20px)',
                opacity: 0.8,
                zIndex: 0,
                animation: 'pulse 8s ease-in-out infinite alternate',
                top: isMobile ? '-20%' : '0', // Match the fractal position
                transform: isMobile ? 'translateY(0)' : 'none',
                willChange: 'transform, opacity', // Hint to browser to optimize
                backfaceVisibility: 'hidden', // Force GPU acceleration
            }}></div>

            {/* Fractal container */}
            <div ref={containerRef} style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                touchAction: 'none', // Important for touch devices
                zIndex: 1,
                top: isMobile ? '-20%' : '0', // Position higher on mobile
                willChange: 'transform', // Hint to browser to optimize
                transform: 'translateZ(0)', // Force GPU acceleration
                backfaceVisibility: 'hidden', // Force GPU acceleration
            }}></div>
        </div>
    )
}
