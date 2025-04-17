import { useEffect, useRef } from 'react';
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

    const containerRef = useRef(null);

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
        animate();
    }, [])

    function init() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        camera = new OrthographicCamera( w / - 2, w / 2, h / 2, h / - 2, 0.01, 1600 )
        camera.position.z = 1100;

        scene = new Scene();
        scene.background = new Color('#000');
        clock = new Clock();

        renderer = new WebGLRenderer({antialias: true});
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        containerRef.current.appendChild(renderer.domElement);

        controls = new OrbitControls( camera, renderer.domElement );
        controls.enableDamping = true;
        controls.enableZoom = false;

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

    function animate() {
        requestAnimationFrame( animate );

        controls.update();

        if ( settings.autoRotate ) {
            meshFromSDF.rotation.y += Math.PI * 0.05 * clock.getDelta();
        }

        render();
    }

    return (
        <div ref={containerRef} style={{position: 'absolute'}}></div>
    )
}
