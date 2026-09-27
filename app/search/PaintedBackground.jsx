'use client';

import { useEffect, useRef } from 'react';

const VERTEX_SHADER = `
attribute vec2 a_pos;
varying vec2 v_uv;

void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

varying vec2 v_uv;

uniform float u_time;
uniform vec2 u_res;

uniform vec3 u_light;
uniform vec3 u_mid;
uniform vec3 u_dark;


float hash(vec2 p) {
  return fract(
    sin(dot(p, vec2(127.1, 311.7))) * 43758.5453
  );
}


float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(
    mix(a, b, f.x),
    mix(c, d, f.x),
    f.y
  );
}


float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(11.7, 7.9);
    amplitude *= 0.5;
  }

  return value;
}


void main() {
  vec2 p = v_uv;

  p.x *= u_res.x / max(u_res.y, 1.0);

  float t = u_time * 0.12;


  /*
    Three large pigment fields that wander
    independently instead of sliding in one
    direction forever.
  */

  vec2 drift1 = vec2(
    sin(t * 0.42),
    cos(t * 0.31)
  ) * 0.42;

  vec2 drift2 = vec2(
    cos(t * 0.34 + 2.0),
    sin(t * 0.39 + 0.7)
  ) * 0.48;

  vec2 drift3 = vec2(
    sin(t * 0.27 + 4.0),
    cos(t * 0.36 + 1.3)
  ) * 0.52;


  /*
    Low-frequency noise creates large
    watercolor-like globs.
  */

  float blob1 = fbm(
    p * 1.15 +
    drift1
  );

  float blob2 = fbm(
    p * 1.28 +
    drift2 +
    vec2(18.0, 9.0)
  );

  float blob3 = fbm(
    p * 1.42 +
    drift3 +
    vec2(37.0, 24.0)
  );


  /*
    Give each field a broad organic shape.
  */

  blob1 = smoothstep(
    0.30,
    0.72,
    blob1
  );

  blob2 = smoothstep(
    0.32,
    0.74,
    blob2
  );

  blob3 = smoothstep(
    0.34,
    0.76,
    blob3
  );


  /*
    Blend all three fields together.

    This avoids the hard boundaries caused
    by making one blob "win" over another.
  */

  float paint =
      blob1 * 0.46
    + blob2 * 0.34
    + blob3 * 0.28;

  paint /= 1.08;


  /*
    Subtle internal pigment variation.
  */

  float texture = fbm(
    p * 3.2 +
    drift2 * 0.35 +
    vec2(7.0, 13.0)
  );

  paint +=
    (texture - 0.5) *
    0.10;

  paint = clamp(
    paint,
    0.0,
    1.0
  );


  /*
    Very wide color transitions so the
    palette fades gradually from light
    to mid to dark blue.
  */

  float midMask = smoothstep(
    0.12,
    0.76,
    paint
  );

  float darkMask = smoothstep(
    0.30,
    0.82,
    paint
  );


  vec3 color = u_light;

  color = mix(
    color,
    u_mid,
    midMask
  );

  color = mix(
    color,
    u_dark,
    darkMask * 0.82
  );


  /*
    Very subtle fine pigment variation.
  */

  float pigment = fbm(
    p * 6.0 +
    vec2(3.7, 12.4)
  );

  color +=
    (pigment - 0.5) *
    0.025;


  color = clamp(
    color,
    0.0,
    1.0
  );


  gl_FragColor = vec4(
    color,
    1.0
  );
}
`;


function hexToRgb(hex) {
    const clean = hex.replace('#', '');

    return [
        parseInt(clean.slice(0, 2), 16) / 255,
        parseInt(clean.slice(2, 4), 16) / 255,
        parseInt(clean.slice(4, 6), 16) / 255,
    ];
}


function compileShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message =
            gl.getShaderInfoLog(shader) ||
            'Unknown shader error';

        gl.deleteShader(shader);

        throw new Error(message);
    }

    return shader;
}


function createProgram(gl) {
    const vertex = compileShader(
        gl,
        gl.VERTEX_SHADER,
        VERTEX_SHADER
    );

    const fragment = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        FRAGMENT_SHADER
    );

    const program = gl.createProgram();

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);

    gl.linkProgram(program);

    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message =
            gl.getProgramInfoLog(program) ||
            'Unable to link shader program';

        gl.deleteProgram(program);

        throw new Error(message);
    }

    return program;
}


export default function PaintedBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;


        const gl =
            canvas.getContext('webgl2', {
                alpha: false,
                antialias: false,
                powerPreference: 'low-power',
            }) ||
            canvas.getContext('webgl', {
                alpha: false,
                antialias: false,
                powerPreference: 'low-power',
            });


        if (!gl) {
            console.warn(
                'WebGL is not supported in this browser.'
            );

            return;
        }


        const program = createProgram(gl);

        gl.useProgram(program);


        const buffer = gl.createBuffer();

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            buffer
        );

        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1,
                1, -1,
                -1,  1,
                1,  1,
            ]),
            gl.STATIC_DRAW
        );


        const positionLocation =
            gl.getAttribLocation(
                program,
                'a_pos'
            );

        gl.enableVertexAttribArray(
            positionLocation
        );

        gl.vertexAttribPointer(
            positionLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );


        const timeLocation =
            gl.getUniformLocation(
                program,
                'u_time'
            );

        const resolutionLocation =
            gl.getUniformLocation(
                program,
                'u_res'
            );

        const lightLocation =
            gl.getUniformLocation(
                program,
                'u_light'
            );

        const midLocation =
            gl.getUniformLocation(
                program,
                'u_mid'
            );

        const darkLocation =
            gl.getUniformLocation(
                program,
                'u_dark'
            );


        /*
          Final LikeHome colors.
        */

        const light = hexToRgb('#AEC3DF');
        const mid = hexToRgb('#829FCE');
        const dark = hexToRgb('#4F78C1');


        gl.uniform3fv(
            lightLocation,
            light
        );

        gl.uniform3fv(
            midLocation,
            mid
        );

        gl.uniform3fv(
            darkLocation,
            dark
        );


        /*
          Keep the canvas responsive.
        */

        const resize = () => {
            const rect =
                canvas.getBoundingClientRect();

            const dpr = Math.min(
                window.devicePixelRatio || 1,
                2
            );

            const width = Math.max(
                1,
                Math.round(rect.width * dpr)
            );

            const height = Math.max(
                1,
                Math.round(rect.height * dpr)
            );

            if (
                canvas.width !== width ||
                canvas.height !== height
            ) {
                canvas.width = width;
                canvas.height = height;
            }

            gl.viewport(
                0,
                0,
                width,
                height
            );

            gl.uniform2f(
                resolutionLocation,
                width,
                height
            );
        };


        const resizeObserver =
            new ResizeObserver(resize);

        resizeObserver.observe(canvas);

        resize();


        /*
          Respect reduced-motion settings.
        */

        const reducedMotion =
            window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            );


        let animationFrame = 0;
        const start = performance.now();


        const draw = now => {
            resize();

            const elapsed =
                (now - start) / 1000;

            gl.uniform1f(
                timeLocation,
                elapsed
            );

            gl.drawArrays(
                gl.TRIANGLE_STRIP,
                0,
                4
            );

            animationFrame =
                requestAnimationFrame(draw);
        };


        if (reducedMotion.matches) {
            gl.uniform1f(
                timeLocation,
                0
            );

            gl.drawArrays(
                gl.TRIANGLE_STRIP,
                0,
                4
            );
        } else {
            animationFrame =
                requestAnimationFrame(draw);
        }


        return () => {
            cancelAnimationFrame(
                animationFrame
            );

            resizeObserver.disconnect();

            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
        };
    }, []);


    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="h-full w-full"
            style={{
                display: 'block',
            }}
        />
    );
}